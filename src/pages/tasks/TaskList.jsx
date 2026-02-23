import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Flex, Heading, Button, Badge, HStack, Text,
  Select, Spinner, IconButton, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdAdd, MdEdit, MdDelete } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import api from "../../api";

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const canRead = isAdmin || hasPermission("task_read");
  const canCreate = isAdmin || hasPermission("task_create");
  const canUpdate = isAdmin || hasPermission("task_update");
  const canDelete = isAdmin || hasPermission("task_delete");
  const canFilterByAssignee = isAdmin || hasPermission("task_create") || hasPermission("task_update") || hasPermission("task_delete");

  const getStatusColor = (name) => {
    switch (name) {
      case "PENDING": return "yellow";
      case "IN_PROGRESS": return "blue";
      case "COMPLETED": return "green";
      default: return "gray";
    }
  };

  const showMsg = (type, msg) => {
    if (type === "success") { setSuccessMsg(msg); setErrorMsg(""); }
    else { setErrorMsg(msg); setSuccessMsg(""); }
    setTimeout(() => { setSuccessMsg(""); setErrorMsg(""); }, 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskRes, staffRes, statusRes, projectRes] = await Promise.all([
        axios.get("/tasks"),
        axios.get("/staff"),
        axios.get("/task-status"),
        api.get("/projects"),
      ]);
      setTasks(taskRes.data || []);
      setStaffList(staffRes.data || []);
      setTaskStatuses(statusRes.data || []);
      setProjects(projectRes.data || []);
    } catch {
      showMsg("error", "Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) fetchData();
  }, [canRead]);

  useSocket("task:created", (newTask) => {
    setTasks((prev) => [newTask, ...prev]);
  });
  useSocket("task:updated", (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
  });
  useSocket("task:deleted", ({ _id }) => {
    setTasks((prev) => prev.filter((t) => t._id !== _id));
  });

  const handleStatusChange = async (taskId, newStatusId) => {
    setUpdatingId(taskId + "status");
    try {
      const task = tasks.find((t) => t._id === taskId);
      const formData = new FormData();
      formData.append("name", task.name);
      formData.append("description", task.description);
      formData.append("assignee", task.assignee?._id || task.assignee);
      formData.append("taskStatus", newStatusId);
      await axios.put(`/tasks/${taskId}`, formData, { withCredentials: true });
      showMsg("success", "Status updated successfully.");
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
      const formData = new FormData();
      formData.append("name", task.name);
      formData.append("description", task.description);
      formData.append("assignee", newAssigneeId);
      formData.append("taskStatus", task.taskStatus?._id || task.taskStatus);
      await axios.put(`/tasks/${taskId}`, formData, { withCredentials: true });
      showMsg("success", "Assignee updated successfully.");
    } catch {
      showMsg("error", "Failed to update assignee.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/tasks/${id}`, { withCredentials: true });
      showMsg("success", "Task deleted successfully.");
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
    const matchSearch = task.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? task.taskStatus?._id?.toString() === statusFilter : true;
    const matchAssignee = canFilterByAssignee && assigneeFilter ? task.assignee?._id?.toString() === assigneeFilter : true;
    const matchProject = projectFilter ? task.project?._id?.toString() === projectFilter : true;
    return matchSearch && matchStatus && matchAssignee && matchProject;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + rowsPerPage);

  return (
    <Box bg="white" p={6} borderRadius="md" boxShadow="md">

      {successMsg && (
        <Alert status="success" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}
      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* HEADER - same style as ProjectsPage */}
      <Flex justify="space-between" align="center" mb={5}>
        <Heading size="md">✅ Tasks</Heading>
        {canCreate && (
          <Button
            leftIcon={<MdAdd size={18} />}
            colorScheme="blue"
            onClick={() => navigate("/admin/tasks/create")}
          >
            New Task
          </Button>
        )}
      </Flex>

      {/* FILTERS */}
      <Flex gap={3} mb={4} wrap="wrap">
        <input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          style={styles.input}
        />
        <Select placeholder="Filter by Status" width="200px" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
          {taskStatuses.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </Select>
        {canFilterByAssignee && (
          <Select placeholder="Filter by Assignee" width="200px" value={assigneeFilter}
            onChange={(e) => { setAssigneeFilter(e.target.value); setCurrentPage(1); }}>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </Select>
        )}
        <Select placeholder="Filter by Project" width="200px" value={projectFilter}
          onChange={(e) => { setProjectFilter(e.target.value); setCurrentPage(1); }}>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </Select>
      </Flex>

      {loading ? (
        <Flex justify="center" py={12}>
          <Spinner size="lg" color="blue.500" thickness="3px" />
        </Flex>
      ) : filteredTasks.length === 0 ? (
        <Flex direction="column" align="center" py={12} color="gray.400">
          <Text fontSize="sm" fontWeight="medium">No tasks found</Text>
          <Text fontSize="xs">
            {search || statusFilter || assigneeFilter || projectFilter
              ? "Try clearing your filters"
              : "Create your first task to get started"}
          </Text>
        </Flex>
      ) : (
        <table style={styles.table}>
          <thead style={{ background: "#bee3f8" }}>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Assignee</th>
              {(canUpdate || canDelete) && (
                <th style={{ ...styles.th, textAlign: "center" }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.map((task, index) => (
              <tr key={task._id} style={{ transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#ebf8ff"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={styles.td}>{startIndex + index + 1}</td>
                <td style={styles.td}>{task.name}</td>
                <td style={styles.td}>
                  {canUpdate ? (
                    <Select size="xs" width="140px"
                      value={task.taskStatus?._id || ""}
                      isDisabled={updatingId === task._id + "status"}
                      onChange={(e) => handleStatusChange(task._id, e.target.value)}
                      borderColor={
                        task.taskStatus?.name === "COMPLETED" ? "green.400" :
                        task.taskStatus?.name === "IN_PROGRESS" ? "blue.400" : "yellow.400"
                      }>
                      {taskStatuses.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <Badge colorScheme={getStatusColor(task.taskStatus?.name)}>
                      {task.taskStatus?.name}
                    </Badge>
                  )}
                </td>
                <td style={styles.td}>
                  {canUpdate ? (
                    <Select size="xs" width="140px"
                      value={task.assignee?._id || ""}
                      isDisabled={updatingId === task._id + "assignee"}
                      onChange={(e) => handleAssigneeChange(task._id, e.target.value)}>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <Text>{task.assignee?.name || "—"}</Text>
                  )}
                </td>
                {(canUpdate || canDelete) && (
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <HStack justify="center">
                      {canUpdate && (
                        <IconButton
                          size="sm"
                          icon={<MdEdit size={16} />}
                          aria-label="Edit Task"
                          colorScheme="gray"
                          onClick={() => navigate(`/admin/tasks/edit/${task._id}`)}
                        />
                      )}
                      {canDelete && (
                        <IconButton
                          size="sm"
                          colorScheme="red"
                          icon={<MdDelete size={16} />}
                          aria-label="Delete Task"
                          onClick={() => handleDelete(task._id)}
                        />
                      )}
                    </HStack>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && filteredTasks.length > 0 && (
        <Flex mt={4} justify="space-between" align="center">
          <Text fontSize="sm">Page {currentPage} of {totalPages}</Text>
          <HStack>
            <Text fontSize="sm">Rows</Text>
            <Select size="sm" width="80px" value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </Select>
          </HStack>
          <HStack>
            <IconButton size="sm" icon={<ChevronLeftIcon />}
              isDisabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              aria-label="Previous page" />
            <IconButton size="sm" icon={<ChevronRightIcon />}
              isDisabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              aria-label="Next page" />
          </HStack>
        </Flex>
      )}
    </Box>
  );
}

const styles = {
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: 10, textAlign: "left" },
  td: { padding: 10, borderBottom: "1px solid #e5e7eb" },
  input: { padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, width: 220 },
}; 