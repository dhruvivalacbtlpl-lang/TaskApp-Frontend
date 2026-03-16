import { useEffect, useState } from "react";
import api from "../../api";
import {
  Box, Flex, Heading, Button, Badge, HStack, Text,
  Select, Spinner, IconButton, Alert, AlertIcon, AlertDescription,
  useColorModeValue, Input, Image, Modal, ModalOverlay, ModalContent,
  ModalBody, ModalCloseButton,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdAdd, MdEdit, MdDelete, MdUploadFile, MdImage } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";

// ── Use env variable instead of hardcoded tunnel URL ─────────────────────────
const API_BASE = import.meta.env.VITE_API_TARGET || "http://localhost:5000";

const resolveMediaUrl = (media) => {
  if (!media || typeof media !== "string") return null;
  if (media.startsWith("http://") || media.startsWith("https://")) return media;
  return `${API_BASE}${media}`;
};

const isVideoFile = (url) => {
  if (!url) return false;
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  return ["mp4", "webm", "ogg", "mov"].includes(ext);
};

const normalizeStatus = (name = "") =>
  name.trim().toUpperCase().replace(/\s+/g, "_");

const getStatusColor = (name) => {
  switch (normalizeStatus(name)) {
    case "PENDING":     return "yellow";
    case "IN_PROGRESS": return "brand";
    case "COMPLETED":   return "green";
    default:            return "gray";
  }
};

const getStatusBorderColor = (name) => {
  switch (normalizeStatus(name)) {
    case "COMPLETED":   return "green.400";
    case "IN_PROGRESS": return "brand.400";
    case "PENDING":     return "yellow.400";
    default:            return "gray.300";
  }
};

// ── Simple module-level cache so data persists across page navigations ────────
const cache = { tasks: null, staffList: null, taskStatuses: null, ts: 0 };
const CACHE_TTL = 60 * 1000; // 1 minute

export default function TaskList() {
  const [tasks, setTasks]               = useState(cache.tasks || []);
  const [staffList, setStaffList]       = useState(cache.staffList || []);
  const [taskStatuses, setTaskStatuses] = useState(cache.taskStatuses || []);
  const [loading, setLoading]           = useState(!cache.tasks);
  const [currentPage, setCurrentPage]   = useState(1);
  const [rowsPerPage, setRowsPerPage]   = useState(5);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [updatingId, setUpdatingId]     = useState(null);
  const [successMsg, setSuccessMsg]     = useState("");
  const [errorMsg, setErrorMsg]         = useState("");
  const [lightbox, setLightbox]         = useState(null);

  const navigate = useNavigate();
  const { user, hasPermission, selectedProject } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const cardBg      = useColorModeValue("white", "gray.800");
  const theadBg     = useColorModeValue("#bee3f8", "#2a4365");
  const theadColor  = useColorModeValue("gray.700", "white");
  const rowHoverBg  = useColorModeValue("#ebf8ff", "#2d3748");
  const borderColor = useColorModeValue("#e5e7eb", "#4a5568");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.400", "gray.400");
  const inputBg     = useColorModeValue("white", "gray.700");
  const inputBorder = useColorModeValue("#e2e8f0", "#4a5568");
  const inputColor  = useColorModeValue("gray.800", "white");

  const canRead             = isAdmin || user?.isOwner || hasPermission("task_read");
  const canCreate           = isAdmin || user?.isOwner || hasPermission("task_create");
  const canUpdate           = isAdmin || user?.isOwner || hasPermission("task_update");
  const canDelete           = isAdmin || user?.isOwner || hasPermission("task_delete");
  const canFilterByAssignee = isAdmin || hasPermission("task_create") || hasPermission("task_update") || hasPermission("task_delete");

  const showMsg = (type, msg) => {
    if (type === "success") { setSuccessMsg(msg); setErrorMsg(""); }
    else { setErrorMsg(msg); setSuccessMsg(""); }
    setTimeout(() => { setSuccessMsg(""); setErrorMsg(""); }, 3000);
  };

  const fetchData = async (force = false) => {
    // Use cache if fresh and not forced
    if (!force && cache.tasks && Date.now() - cache.ts < CACHE_TTL) {
      setTasks(cache.tasks);
      setStaffList(cache.staffList);
      setTaskStatuses(cache.taskStatuses);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [taskRes, staffRes, statusRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/staff"),
        api.get("/task-status"),
      ]);
      const t = Array.isArray(taskRes.data)   ? taskRes.data   : [];
      const s = Array.isArray(staffRes.data)  ? staffRes.data  : [];
      const st = Array.isArray(statusRes.data) ? statusRes.data : [];

      // Store in cache
      cache.tasks       = t;
      cache.staffList   = s;
      cache.taskStatuses = st;
      cache.ts          = Date.now();

      setTasks(t);
      setStaffList(s);
      setTaskStatuses(st);
    } catch {
      showMsg("error", "Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) fetchData(true); // always force refresh on mount
  }, [canRead]); // eslint-disable-line

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProject]);

  // ── Socket updates — update cache too ────────────────────────────────────
  useSocket("task:created", (newTask) => {
    setTasks(prev => {
      const updated = [newTask, ...prev];
      cache.tasks = updated;
      return updated;
    });
  });
  useSocket("task:updated", (updated) => {
    setTasks(prev => {
      const next = prev.map(t => t._id === updated._id ? updated : t);
      cache.tasks = next;
      return next;
    });
  });
  useSocket("task:deleted", ({ _id }) => {
    setTasks(prev => {
      const next = prev.filter(t => t._id !== _id);
      cache.tasks = next;
      return next;
    });
  });

  const handleStatusChange = async (taskId, newStatusId) => {
    setUpdatingId(taskId + "status");
    try {
      const task = tasks.find(t => t._id === taskId);
      const res  = await api.put(`/tasks/${taskId}`, {
        name: task.name, description: task.description,
        assignee: task.assignee?._id || task.assignee,
        taskStatus: newStatusId,
        project: task.project?._id || null,
      });
      setTasks(prev => {
        const next = prev.map(t => t._id === taskId ? res.data : t);
        cache.tasks = next;
        return next;
      });
      showMsg("success", "Status updated.");
    } catch {
      showMsg("error", "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssigneeChange = async (taskId, newAssigneeId) => {
    setUpdatingId(taskId + "assignee");
    try {
      const task = tasks.find(t => t._id === taskId);
      const res  = await api.put(`/tasks/${taskId}`, {
        name: task.name, description: task.description,
        assignee: newAssigneeId,
        taskStatus: task.taskStatus?._id || task.taskStatus,
        project: task.project?._id || null,
      });
      setTasks(prev => {
        const next = prev.map(t => t._id === taskId ? res.data : t);
        cache.tasks = next;
        return next;
      });
      showMsg("success", "Assignee updated.");
    } catch {
      showMsg("error", "Failed to update assignee.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(prev => {
        const next = prev.filter(t => t._id !== id);
        cache.tasks = next;
        return next;
      });
      showMsg("success", "Task deleted.");
    } catch {
      showMsg("error", "Failed to delete task.");
    }
  };

  if (!canRead) {
    return (
      <Box p={6}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription>You don't have permission to view this page.</AlertDescription>
        </Alert>
      </Box>
    );
  }

  const filteredTasks = tasks.filter(task => {
    const matchSearch   = task.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus   = statusFilter ? task.taskStatus?._id?.toString() === statusFilter : true;
    const matchAssignee = canFilterByAssignee && assigneeFilter ? task.assignee?._id?.toString() === assigneeFilter : true;
    const matchProject  = selectedProject ? task.project?._id?.toString() === selectedProject._id?.toString() : true;
    return matchSearch && matchStatus && matchAssignee && matchProject;
  });

  const totalPages     = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage));
  const startIndex     = (currentPage - 1) * rowsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + rowsPerPage);

  const getTaskMedia = (task) => {
    if (!task.media || task.media.length === 0) return [];
    return task.media
      .map(m => ({ url: resolveMediaUrl(m), isVideo: isVideoFile(m) }))
      .filter(item => item.url);
  };

  return (
    <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">

      {successMsg && <Alert status="success" borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{successMsg}</AlertDescription></Alert>}
      {errorMsg   && <Alert status="error"   borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{errorMsg}</AlertDescription></Alert>}

      <Flex justify="space-between" align="center" mb={2}>
        <Heading size="md" color={textColor}>✅ Tasks</Heading>
        {canCreate && (
          <HStack>
            <Button leftIcon={<MdUploadFile size={18} />} colorScheme="gray" variant="outline"
              onClick={() => navigate("/admin/tasks/bulk-upload")}>Bulk Upload</Button>
            <Button leftIcon={<MdAdd size={18} />} colorScheme="brand"
              onClick={() => navigate("/admin/tasks/create")}>New Task</Button>
          </HStack>
        )}
      </Flex>

      <Box mb={4}>
        {selectedProject ? (
          <Box p={2} bg="brand.50" borderRadius="lg" border="1px solid #bee3f8" display="inline-block">
            <Text fontSize="xs" color="brand.600" fontWeight="600">📁 Showing: {selectedProject.name}</Text>
          </Box>
        ) : (
          <Text fontSize="xs" color={subColor}>Showing all tasks — select a project from the top bar to filter</Text>
        )}
      </Box>

      <Flex gap={3} mb={4} wrap="wrap">
        <Input placeholder="Search tasks..." value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          width="220px" size="md" bg={inputBg} color={inputColor} borderColor={inputBorder} />
        <Select placeholder="Filter by Status" width="200px" value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
          {taskStatuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </Select>
        {canFilterByAssignee && (
          <Select placeholder="Filter by Assignee" width="200px" value={assigneeFilter}
            onChange={e => { setAssigneeFilter(e.target.value); setCurrentPage(1); }}>
            {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        )}
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}><Spinner size="lg" color="brand.500" thickness="3px" /></Flex>
      ) : filteredTasks.length === 0 ? (
        <Flex direction="column" align="center" py={12} color={subColor}>
          <Text fontSize="sm" fontWeight="medium">No tasks found</Text>
          <Text fontSize="xs">
            {search || statusFilter || assigneeFilter
              ? "Try clearing your filters"
              : selectedProject ? `No tasks for ${selectedProject.name}`
              : "Create your first task to get started"}
          </Text>
        </Flex>
      ) : (
        <Box overflowX="auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: theadBg }}>
                {["#","Title","Project","Due Date","Media","Status","Assignee",
                  ...(canUpdate||canDelete ? ["Actions"] : [])
                ].map(h => (
                  <th key={h} style={{ padding:10, textAlign:"left", color:theadColor }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map((task, index) => {
                const mediaItems = getTaskMedia(task);
                return (
                  <tr key={task._id}
                    onMouseEnter={e => e.currentTarget.style.background = rowHoverBg}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding:10, borderBottom:`1px solid ${borderColor}`, color:textColor }}>
                      {startIndex + index + 1}
                    </td>
                    <td style={{ padding:10, borderBottom:`1px solid ${borderColor}` }}>
                      <Text fontWeight="500" fontSize="sm" color={textColor}>{task.name}</Text>
                      {task.description && <Text fontSize="xs" color={subColor} noOfLines={1}>{task.description}</Text>}
                    </td>
                    <td style={{ padding:10, borderBottom:`1px solid ${borderColor}` }}>
                      <Text fontSize="xs" color={subColor}>
                        {task.project?.name ? `📁 ${task.project.name}` : "—"}
                      </Text>
                    </td>
                    <td style={{ padding:10, borderBottom:`1px solid ${borderColor}` }}>
                      {(() => {
                        const due = task.calculatedDeadline || task.dueDate;
                        if (!due) return <Text fontSize="xs" color={subColor}>—</Text>;
                        const dueDate = new Date(due);
                        const now = new Date();
                        const diffMs = dueDate - now;
                        const diffHrs = diffMs / (1000 * 60 * 60);
                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        const statusName = task.taskStatus?.name?.toLowerCase() || "";
                        const isCompleted = statusName.includes("complet") || statusName.includes("done") || statusName.includes("closed");
                        const isOverdue   = diffMs < 0 && !isCompleted;
                        const isDueToday  = !isCompleted && (diffDays === 0 || (diffHrs >= 0 && diffHrs < 24));
                        const isDueSoon   = !isCompleted && diffDays > 0 && diffDays <= 2;

                        let color = "green.500";
                        let bg    = "green.50";
                        let label = diffDays > 2 ? `${diffDays}d left` : "";

                        if (isCompleted)  { color = "green.500"; bg = "green.50";  label = "Done"; }
                        else if (isOverdue)   { color = "red.500";   bg = "red.50";   label = "Overdue"; }
                        else if (isDueToday)  { color = "orange.500"; bg = "orange.50"; label = "Due Today"; }
                        else if (isDueSoon)   { color = "yellow.600"; bg = "yellow.50"; label = `${diffDays}d left`; }

                        return (
                          <Box>
                            <Text fontSize="xs" fontWeight="600" color={color}>
                              {dueDate.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                            </Text>
                            {label && (
                              <Text fontSize="9px" fontWeight="700" color={color}
                                bg={bg} px={1} borderRadius="sm" display="inline-block" mt="1px">
                                {label}
                              </Text>
                            )}
                          </Box>
                        );
                      })()}
                    </td>
                    <td style={{ padding:10, borderBottom:`1px solid ${borderColor}`, textAlign:"center" }}>
                      {mediaItems.length > 0 ? (
                        <IconButton size="sm" icon={<MdImage size={16}/>} aria-label="View media"
                          colorScheme="brand" variant="ghost"
                          title={`${mediaItems.length} file${mediaItems.length !== 1 ? "s" : ""}`}
                          onClick={() => setLightbox({ items: mediaItems, index: 0 })} />
                      ) : (
                        <Text fontSize="xs" color={subColor}>—</Text>
                      )}
                    </td>
                    <td style={{ padding:10, borderBottom:`1px solid ${borderColor}` }}>
                      {canUpdate ? (
                        <Select size="xs" width="140px" value={task.taskStatus?._id || ""}
                          isDisabled={updatingId === task._id + "status"}
                          onChange={e => handleStatusChange(task._id, e.target.value)}
                          borderColor={getStatusBorderColor(task.taskStatus?.name)}>
                          {taskStatuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </Select>
                      ) : (
                        <Badge colorScheme={getStatusColor(task.taskStatus?.name)} borderRadius="full" px={2} fontSize="xs">
                          {task.taskStatus?.name}
                        </Badge>
                      )}
                    </td>
                    <td style={{ padding:10, borderBottom:`1px solid ${borderColor}` }}>
                      {canUpdate ? (
                        <Select size="xs" width="140px" value={task.assignee?._id || ""}
                          isDisabled={updatingId === task._id + "assignee"}
                          onChange={e => handleAssigneeChange(task._id, e.target.value)}>
                          {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </Select>
                      ) : (
                        <Text fontSize="sm" color={textColor}>{task.assignee?.name || "—"}</Text>
                      )}
                    </td>
                    {(canUpdate || canDelete) && (
                      <td style={{ padding:10, borderBottom:`1px solid ${borderColor}`, textAlign:"center" }}>
                        <HStack justify="center">
                          {canUpdate && (
                            <IconButton size="sm" icon={<MdEdit size={16}/>} aria-label="Edit"
                              colorScheme="gray" onClick={() => navigate(`/admin/tasks/edit/${task._id}`)} />
                          )}
                          {canDelete && (
                            <IconButton size="sm" colorScheme="red" icon={<MdDelete size={16}/>}
                              aria-label="Delete" onClick={() => handleDelete(task._id)} />
                          )}
                        </HStack>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      )}

      {!loading && filteredTasks.length > 0 && (
        <Flex mt={4} justify="space-between" align="center">
          <Text fontSize="sm" color={textColor}>Page {currentPage} of {totalPages}</Text>
          <HStack>
            <Text fontSize="sm" color={textColor}>Rows</Text>
            <Select size="sm" width="80px" value={rowsPerPage}
              onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </Select>
          </HStack>
          <HStack>
            <IconButton size="sm" icon={<ChevronLeftIcon/>} isDisabled={currentPage===1}
              onClick={() => setCurrentPage(p => p-1)} aria-label="Previous" />
            <IconButton size="sm" icon={<ChevronRightIcon/>} isDisabled={currentPage===totalPages}
              onClick={() => setCurrentPage(p => p+1)} aria-label="Next" />
          </HStack>
        </Flex>
      )}

      {lightbox && (
        <Modal isOpen size="xl" onClose={() => setLightbox(null)} isCentered>
          <ModalOverlay bg="blackAlpha.800" />
          <ModalContent bg="gray.900" borderRadius="xl">
            <ModalCloseButton color="white" />
            <ModalBody p={4}>
              {lightbox.items[lightbox.index]?.isVideo ? (
                <Box as="video" src={lightbox.items[lightbox.index].url}
                  controls autoPlay maxH="70vh" w="100%" borderRadius="md" />
              ) : (
                <Image src={lightbox.items[lightbox.index].url} alt="Task media"
                  maxH="70vh" w="100%" objectFit="contain" borderRadius="md" />
              )}
              {lightbox.items.length > 1 && (
                <Flex gap={2} mt={3} justify="center" wrap="wrap">
                  {lightbox.items.map((item, i) => (
                    <Box key={i} w="56px" h="56px" borderRadius="md" overflow="hidden"
                      border={i===lightbox.index ? "2px solid #63b3ed" : "2px solid transparent"}
                      cursor="pointer" flexShrink={0}
                      onClick={() => setLightbox(prev => ({ ...prev, index: i }))}>
                      {item.isVideo ? (
                        <Box as="video" src={item.url}
                          style={{ width:"100%", height:"100%", objectFit:"cover", pointerEvents:"none" }} />
                      ) : (
                        <Image src={item.url} alt={`thumb-${i}`} w="100%" h="100%" objectFit="cover"
                          onError={e => { e.target.style.display = "none"; }} />
                      )}
                    </Box>
                  ))}
                </Flex>
              )}
              <Text fontSize="xs" color="gray.400" textAlign="center" mt={2}>
                {lightbox.index + 1} / {lightbox.items.length}
              </Text>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}