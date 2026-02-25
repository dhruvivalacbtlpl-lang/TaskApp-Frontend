import { useEffect, useState } from "react";
import api from "../../api"; // ✅ replaced axios
import {
  Box, Flex, Heading, Button, Badge, HStack, Text,
  Select, Spinner, IconButton, Alert, AlertIcon, AlertDescription,
  useColorModeValue, Input,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdAdd, MdEdit, MdDelete } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";

const normalizeStatus = (name = "") =>
  name.trim().toUpperCase().replace(/\s+/g, "_");

const getStatusColor = (name) => {
  switch (normalizeStatus(name)) {
    case "PENDING":     return "yellow";
    case "IN_PROGRESS": return "blue";
    case "COMPLETED":   return "green";
    default:            return "gray";
  }
};

const getStatusBorderColor = (name) => {
  switch (normalizeStatus(name)) {
    case "COMPLETED":   return "green.400";
    case "IN_PROGRESS": return "blue.400";
    case "PENDING":     return "yellow.400";
    default:            return "gray.300";
  }
};

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const { user, hasPermission, selectedProject } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  // ✅ Dark mode colors
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskRes, staffRes, statusRes] = await Promise.all([
        api.get("/tasks"),       // ✅ api
        api.get("/staff"),       // ✅ api
        api.get("/task-status"), // ✅ api
      ]);
      setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);       // ✅ safe array guard
      setStaffList(Array.isArray(staffRes.data) ? staffRes.data : []);
      setTaskStatuses(Array.isArray(statusRes.data) ? statusRes.data : []);
    } catch {
      showMsg("error", "Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) fetchData();
  }, [canRead]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProject]);

  useSocket("task:created", (newTask) => setTasks((prev) => [newTask, ...prev]));
  useSocket("task:updated", (updated) => setTasks((prev) => prev.map((t) => t._id === updated._id ? updated : t)));
  useSocket("task:deleted", ({ _id }) => setTasks((prev) => prev.filter((t) => t._id !== _id)));

  const handleStatusChange = async (taskId, newStatusId) => {
    setUpdatingId(taskId + "status");
    try {
      const task = tasks.find((t) => t._id === taskId);
      await api.put(`/tasks/${taskId}`, {
        name: task.name,
        description: task.description,
        assignee: task.assignee?._id || task.assignee,
        taskStatus: newStatusId,
        project: task.project?._id || null,
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
      const task = tasks.find((t) => t._id === taskId);
      await api.put(`/tasks/${taskId}`, {
        name: task.name,
        description: task.description,
        assignee: newAssigneeId,
        taskStatus: task.taskStatus?._id || task.taskStatus,
        project: task.project?._id || null,
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

  const filteredTasks = tasks.filter((task) => {
    const matchSearch   = task.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus   = statusFilter ? task.taskStatus?._id?.toString() === statusFilter : true;
    const matchAssignee = canFilterByAssignee && assigneeFilter ? task.assignee?._id?.toString() === assigneeFilter : true;
    const matchProject  = selectedProject ? task.project?._id?.toString() === selectedProject._id?.toString() : true;
    return matchSearch && matchStatus && matchAssignee && matchProject;
  });

  const totalPages     = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage));
  const startIndex     = (currentPage - 1) * rowsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + rowsPerPage);

  return (
    <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">

      {successMsg && <Alert status="success" borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{successMsg}</AlertDescription></Alert>}
      {errorMsg   && <Alert status="error"   borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{errorMsg}</AlertDescription></Alert>}

      <Flex justify="space-between" align="center" mb={2}>
        <Heading size="md" color={textColor}>✅ Tasks</Heading>
        {canCreate && (
          <Button leftIcon={<MdAdd size={18} />} colorScheme="blue"
            onClick={() => navigate("/admin/tasks/create")}>
            New Task
          </Button>
        )}
      </Flex>

      <Box mb={4}>
        {selectedProject ? (
          <Box p={2} bg="blue.50" borderRadius="lg" border="1px solid #bee3f8" display="inline-block">
            <Text fontSize="xs" color="blue.600" fontWeight="600">📁 Showing: {selectedProject.name}</Text>
          </Box>
        ) : (
          <Text fontSize="xs" color={subColor}>Showing all tasks — select a project from the top bar to filter</Text>
        )}
      </Box>

      <Flex gap={3} mb={4} wrap="wrap">
        {/* ✅ Chakra Input instead of raw <input> so dark mode works */}
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          width="220px"
          size="md"
          bg={inputBg}
          color={inputColor}
          borderColor={inputBorder}
        />
        <Select placeholder="Filter by Status" width="200px" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
          {taskStatuses.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </Select>
        {canFilterByAssignee && (
          <Select placeholder="Filter by Assignee" width="200px" value={assigneeFilter}
            onChange={(e) => { setAssigneeFilter(e.target.value); setCurrentPage(1); }}>
            {staffList.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        )}
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}><Spinner size="lg" color="blue.500" thickness="3px" /></Flex>
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
                {["#", "Title", "Project", "Status", "Assignee", ...(canUpdate || canDelete ? ["Actions"] : [])].map((h) => (
                  <th key={h} style={{ padding: 10, textAlign: "left", color: theadColor }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map((task, index) => (
                <tr key={task._id}
                  style={{ transition: "background 0.15s", cursor: "default" }}
                  onMouseEnter={e => e.currentTarget.style.background = rowHoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}`, color: textColor }}>{startIndex + index + 1}</td>
                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}` }}>
                    <Text fontWeight="500" fontSize="sm" color={textColor}>{task.name}</Text>
                    {task.description && <Text fontSize="xs" color={subColor} noOfLines={1}>{task.description}</Text>}
                  </td>
                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}` }}>
                    <Text fontSize="xs" color={subColor}>{task.project?.name ? `📁 ${task.project.name}` : "—"}</Text>
                  </td>
                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}` }}>
                    {canUpdate ? (
                      <Select size="xs" width="140px" value={task.taskStatus?._id || ""}
                        isDisabled={updatingId === task._id + "status"}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        borderColor={getStatusBorderColor(task.taskStatus?.name)}>
                        {taskStatuses.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </Select>
                    ) : (
                      <Badge colorScheme={getStatusColor(task.taskStatus?.name)} borderRadius="full" px={2} fontSize="xs">
                        {task.taskStatus?.name}
                      </Badge>
                    )}
                  </td>
                  <td style={{ padding: 10, borderBottom: `1px solid ${borderColor}` }}>
                    {canUpdate ? (
                      <Select size="xs" width="140px" value={task.assignee?._id || ""}
                        isDisabled={updatingId === task._id + "assignee"}
                        onChange={(e) => handleAssigneeChange(task._id, e.target.value)}>
                        {staffList.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </Select>
                    ) : (
                      <Text fontSize="sm" color={textColor}>{task.assignee?.name || "—"}</Text>
                    )}
                  </td>
                  {(canUpdate || canDelete) && (
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
              ))}
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
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
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
    </Box>
  );
}