import { useEffect, useState } from "react";
import api from "../../api";
import {
  Box, Flex, Heading, Button, Badge, HStack, Text,
  Select, Spinner, IconButton, Alert, AlertIcon, AlertDescription,
  useColorModeValue, Input, Image, Modal, ModalOverlay, ModalContent,
  ModalBody, ModalCloseButton, Avatar, Collapse,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdAdd, MdEdit, MdDelete, MdUploadFile, MdImage, MdExpandMore, MdExpandLess, MdBusiness, MdBugReport, MdTask } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";

const API_BASE = import.meta.env.VITE_API_TARGET || "http://localhost:5000";

// media can be a string (old) or object {url, mimetype, ...} (new)
const getMediaUrl = (m) => {
  if (!m) return null;
  const raw = typeof m === "string" ? m : m.url;
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `${API_BASE}${raw}`;
};

const resolveMediaUrl = (m) => getMediaUrl(m);

const isVideoFile = (m) => {
  const url = typeof m === "string" ? m : m?.url || m?.mimetype || "";
  if (!url) return false;
  if (url.includes("video/") || url.includes("video")) return true;
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

const isOverdueTask = (task) => {
  const due = task.calculatedDeadline || task.dueDate;
  if (!due) return false;
  const statusName = task.taskStatus?.name?.toLowerCase() || "";
  const isCompleted = statusName.includes("complet") || statusName.includes("done") || statusName.includes("closed");
  return !isCompleted && new Date(due) < new Date();
};

// ── module-level cache ────────────────────────────────────────────────────────
const cache = { tasks: null, staffList: null, taskStatuses: null, ts: 0 };
const CACHE_TTL = 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// DUE DATE CELL (extracted to keep table clean)
// ═══════════════════════════════════════════════════════════════════════════════
function DueDateCell({ task, subColor }) {
  const due = task.calculatedDeadline || task.dueDate;
  if (!due) return <Text fontSize="xs" color={subColor}>—</Text>;

  const dueDate  = new Date(due);
  const now      = new Date();
  const diffMs   = dueDate - now;
  const diffHrs  = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const statusName  = task.taskStatus?.name?.toLowerCase() || "";
  const isCompleted = statusName.includes("complet") || statusName.includes("done") || statusName.includes("closed");
  const overdue     = diffMs < 0 && !isCompleted;
  const isDueToday  = !isCompleted && (diffDays === 0 || (diffHrs >= 0 && diffHrs < 24));
  const isDueSoon   = !isCompleted && diffDays > 0 && diffDays <= 2;

  let color = "green.500", bg = "green.50", label = diffDays > 2 ? `${diffDays}d left` : "";
  if (isCompleted)  { color = "green.500";  bg = "green.50";  label = "Done"; }
  else if (overdue)    { color = "red.500";    bg = "red.50";   label = "Overdue"; }
  else if (isDueToday) { color = "orange.500"; bg = "orange.50"; label = "Due Today"; }
  else if (isDueSoon)  { color = "yellow.600"; bg = "yellow.50"; label = `${diffDays}d left`; }

  return (
    <Box>
      <Text fontSize="xs" fontWeight="600" color={color}>
        {dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </Text>
      {label && (
        <Text fontSize="9px" fontWeight="700" color={color}
          bg={bg} px={1} borderRadius="sm" display="inline-block" mt="1px">
          {label}
        </Text>
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED TASK TABLE  — used by all 3 roles
// ═══════════════════════════════════════════════════════════════════════════════
function TaskTable({
  tasks, staffList, taskStatuses,
  canUpdate, canDelete,
  updatingId, setUpdatingId,
  showMsg, navigate, setLightbox,
  // owner/superadmin — read-only mode (no inline edit)
  readOnly = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const theadBg     = useColorModeValue("#bee3f8", "#2a4365");
  const theadColor  = useColorModeValue("gray.700", "white");
  const rowHoverBg  = useColorModeValue("#ebf8ff", "#2d3748");
  const borderColor = useColorModeValue("#e5e7eb", "#4a5568");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.400", "gray.400");

  const totalPages     = Math.max(1, Math.ceil(tasks.length / rowsPerPage));
  const startIndex     = (currentPage - 1) * rowsPerPage;
  const paginatedTasks = tasks.slice(startIndex, startIndex + rowsPerPage);

  const handleStatusChange = async (taskId, newStatusId) => {
    if (readOnly) return;
    setUpdatingId(taskId + "status");
    try {
      const task = tasks.find(t => t._id === taskId);
      const res  = await api.put(`/tasks/${taskId}`, {
        name: task.name, description: task.description,
        assignee: task.assignee?._id || task.assignee,
        taskStatus: newStatusId,
        project: task.project?._id || null,
      });
      showMsg("success", "Status updated.", res.data);
    } catch {
      showMsg("error", "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssigneeChange = async (taskId, newAssigneeId) => {
    if (readOnly) return;
    setUpdatingId(taskId + "assignee");
    try {
      const task = tasks.find(t => t._id === taskId);
      const res  = await api.put(`/tasks/${taskId}`, {
        name: task.name, description: task.description,
        assignee: newAssigneeId,
        taskStatus: task.taskStatus?._id || task.taskStatus,
        project: task.project?._id || null,
      });
      showMsg("success", "Assignee updated.", res.data);
    } catch {
      showMsg("error", "Failed to update assignee.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (readOnly) return;
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await api.delete(`/tasks/${id}`);
      showMsg("success", "Task deleted.", null, id);
    } catch {
      showMsg("error", "Failed to delete task.");
    }
  };

  const getTaskMedia = (task) => {
    if (!task.media || task.media.length === 0) return [];
    return task.media
      .map(m => ({ url: getMediaUrl(m), isVideo: isVideoFile(m) }))
      .filter(item => item.url);
  };

  // reset page when tasks change (filter change)
  useEffect(() => { setCurrentPage(1); }, [tasks.length]);

  const showActions = !readOnly && (canUpdate || canDelete);

  return (
    <>
      <Box overflowX="auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: theadBg }}>
              {["#", "Title", "Project", "Due Date", "Media", "Status", "Assignee",
                ...(showActions ? ["Actions"] : [])
              ].map(h => (
                <th key={h} style={{ padding: 10, textAlign: "left", color: theadColor }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.map((task, index) => {
              const mediaItems = getTaskMedia(task);
              const isIssue    = task.type === "issue";
              return (
                <tr key={task._id}
                  onMouseEnter={e => e.currentTarget.style.background = rowHoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}`, color: textColor }}>
                    <HStack spacing={1}>
                      {isIssue
                        ? <MdBugReport size={13} color="#f97316" title="Issue" />
                        : <MdTask      size={13} color="#3b82f6" title="Task"  />}
                      <Text fontSize="xs">{startIndex + index + 1}</Text>
                    </HStack>
                  </td>

                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}` }}>
                    <Text fontWeight="500" fontSize="sm" color={textColor}>{task.name}</Text>
                    {task.description && <Text fontSize="xs" color={subColor} noOfLines={1}>{task.description}</Text>}
                  </td>

                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}` }}>
                    <Text fontSize="xs" color={subColor}>
                      {task.project?.name ? `📁 ${task.project.name}` : "—"}
                    </Text>
                  </td>

                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}` }}>
                    <DueDateCell task={task} subColor={subColor} />
                  </td>

                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {mediaItems.length > 0 ? (
                      <IconButton size="sm" icon={<MdImage size={16} />} aria-label="View media"
                        colorScheme="brand" variant="ghost"
                        title={`${mediaItems.length} file${mediaItems.length !== 1 ? "s" : ""}`}
                        onClick={() => setLightbox({ items: mediaItems, index: 0 })} />
                    ) : (
                      <Text fontSize="xs" color={subColor}>—</Text>
                    )}
                  </td>

                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}` }}>
                    {!readOnly && canUpdate ? (
                      <Select size="xs" width="140px" value={task.taskStatus?._id || ""}
                        isDisabled={updatingId === task._id + "status"}
                        onChange={e => handleStatusChange(task._id, e.target.value)}
                        borderColor={getStatusBorderColor(task.taskStatus?.name)}>
                        {taskStatuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </Select>
                    ) : (
                      <Badge colorScheme={getStatusColor(task.taskStatus?.name)} borderRadius="full" px={2} fontSize="xs">
                        {task.taskStatus?.name || "—"}
                      </Badge>
                    )}
                  </td>

                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}` }}>
                    {!readOnly && canUpdate ? (
                      <Select size="xs" width="140px" value={task.assignee?._id || ""}
                        isDisabled={updatingId === task._id + "assignee"}
                        onChange={e => handleAssigneeChange(task._id, e.target.value)}>
                        {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </Select>
                    ) : (
                      <HStack spacing={2}>
                        <Avatar size="xs" name={task.assignee?.name} bg="purple.400" />
                        <Text fontSize="sm" color={textColor}>{task.assignee?.name || "—"}</Text>
                      </HStack>
                    )}
                  </td>

                  {showActions && (
                    <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}`, textAlign: "center" }}>
                      <HStack justify="center">
                        {canUpdate && (
                          <IconButton size="sm" icon={<MdEdit size={16} />} aria-label="Edit"
                            colorScheme="gray" onClick={() => navigate(`/admin/tasks/edit/${task._id}`)} />
                        )}
                        {canDelete && (
                          <IconButton size="sm" colorScheme="red" icon={<MdDelete size={16} />}
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

      {tasks.length > 0 && (
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
            <IconButton size="sm" icon={<ChevronLeftIcon />} isDisabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)} aria-label="Previous" />
            <IconButton size="sm" icon={<ChevronRightIcon />} isDisabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)} aria-label="Next" />
          </HStack>
        </Flex>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPERADMIN VIEW — tasks grouped by company (collapsible)
// ═══════════════════════════════════════════════════════════════════════════════
function SuperAdminView({ setLightbox }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");
  const [openGroups,  setOpenGroups]  = useState({});

  const cardBg  = useColorModeValue("white",    "gray.800");
  const border  = useColorModeValue("gray.200", "gray.600");
  const hdrBg   = useColorModeValue("gray.50",  "gray.750");
  const hoverBg = useColorModeValue("gray.100", "gray.700");
  const subColor = useColorModeValue("gray.500", "gray.400");
  const textColor = useColorModeValue("gray.800", "white");
  const inputBg   = useColorModeValue("white",    "gray.700");
  const inputBorder = useColorModeValue("#e2e8f0", "#4a5568");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)        params.set("search",  search);
      if (companyFilter) params.set("company", companyFilter);
      if (statusFilter)  params.set("status",  statusFilter);
      params.set('_t', Date.now()); // cache buster
      const r = await api.get(`/tasks/super/all?${params.toString()}`);
      setData(r.data);

      // open all groups by default
      const initialOpen = {};
      (r.data.grouped || []).forEach(g => { initialOpen[g.company._id] = true; });
      setOpenGroups(initialOpen);
    } catch (err) {
      console.error("SuperAdmin tasks fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, companyFilter, statusFilter]); // eslint-disable-line

  const toggleGroup = (id) => setOpenGroups(p => ({ ...p, [id]: !p[id] }));

  const theadBg    = useColorModeValue("#bee3f8", "#2a4365");
  const theadColor = useColorModeValue("gray.700", "white");
  const rowHoverBg = useColorModeValue("#ebf8ff", "#2d3748");
  const borderColor = useColorModeValue("#e5e7eb", "#4a5568");

  return (
    <Box>


      {/* ── Filters ── */}
      <Flex gap={3} mb={5} wrap="wrap">
        <Input placeholder="Search tasks…" value={search}
          onChange={e => setSearch(e.target.value)}
          width="200px" size="md" bg={inputBg} borderColor={inputBorder} color={textColor} />

        <Select placeholder="All Companies" width="180px" value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}>
          {(data?.companyList || []).map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </Select>

        <Select placeholder="All Statuses" width="170px" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}>
          {(data?.statusList || []).map(s => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </Select>

      </Flex>

      {loading ? (
        <Flex justify="center" py={12}><Spinner size="lg" color="yellow.500" thickness="3px" /></Flex>
      ) : !data?.grouped?.length ? (
        <Flex direction="column" align="center" py={12} color={subColor}>
          <Text fontSize="sm" fontWeight="medium">No tasks found</Text>
          <Text fontSize="xs">Try adjusting your filters</Text>
        </Flex>
      ) : (
        data.grouped.map(group => (
          <Box key={group.company._id} border="1px solid" borderColor={border}
            borderRadius="xl" overflow="hidden" mb={4} bg={cardBg}>

            {/* company header */}
            <Flex px={5} py={3} bg={hdrBg} align="center" justify="space-between"
              cursor="pointer" onClick={() => toggleGroup(group.company._id)}
              _hover={{ bg: hoverBg }} transition="0.15s" wrap="wrap" gap={2}>
              <HStack spacing={3}>
                <Avatar size="sm"
                  name={group.company.name}
                  src={group.company.logo ? `${API_BASE}${group.company.logo}` : undefined}
                  bg="yellow.500" icon={<MdBusiness size={16} />} />
                <Box>
                  <Text fontWeight="700" fontSize="sm" color={textColor}>{group.company.name}</Text>
                  <Text fontSize="xs" color={subColor}>{group.company.email}</Text>
                </Box>
              </HStack>
              <HStack spacing={2} wrap="wrap">
                <Badge colorScheme="blue"   borderRadius="full" px={2}>{group.taskCount} tasks</Badge>
                {group.overdueCount > 0 && (
                  <Badge colorScheme="red" borderRadius="full" px={2}>{group.overdueCount} overdue</Badge>
                )}
                <IconButton icon={openGroups[group.company._id] ? <MdExpandLess /> : <MdExpandMore />}
                  variant="ghost" size="xs" aria-label="toggle"
                  onClick={e => { e.stopPropagation(); toggleGroup(group.company._id); }} />
              </HStack>
            </Flex>

            {/* task rows */}
            <Collapse in={!!openGroups[group.company._id]} animateOpacity>
              {group.tasks.length === 0 ? (
                <Flex justify="center" py={6}><Text fontSize="sm" color={subColor}>No tasks match filters</Text></Flex>
              ) : (
                <Box overflowX="auto">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: theadBg }}>
                        {["#", "Title", "Project", "Due Date", "Media", "Status", "Assignee"].map(h => (
                          <th key={h} style={{ padding: 8, textAlign: "left", color: theadColor, fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.tasks.map((task, i) => {
                        const mediaItems = (task.media || [])
                          .map(m => ({ url: getMediaUrl(m), isVideo: isVideoFile(m) }))
                          .filter(x => x.url);
                        const isIssue = task.type === "issue";
                        return (
                          <tr key={task._id}
                            onMouseEnter={e => e.currentTarget.style.background = rowHoverBg}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}`, color: textColor }}>
                              <HStack spacing={1}>
                                {isIssue
                                  ? <MdBugReport size={12} color="#f97316" />
                                  : <MdTask      size={12} color="#3b82f6" />}
                                <Text fontSize="xs">{i + 1}</Text>
                              </HStack>
                            </td>
                            <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>
                              <Text fontWeight="500" fontSize="sm" color={textColor}>{task.name}</Text>
                              {task.description && <Text fontSize="xs" color={subColor} noOfLines={1}>{task.description}</Text>}
                            </td>
                            <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>
                              <Text fontSize="xs" color={subColor}>{task.project?.name ? `📁 ${task.project.name}` : "—"}</Text>
                            </td>
                            <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>
                              <DueDateCell task={task} subColor={subColor} />
                            </td>
                            <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}`, textAlign: "center" }}>
                              {mediaItems.length > 0 ? (
                                <IconButton size="xs" icon={<MdImage size={14} />} aria-label="media"
                                  colorScheme="brand" variant="ghost"
                                  onClick={() => setLightbox({ items: mediaItems, index: 0 })} />
                              ) : <Text fontSize="xs" color={subColor}>—</Text>}
                            </td>
                            <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>
                              <Badge colorScheme={getStatusColor(task.taskStatus?.name)} borderRadius="full" px={2} fontSize="xs">
                                {task.taskStatus?.name || "—"}
                              </Badge>
                            </td>
                            <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>
                              <HStack spacing={2}>
                                <Avatar size="xs" name={task.assignee?.name} bg="purple.400" />
                                <Text fontSize="xs" color={textColor}>{task.assignee?.name || "—"}</Text>
                              </HStack>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>
              )}
            </Collapse>
          </Box>
        ))
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OWNER VIEW — all tasks in their company (editable, no type filter)
// ═══════════════════════════════════════════════════════════════════════════════
function OwnerView({ setLightbox, showMsg, navigate, updatingId, setUpdatingId }) {
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  const subColor    = useColorModeValue("gray.500", "gray.400");
  const textColor   = useColorModeValue("gray.800", "white");
  const inputBg     = useColorModeValue("white",    "gray.700");
  const inputBorder = useColorModeValue("#e2e8f0",  "#4a5568");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)         params.set("search",   search);
      if (statusFilter)   params.set("status",   statusFilter);
      if (assigneeFilter) params.set("assignee", assigneeFilter);

      params.set('_t', Date.now()); // cache buster
      const r = await api.get(`/tasks/owner/all?${params.toString()}`);
      setData(r.data);
    } catch (err) {
      console.error("Owner tasks fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, statusFilter, assigneeFilter]); // eslint-disable-line

  const handleMsg = (type, msg, updatedTask = null, deletedId = null) => {
    showMsg(type, msg, updatedTask, deletedId);
    if (type === "success") load();
  };

  return (
    <Box>


      {/* ── Filters (no type dropdown) ── */}
      <Flex gap={3} mb={5} wrap="wrap">
        <Input placeholder="Search tasks…" value={search}
          onChange={e => setSearch(e.target.value)}
          width="220px" size="md" bg={inputBg} borderColor={inputBorder} color={textColor} />

        <Select placeholder="Filter by Status" width="180px" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}>
          {(data?.statusList || []).map(s => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </Select>

        <Select placeholder="Filter by Assignee" width="180px" value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}>
          {(data?.staffList || []).map(s => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </Select>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}><Spinner size="lg" color="blue.500" thickness="3px" /></Flex>
      ) : !data?.tasks?.length ? (
        <Flex direction="column" align="center" py={12} color={subColor}>
          <Text fontSize="sm" fontWeight="medium">No tasks found</Text>
          <Text fontSize="xs">Try adjusting your filters</Text>
        </Flex>
      ) : (
        <TaskTable
          tasks={data.tasks}
          staffList={data.staffList || []}
          taskStatuses={data.statusList || []}
          canUpdate={true}
          canDelete={true}
          readOnly={false}
          updatingId={updatingId}
          setUpdatingId={setUpdatingId}
          showMsg={handleMsg}
          navigate={navigate}
          setLightbox={setLightbox}
        />
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — TaskList
// ═══════════════════════════════════════════════════════════════════════════════
export default function TaskList() {
  const [tasks,        setTasks]        = useState(cache.tasks || []);
  const [staffList,    setStaffList]    = useState(cache.staffList || []);
  const [taskStatuses, setTaskStatuses] = useState(cache.taskStatuses || []);
  const [loading,      setLoading]      = useState(!cache.tasks);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [updatingId,   setUpdatingId]   = useState(null);
  const [successMsg,   setSuccessMsg]   = useState("");
  const [errorMsg,     setErrorMsg]     = useState("");
  const [lightbox,     setLightbox]     = useState(null);

  const navigate = useNavigate();
  const { user, hasPermission, selectedProject, isSuperAdmin } = useAuth();

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";
  const isOwner = user?.isOwner === true;

  const cardBg  = useColorModeValue("white", "gray.800");
  const subColor = useColorModeValue("gray.400", "gray.400");
  const textColor = useColorModeValue("gray.800", "white");

  const canRead             = isAdmin || isOwner || isSuperAdmin || hasPermission("task_read");
  const canCreate           = isAdmin || isOwner || hasPermission("task_create");
  const canUpdate           = isAdmin || isOwner || hasPermission("task_update");
  const canDelete           = isAdmin || isOwner || hasPermission("task_delete");
  const canFilterByAssignee = isAdmin || hasPermission("task_create") || hasPermission("task_update") || hasPermission("task_delete");

  // showMsg also handles task delete/update for normal staff view
  const showMsg = (type, msg, updatedTask = null, deletedId = null) => {
    if (type === "success") { setSuccessMsg(msg); setErrorMsg(""); }
    else { setErrorMsg(msg); setSuccessMsg(""); }
    setTimeout(() => { setSuccessMsg(""); setErrorMsg(""); }, 3000);

    // update local state for normal staff view
    if (updatedTask) {
      setTasks(prev => {
        const next = prev.map(t => t._id === updatedTask._id ? updatedTask : t);
        cache.tasks = next;
        return next;
      });
    }
    if (deletedId) {
      setTasks(prev => {
        const next = prev.filter(t => t._id !== deletedId);
        cache.tasks = next;
        return next;
      });
    }
  };

  const fetchData = async (force = false) => {
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
      const t  = Array.isArray(taskRes.data)   ? taskRes.data   : [];
      const s  = Array.isArray(staffRes.data)  ? staffRes.data  : [];
      const st = Array.isArray(statusRes.data) ? statusRes.data : [];
      cache.tasks = t; cache.staffList = s; cache.taskStatuses = st; cache.ts = Date.now();
      setTasks(t); setStaffList(s); setTaskStatuses(st);
    } catch {
      showMsg("error", "Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch normal tasks for non-owner, non-superadmin
    if (canRead && !isOwner && !isSuperAdmin) {
      cache.ts = 0; // invalidate cache so fresh data is always fetched on mount
      fetchData(true);
    }
  }, [canRead]); // eslint-disable-line

  useEffect(() => { }, [selectedProject]);

  // Socket — only relevant for normal staff view
  useSocket("task:created", (newTask) => {
    if (isOwner || isSuperAdmin) return;
    setTasks(prev => { const u = [newTask, ...prev]; cache.tasks = u; return u; });
  });
  useSocket("task:updated", (updated) => {
    if (isOwner || isSuperAdmin) return;
    setTasks(prev => { const u = prev.map(t => t._id === updated._id ? updated : t); cache.tasks = u; return u; });
  });
  useSocket("task:deleted", ({ _id }) => {
    if (isOwner || isSuperAdmin) return;
    setTasks(prev => { const u = prev.filter(t => t._id !== _id); cache.tasks = u; return u; });
  });

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

  // ── SUPERADMIN VIEW ──────────────────────────────────────────────────────────
  if (isSuperAdmin) {
    return (
      <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">
        {successMsg && <Alert status="success" borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{successMsg}</AlertDescription></Alert>}
        {errorMsg   && <Alert status="error"   borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{errorMsg}</AlertDescription></Alert>}

        <Flex justify="space-between" align="center" mb={5}>
          <Box>
            <Heading size="md" color={textColor}>✅ All Tasks</Heading>
            <Text fontSize="xs" color={subColor} mt={1}>SuperAdmin — viewing tasks across all companies</Text>
          </Box>
          <Badge colorScheme="yellow" px={3} py={1} borderRadius="full" fontSize="sm">SuperAdmin View</Badge>
        </Flex>

        <SuperAdminView setLightbox={setLightbox} />

        {/* Lightbox */}
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
                  <Image src={lightbox.items[lightbox.index].url} alt="media"
                    maxH="70vh" w="100%" objectFit="contain" borderRadius="md" />
                )}
                {lightbox.items.length > 1 && (
                  <Flex gap={2} mt={3} justify="center" wrap="wrap">
                    {lightbox.items.map((item, i) => (
                      <Box key={i} w="56px" h="56px" borderRadius="md" overflow="hidden"
                        border={i === lightbox.index ? "2px solid #63b3ed" : "2px solid transparent"}
                        cursor="pointer" flexShrink={0}
                        onClick={() => setLightbox(prev => ({ ...prev, index: i }))}>
                        {item.isVideo
                          ? <Box as="video" src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                          : <Image src={item.url} alt={`t-${i}`} w="100%" h="100%" objectFit="cover" onError={e => { e.target.style.display = "none"; }} />}
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

  // ── OWNER VIEW ───────────────────────────────────────────────────────────────
  if (isOwner) {
    return (
      <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">
        {successMsg && <Alert status="success" borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{successMsg}</AlertDescription></Alert>}
        {errorMsg   && <Alert status="error"   borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{errorMsg}</AlertDescription></Alert>}

        <Flex justify="space-between" align="center" mb={5}>
          <Box>
            <Heading size="md" color={textColor}>✅ All Tasks</Heading>
            <Text fontSize="xs" color={subColor} mt={1}>Owner view — all tasks created by your team</Text>
          </Box>
          <HStack>
            {canCreate && (
              <>
                <Button leftIcon={<MdUploadFile size={18} />} colorScheme="gray" variant="outline" size="sm"
                  onClick={() => navigate("/admin/tasks/bulk-upload")}>Bulk Upload</Button>
                <Button leftIcon={<MdAdd size={18} />} colorScheme="brand" size="sm"
                  onClick={() => navigate("/admin/tasks/create")}>New Task</Button>
              </>
            )}
            {canDelete && (
              <Button leftIcon={<MdDelete size={16} />} colorScheme="red" variant="outline" size="sm"
                onClick={async () => {
                  if (!window.confirm("Delete ALL tasks in your company? This cannot be undone.")) return;
                  try {
                    await api.delete("/tasks/all");
                    showMsg("success", "All tasks deleted.");
                  } catch {
                    showMsg("error", "Failed to delete all tasks.");
                  }
                }}>
                Delete All
              </Button>
            )}
          </HStack>
        </Flex>

        <OwnerView setLightbox={setLightbox} showMsg={showMsg} navigate={navigate} updatingId={updatingId} setUpdatingId={setUpdatingId} />

        {/* Lightbox */}
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
                  <Image src={lightbox.items[lightbox.index].url} alt="media"
                    maxH="70vh" w="100%" objectFit="contain" borderRadius="md" />
                )}
                {lightbox.items.length > 1 && (
                  <Flex gap={2} mt={3} justify="center" wrap="wrap">
                    {lightbox.items.map((item, i) => (
                      <Box key={i} w="56px" h="56px" borderRadius="md" overflow="hidden"
                        border={i === lightbox.index ? "2px solid #63b3ed" : "2px solid transparent"}
                        cursor="pointer" flexShrink={0}
                        onClick={() => setLightbox(prev => ({ ...prev, index: i }))}>
                        {item.isVideo
                          ? <Box as="video" src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                          : <Image src={item.url} alt={`t-${i}`} w="100%" h="100%" objectFit="cover" onError={e => { e.target.style.display = "none"; }} />}
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

  // ── NORMAL STAFF VIEW (original behavior) ────────────────────────────────────
  const filteredTasks = tasks.filter(task => {
    const matchSearch   = task.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus   = statusFilter ? task.taskStatus?._id?.toString() === statusFilter : true;
    const matchAssignee = canFilterByAssignee && assigneeFilter ? task.assignee?._id?.toString() === assigneeFilter : true;
    const matchProject  = selectedProject ? task.project?._id?.toString() === selectedProject._id?.toString() : true;
    return matchSearch && matchStatus && matchAssignee && matchProject;
  });

  const inputBg     = useColorModeValue("white", "gray.700");
  const inputBorder = useColorModeValue("#e2e8f0", "#4a5568");
  const inputColor  = useColorModeValue("gray.800", "white");

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
          onChange={e => { setSearch(e.target.value); }}
          width="220px" size="md" bg={inputBg} color={inputColor} borderColor={inputBorder} />
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

      {loading ? (
        <Flex justify="center" py={12}><Spinner size="lg" color="brand.500" thickness="3px" /></Flex>
      ) : filteredTasks.length === 0 ? (
        <Flex direction="column" align="center" py={12} color={subColor}>
          <Text fontSize="sm" fontWeight="medium">No tasks found</Text>
          <Text fontSize="xs">
            {search || statusFilter || assigneeFilter ? "Try clearing your filters"
              : selectedProject ? `No tasks for ${selectedProject.name}`
              : "Create your first task to get started"}
          </Text>
        </Flex>
      ) : (
        <TaskTable
          tasks={filteredTasks}
          staffList={staffList}
          taskStatuses={taskStatuses}
          canUpdate={canUpdate}
          canDelete={canDelete}
          readOnly={false}
          updatingId={updatingId}
          setUpdatingId={setUpdatingId}
          showMsg={showMsg}
          navigate={navigate}
          setLightbox={setLightbox}
        />
      )}

      {/* Lightbox */}
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
                      border={i === lightbox.index ? "2px solid #63b3ed" : "2px solid transparent"}
                      cursor="pointer" flexShrink={0}
                      onClick={() => setLightbox(prev => ({ ...prev, index: i }))}>
                      {item.isVideo
                        ? <Box as="video" src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                        : <Image src={item.url} alt={`thumb-${i}`} w="100%" h="100%" objectFit="cover"
                            onError={e => { e.target.style.display = "none"; }} />}
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