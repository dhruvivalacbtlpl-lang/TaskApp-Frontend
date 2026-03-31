import { useEffect, useRef, useState, useCallback } from "react";
import api from "../../api";
import {
  Box, Flex, Heading, Button, Badge, HStack, Text,
  Select, Spinner, IconButton, Alert, AlertIcon, AlertDescription,
  useColorModeValue, Input, Image, Modal, ModalOverlay, ModalContent,
  ModalBody, ModalCloseButton, Avatar, Tooltip, VStack,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import {
  MdAdd, MdEdit, MdDelete, MdUploadFile, MdImage,
  MdViewList, MdViewKanban,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";

const API_BASE = import.meta.env.VITE_API_TARGET || "http://localhost:5000";

const resolveMediaUrl = (media) => {
  if (!media) return null;
  const raw = typeof media === "string" ? media : media?.url;
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `${API_BASE}${raw}`;
};

const isVideoFile = (m) => {
  const url = typeof m === "string" ? m : m?.url || "";
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  return ["mp4", "webm", "ogg", "mov"].includes(ext);
};

const normalizeStatus = (name = "") => name.trim().toUpperCase().replace(/\s+/g, "_");

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

// ── Column accent palettes ────────────────────────────────────────────────────
const COL_LIGHT = [
  { bg:"#ebf8ff", border:"#bee3f8", header:"#2b6cb0", dot:"#3182ce" },
  { bg:"#fffbeb", border:"#fde68a", header:"#92400e", dot:"#d97706" },
  { bg:"#f0fff4", border:"#9ae6b4", header:"#276749", dot:"#38a169" },
  { bg:"#faf5ff", border:"#d6bcfa", header:"#553c9a", dot:"#805ad5" },
  { bg:"#fff5f5", border:"#fed7d7", header:"#9b2335", dot:"#e53e3e" },
  { bg:"#e6fffa", border:"#81e6d9", header:"#234e52", dot:"#319795" },
];
const COL_DARK = [
  { bg:"#1a365d", border:"#2a4365", header:"#90cdf4", dot:"#63b3ed" },
  { bg:"#744210", border:"#975a16", header:"#fbd38d", dot:"#f6ad55" },
  { bg:"#1c4532", border:"#276749", header:"#9ae6b4", dot:"#68d391" },
  { bg:"#44337a", border:"#553c9a", header:"#d6bcfa", dot:"#b794f4" },
  { bg:"#63171b", border:"#9b2335", header:"#feb2b2", dot:"#fc8181" },
  { bg:"#1d4044", border:"#234e52", header:"#81e6d9", dot:"#4fd1c5" },
];

const PRIORITY_DOT = { low:"#48bb78", medium:"#ecc94b", high:"#ed8936", critical:"#e53e3e" };

// ═══════════════════════════════════════════════════════════════════════════════
// KANBAN BOARD
// ═══════════════════════════════════════════════════════════════════════════════
function KanbanBoard({ items, statuses, canUpdate, canDelete, onStatusChange, onDelete, navigate, type="task", setLightbox, onEdit }) {
  const [dragging,   setDragging]   = useState(null);
  const [dragOver,   setDragOver]   = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const isDark    = useColorModeValue(false, true);
  const cardBg    = useColorModeValue("white",    "gray.750");
  const cardBdr   = useColorModeValue("#e2e8f0",  "#4a5568");
  const textColor = useColorModeValue("gray.800", "white");
  const subColor  = useColorModeValue("gray.500", "gray.400");
  const colBg     = useColorModeValue("gray.50",  "gray.800");
  const PALETTES  = isDark ? COL_DARK : COL_LIGHT;

  const columns = statuses.map((s, idx) => ({
    status:  s,
    items:   items.filter(i => (i.taskStatus?._id || i.taskStatus) === s._id),
    palette: PALETTES[idx % PALETTES.length],
  }));
  const unassigned = items.filter(i => !i.taskStatus);
  const allCols = [
    ...columns,
    ...(unassigned.length > 0 ? [{
      status:  { _id: "__none__", name: "No Status" },
      items:   unassigned,
      palette: isDark
        ? { bg:"#2d3748", border:"#4a5568", header:"#a0aec0", dot:"#718096" }
        : { bg:"#f7fafc", border:"#e2e8f0", header:"#718096", dot:"#a0aec0" },
    }] : []),
  ];

  const handleDrop = async (e, targetStatusId) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging) return;
    const realTarget = targetStatusId === "__none__" ? null : targetStatusId;
    if ((dragging.statusId || null) === realTarget) return;
    const itemId = dragging.itemId;
    setUpdatingId(itemId);
    try { await onStatusChange(itemId, realTarget || ""); }
    finally { setUpdatingId(null); setDragging(null); }
  };

  return (
    <Box overflowX="auto" pb={3}>
      <Flex gap={4} align="flex-start" minW="max-content">
        {allCols.map(col => (
          <Box key={col.status._id} w="272px" minW="272px" borderRadius="xl"
            border="2px solid"
            borderColor={dragOver === col.status._id ? col.palette.dot : col.palette.border}
            bg={colBg} transition="border-color 0.15s"
            onDragOver={e => { e.preventDefault(); setDragOver(col.status._id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, col.status._id)}>

            {/* Header */}
            <Flex px={4} py={3} bg={col.palette.bg} borderTopRadius="lg"
              align="center" justify="space-between"
              borderBottom="1px solid" borderColor={col.palette.border}>
              <HStack spacing={2}>
                <Box w="10px" h="10px" borderRadius="full" bg={col.palette.dot} flexShrink={0}/>
                <Text fontWeight="700" fontSize="sm" color={col.palette.header}>{col.status.name}</Text>
              </HStack>
              <Badge bg={col.palette.border} color={col.palette.header}
                borderRadius="full" px={2} fontSize="xs" fontWeight="700">
                {col.items.length}
              </Badge>
            </Flex>

            {/* Cards */}
            <VStack spacing={3} p={3} align="stretch" minH="100px">
              {col.items.length === 0 && (
                <Flex h="64px" align="center" justify="center"
                  border="2px dashed"
                  borderColor={dragOver === col.status._id ? col.palette.dot : "transparent"}
                  borderRadius="lg" transition="border-color 0.15s">
                  <Text fontSize="xs" color={subColor}>Drop here</Text>
                </Flex>
              )}

              {col.items.map(item => {
                const mediaItems = (item.media || [])
                  .map(m => ({ url: resolveMediaUrl(m), isVideo: isVideoFile(m) }))
                  .filter(x => x.url);
                const isOverdue = item.dueDate && new Date(item.dueDate) < new Date()
                  && !["done","complete","closed"].some(k => item.taskStatus?.name?.toLowerCase().includes(k));
                const isUpdating = updatingId === item._id;

                return (
                  <Box key={item._id}
                    bg={cardBg} border="1px solid"
                    borderColor={isUpdating ? col.palette.dot : cardBdr}
                    borderRadius="lg" p={3} boxShadow="sm"
                    cursor={canUpdate ? "grab" : "default"}
                    opacity={isUpdating ? 0.55 : 1}
                    transition="all 0.15s"
                    draggable={canUpdate && !isUpdating}
                    onDragStart={() => setDragging({ itemId: item._id, statusId: col.status._id === "__none__" ? null : col.status._id })}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    _hover={{ boxShadow:"md", borderColor: col.palette.dot }}>

                    {/* Top row: badge + priority + overdue */}
                    <Flex justify="space-between" align="center" mb={2}>
                      <HStack spacing={1}>
                        {(type === "issue" || item.type === "issue")
                          ? <Badge colorScheme="red"  borderRadius="full" fontSize="9px" px={2}>bug</Badge>
                          : <Badge colorScheme="blue" borderRadius="full" fontSize="9px" px={2}>task</Badge>}
                        {item.priority && (
                          <Box w="7px" h="7px" borderRadius="full"
                            bg={PRIORITY_DOT[item.priority] || "#a0aec0"} title={item.priority}/>
                        )}
                      </HStack>
                      {isOverdue && <Badge colorScheme="red" fontSize="9px" borderRadius="full" px={2}>overdue</Badge>}
                    </Flex>

                    {/* Title */}
                    <Text fontWeight="600" fontSize="sm" color={textColor} noOfLines={2} mb={1}>
                      {item.name}
                    </Text>

                    {/* Description */}
                    {item.description && (
                      <Text fontSize="xs" color={subColor} noOfLines={2} mb={2}>{item.description}</Text>
                    )}

                    {/* Project */}
                    {item.project?.name && (
                      <Text fontSize="xs" color={subColor} mb={1} noOfLines={1}>📁 {item.project.name}</Text>
                    )}

                    {/* Due date */}
                    {item.dueDate && (
                      <Text fontSize="xs" fontWeight="600"
                        color={isOverdue ? "red.500" : "green.600"} mb={2}>
                        📅 {new Date(item.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                      </Text>
                    )}

                    {/* Footer */}
                    <Flex justify="space-between" align="center" mt={2} pt={2}
                      borderTop="1px solid" borderColor={cardBdr}>
                      <HStack spacing={1}>
                        <Avatar size="xs" name={item.assignee?.name} bg="purple.400" color="white"/>
                        <Text fontSize="xs" color={subColor} maxW="80px" noOfLines={1}>
                          {item.assignee?.name || "—"}
                        </Text>
                      </HStack>
                      <HStack spacing={0}>
                        {mediaItems.length > 0 && (
                          <Tooltip label={`${mediaItems.length} media`}>
                            <IconButton size="xs" icon={<MdImage size={13}/>}
                              colorScheme="brand" variant="ghost" aria-label="media"
                              onClick={() => setLightbox({ items: mediaItems, index: 0 })}/>
                          </Tooltip>
                        )}
                        {canUpdate && (
                          <Tooltip label="Edit">
                            <IconButton size="xs" icon={<MdEdit size={13}/>}
                              colorScheme="gray" variant="ghost" aria-label="edit"
                              onClick={() => type === "task"
                                ? navigate(`/admin/tasks/edit/${item._id}`)
                                : onEdit && onEdit(item)}/>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip label="Delete">
                            <IconButton size="xs" icon={<MdDelete size={13}/>}
                              colorScheme="red" variant="ghost" aria-label="delete"
                              onClick={() => onDelete(item._id)}/>
                          </Tooltip>
                        )}
                      </HStack>
                    </Flex>
                  </Box>
                );
              })}
            </VStack>
          </Box>
        ))}
      </Flex>
    </Box>
  );
}

// ── List / Kanban toggle ──────────────────────────────────────────────────────
function ViewToggle({ view, onChange }) {
  const activeBg  = useColorModeValue("white",       "gray.600");
  const borderClr = useColorModeValue("gray.200",    "gray.600");
  return (
    <HStack spacing={0} border="1px solid" borderColor={borderClr} borderRadius="lg" overflow="hidden">
      <Tooltip label="List view">
        <IconButton icon={<MdViewList size={18}/>} size="sm" aria-label="List"
          bg={view === "list" ? activeBg : "transparent"}
          boxShadow={view === "list" ? "sm" : "none"}
          borderRadius={0} onClick={() => onChange("list")}/>
      </Tooltip>
      <Tooltip label="Kanban view">
        <IconButton icon={<MdViewKanban size={18}/>} size="sm" aria-label="Kanban"
          bg={view === "kanban" ? activeBg : "transparent"}
          boxShadow={view === "kanban" ? "sm" : "none"}
          borderRadius={0} onClick={() => onChange("kanban")}/>
      </Tooltip>
    </HStack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function TaskList() {
  const [tasks,          setTasks]          = useState([]);
  const [staffList,      setStaffList]      = useState([]);
  const [taskStatuses,   setTaskStatuses]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [currentPage,    setCurrentPage]    = useState(1);
  const [rowsPerPage,    setRowsPerPage]    = useState(5);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [updatingId,     setUpdatingId]     = useState(null);
  const [successMsg,     setSuccessMsg]     = useState("");
  const [errorMsg,       setErrorMsg]       = useState("");
  const [lightbox,       setLightbox]       = useState(null);
  const [view,           setView]           = useState("list"); // "list" | "kanban"

  const navigate = useNavigate();
  const { user, hasPermission, selectedProject } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const cardBg      = useColorModeValue("white",    "gray.800");
  const theadBg     = useColorModeValue("#bee3f8",  "#2a4365");
  const theadColor  = useColorModeValue("gray.700", "white");
  const rowHoverBg  = useColorModeValue("#ebf8ff",  "#2d3748");
  const borderColor = useColorModeValue("#e5e7eb",  "#4a5568");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.400", "gray.400");
  const inputBg     = useColorModeValue("white",    "gray.700");
  const inputBorder = useColorModeValue("#e2e8f0",  "#4a5568");
  const inputColor  = useColorModeValue("gray.800", "white");

  const canRead             = isAdmin || hasPermission("task_read");
  const canCreate           = isAdmin || hasPermission("task_create");
  const canUpdate           = isAdmin || hasPermission("task_update");
  const canDelete           = isAdmin || hasPermission("task_delete");
  const canFilterByAssignee = isAdmin || hasPermission("task_create") || hasPermission("task_update") || hasPermission("task_delete");

  const showMsg = (type, msg) => {
    if (type === "success") { setSuccessMsg(msg); setErrorMsg(""); }
    else { setErrorMsg(msg); setSuccessMsg(""); }
    setTimeout(() => { setSuccessMsg(""); setErrorMsg(""); }, 3000);
  };

  const hasFetchedRef = useRef(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskRes, staffRes, statusRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/staff"),
        api.get("/task-status"),
      ]);
      setTasks(Array.isArray(taskRes.data)    ? taskRes.data    : []);
      setStaffList(Array.isArray(staffRes.data)   ? staffRes.data   : []);
      setTaskStatuses(Array.isArray(statusRes.data) ? statusRes.data : []);
    } catch {
      showMsg("error", "Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (hasFetchedRef.current) return;
    const isAdminLocal = user?.role?.name?.toLowerCase() === "admin";
    const canReadLocal  = isAdminLocal || hasPermission("task_read");
    if (!canReadLocal) { setLoading(false); return; }
    hasFetchedRef.current = true;
    fetchData();
  }, [user?._id]); // eslint-disable-line

  useEffect(() => { setCurrentPage(1); }, [selectedProject]);

  useSocket("task:created", (t)    => setTasks(prev => [t, ...prev]));
  useSocket("task:updated", (t)    => setTasks(prev => prev.map(x => x._id === t._id ? t : x)));
  useSocket("task:deleted", ({_id}) => setTasks(prev => prev.filter(x => x._id !== _id)));

  // ── Status change — also used by Kanban drag-drop ─────────────────────────
  const handleStatusChange = useCallback(async (taskId, newStatusId) => {
    setUpdatingId(taskId + "status");
    try {
      const task = tasks.find(t => t._id === taskId);
      const res  = await api.put(`/tasks/${taskId}`, {
        name:        task.name,
        description: task.description,
        assignee:    task.assignee?._id || task.assignee,
        taskStatus:  newStatusId,
        project:     task.project?._id || null,
      });
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
      showMsg("success", "Status updated.");
    } catch {
      showMsg("error", "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  }, [tasks]); // eslint-disable-line

  const handleAssigneeChange = async (taskId, newAssigneeId) => {
    setUpdatingId(taskId + "assignee");
    try {
      const task = tasks.find(t => t._id === taskId);
      const res  = await api.put(`/tasks/${taskId}`, {
        name:        task.name,
        description: task.description,
        assignee:    newAssigneeId,
        taskStatus:  task.taskStatus?._id || task.taskStatus,
        project:     task.project?._id || null,
      });
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
      showMsg("success", "Assignee updated.");
    } catch {
      showMsg("error", "Failed to update assignee.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t._id !== id));
      showMsg("success", "Task deleted.");
    } catch {
      showMsg("error", "Failed to delete task.");
    }
  };

  if (!canRead) return (
    <Box p={6}>
      <Alert status="error" borderRadius="md">
        <AlertIcon/><AlertDescription>You don't have permission to view this page.</AlertDescription>
      </Alert>
    </Box>
  );

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

  const getTaskMedia = (task) =>
    (task.media || [])
      .map(m => ({ url: resolveMediaUrl(m), isVideo: isVideoFile(m) }))
      .filter(item => item.url);

  return (
    <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">

      {/* Alerts */}
      {successMsg && <Alert status="success" borderRadius="md" mb={4}><AlertIcon/><AlertDescription>{successMsg}</AlertDescription></Alert>}
      {errorMsg   && <Alert status="error"   borderRadius="md" mb={4}><AlertIcon/><AlertDescription>{errorMsg}</AlertDescription></Alert>}

      {/* Header */}
      <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={3}>
        <Heading size="md" color={textColor}>✅ Tasks</Heading>
        <HStack spacing={2} flexWrap="wrap">
          <ViewToggle view={view} onChange={setView}/>
          {canCreate && (
            <>
              <Button leftIcon={<MdUploadFile size={18}/>} colorScheme="gray" variant="outline" size="sm"
                onClick={() => navigate("/admin/tasks/bulk-upload")}>Bulk Upload</Button>
              <Button leftIcon={<MdAdd size={18}/>} colorScheme="brand" size="sm"
                onClick={() => navigate("/admin/tasks/create")}>New Task</Button>
            </>
          )}
        </HStack>
      </Flex>

      {/* Project tag */}
      <Box mb={4}>
        {selectedProject ? (
          <Box p={2} bg="brand.50" borderRadius="lg" border="1px solid #bee3f8" display="inline-block">
            <Text fontSize="xs" color="brand.600" fontWeight="600">📁 Showing: {selectedProject.name}</Text>
          </Box>
        ) : (
          <Text fontSize="xs" color={subColor}>Showing all tasks — select a project from the top bar to filter</Text>
        )}
      </Box>

      {/* Filters */}
      <Flex gap={3} mb={4} wrap="wrap">
        <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)}
          width="220px" size="md" bg={inputBg} color={inputColor} borderColor={inputBorder}/>
        <Select placeholder="Filter by Status" width="200px" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}>
          {taskStatuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </Select>
        {canFilterByAssignee && (
          <Select placeholder="Filter by Assignee" width="200px" value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}>
            {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        )}
      </Flex>

      {/* Spinner */}
      {loading && <Flex justify="center" py={12}><Spinner size="lg" color="brand.500" thickness="3px"/></Flex>}

      {/* Empty */}
      {!loading && filteredTasks.length === 0 && (
        <Flex direction="column" align="center" py={12} color={subColor}>
          <Text fontSize="sm" fontWeight="medium">No tasks found</Text>
          <Text fontSize="xs">
            {search || statusFilter || assigneeFilter ? "Try clearing your filters"
              : selectedProject ? `No tasks for ${selectedProject.name}`
              : "Create your first task to get started"}
          </Text>
        </Flex>
      )}

      {/* ══ KANBAN VIEW ══ */}
      {!loading && filteredTasks.length > 0 && view === "kanban" && (
        <KanbanBoard
          items={filteredTasks}
          statuses={taskStatuses}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          navigate={navigate}
          type="task"
          setLightbox={setLightbox}
        />
      )}

      {/* ══ LIST VIEW ══ */}
      {!loading && filteredTasks.length > 0 && view === "list" && (
        <>
          <Box overflowX="auto">
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:theadBg }}>
                  {["#","Title","Project","Media","Status","Assignee",
                    ...(canUpdate||canDelete ? ["Actions"] : [])].map(h => (
                    <th key={h} style={{ padding:10, textAlign:"left", color:theadColor }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedTasks.map((task, index) => {
                  const mediaItems = getTaskMedia(task);
                  return (
                    <tr key={task._id} style={{ transition:"background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = rowHoverBg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding:10, borderBottom:`1px solid ${borderColor}`, color:textColor }}>{startIndex+index+1}</td>
                      <td style={{ padding:10, borderBottom:`1px solid ${borderColor}` }}>
                        <Text fontWeight="500" fontSize="sm" color={textColor}>{task.name}</Text>
                        {task.description && <Text fontSize="xs" color={subColor} noOfLines={1}>{task.description}</Text>}
                      </td>
                      <td style={{ padding:10, borderBottom:`1px solid ${borderColor}` }}>
                        <Text fontSize="xs" color={subColor}>{task.project?.name ? `📁 ${task.project.name}` : "—"}</Text>
                      </td>
                      <td style={{ padding:10, borderBottom:`1px solid ${borderColor}`, textAlign:"center" }}>
                        {mediaItems.length > 0 ? (
                          <IconButton size="sm" icon={<MdImage size={16}/>} aria-label="media"
                            colorScheme="brand" variant="ghost"
                            title={`${mediaItems.length} file(s)`}
                            onClick={() => setLightbox({ items: mediaItems, index: 0 })}/>
                        ) : <Text fontSize="xs" color={subColor}>—</Text>}
                      </td>
                      <td style={{ padding:10, borderBottom:`1px solid ${borderColor}` }}>
                        {canUpdate ? (
                          <Select size="xs" width="140px" value={task.taskStatus?._id || ""}
                            isDisabled={updatingId === task._id+"status"}
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
                            isDisabled={updatingId === task._id+"assignee"}
                            onChange={e => handleAssigneeChange(task._id, e.target.value)}>
                            {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                          </Select>
                        ) : (
                          <Text fontSize="sm" color={textColor}>{task.assignee?.name || "—"}</Text>
                        )}
                      </td>
                      {(canUpdate||canDelete) && (
                        <td style={{ padding:10, borderBottom:`1px solid ${borderColor}`, textAlign:"center" }}>
                          <HStack justify="center">
                            {canUpdate && <IconButton size="sm" icon={<MdEdit size={16}/>} aria-label="Edit"
                              colorScheme="gray" onClick={() => navigate(`/admin/tasks/edit/${task._id}`)}/>}
                            {canDelete && <IconButton size="sm" colorScheme="red" icon={<MdDelete size={16}/>}
                              aria-label="Delete" onClick={() => handleDelete(task._id)}/>}
                          </HStack>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>

          {/* Pagination */}
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
                onClick={() => setCurrentPage(p => p-1)} aria-label="Prev"/>
              <IconButton size="sm" icon={<ChevronRightIcon/>} isDisabled={currentPage===totalPages}
                onClick={() => setCurrentPage(p => p+1)} aria-label="Next"/>
            </HStack>
          </Flex>
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <Modal isOpen size="xl" onClose={() => setLightbox(null)} isCentered>
          <ModalOverlay bg="blackAlpha.800"/>
          <ModalContent bg="gray.900" borderRadius="xl">
            <ModalCloseButton color="white"/>
            <ModalBody p={4}>
              {lightbox.items[lightbox.index]?.isVideo
                ? <Box as="video" src={lightbox.items[lightbox.index].url} controls autoPlay maxH="70vh" w="100%" borderRadius="md"/>
                : <Image src={lightbox.items[lightbox.index].url} alt="media" maxH="70vh" w="100%" objectFit="contain" borderRadius="md"/>}
              {lightbox.items.length > 1 && (
                <Flex gap={2} mt={3} justify="center" wrap="wrap">
                  {lightbox.items.map((item, i) => (
                    <Box key={i} w="56px" h="56px" borderRadius="md" overflow="hidden"
                      border={i===lightbox.index ? "2px solid #63b3ed" : "2px solid transparent"}
                      cursor="pointer" flexShrink={0}
                      onClick={() => setLightbox(prev => ({ ...prev, index: i }))}>
                      {item.isVideo
                        ? <Box as="video" src={item.url} style={{ width:"100%", height:"100%", objectFit:"cover", pointerEvents:"none" }}/>
                        : <Image src={item.url} alt={`t-${i}`} w="100%" h="100%" objectFit="cover" onError={e => { e.target.style.display="none"; }}/>}
                    </Box>
                  ))}
                </Flex>
              )}
              <Text fontSize="xs" color="gray.400" textAlign="center" mt={2}>
                {lightbox.index+1} / {lightbox.items.length}
              </Text>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}