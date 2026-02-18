// src/pages/TaskList.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Flex,
  Heading,
  Button,
  Badge,
  HStack,
  useToast,
  Text,
  Select,
  Spinner,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  const navigate = useNavigate();
  const toast = useToast();
  const { user, hasPermission } = useAuth();

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  /* ===== PERMISSIONS ===== */
  const canRead = isAdmin || hasPermission("task_read");
  const canCreate = isAdmin || hasPermission("task_create");
  const canUpdate = isAdmin || hasPermission("task_update");
  const canDelete = isAdmin || hasPermission("task_delete");
  const canFilterByAssignee =
    isAdmin ||
    hasPermission("task_create") ||
    hasPermission("task_update") ||
    hasPermission("task_delete");

  /* ================= STATUS COLOR ================= */
  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING": return "yellow";
      case "IN_PROGRESS": return "blue";
      case "COMPLETED": return "green";
      default: return "gray";
    }
  };

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    try {
      setTasks([]);
      const [taskRes, staffRes, statusRes] = await Promise.all([
        axios.get("http://localhost:5000/api/tasks"),
        axios.get("http://localhost:5000/api/staff"),
        axios.get("http://localhost:5000/api/task-status"),
      ]);
      setTasks(taskRes.data || []);
      setStaffList(staffRes.data || []);
      setTaskStatuses(statusRes.data || []);
    } catch {
      toast({ title: "Error fetching data", status: "error" });
    }
  };

  useEffect(() => {
    if (canRead) fetchData();
  }, [canRead]);

  /* ================= ✅ REAL-TIME SOCKET ================= */

  // New task → add to top instantly
  useSocket("task:created", (newTask) => {
    setTasks((prev) => [newTask, ...prev]);
  });

  // Task updated → replace in list instantly
  useSocket("task:updated", (updatedTask) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
    );
  });

  // Task deleted → remove from list instantly
  useSocket("task:deleted", ({ _id }) => {
    setTasks((prev) => prev.filter((t) => t._id !== _id));
  });

  /* ❌ NO READ PERMISSION */
  if (!canRead) {
    return (
      <Box p={6}>
        <Text fontSize="lg" color="red.500">
          ❌ You don't have permission to view this page
        </Text>
      </Box>
    );
  }

  /* ================= FILTER ================= */
  const filteredTasks = tasks.filter((task) => {
    const matchSearch = task.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? task.taskStatus?._id === statusFilter : true;
    const matchAssignee =
      canFilterByAssignee && assigneeFilter
        ? task.assignee?._id === assigneeFilter
        : true;
    return matchSearch && matchStatus && matchAssignee;
  });

  /* ================= PAGINATION ================= */
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + rowsPerPage);

  const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/tasks/${id}`);
      // ✅ No need to manually filter — socket "task:deleted" handles it
      toast({ title: "Task deleted", status: "success" });
    } catch {
      toast({ title: "Delete failed", status: "error" });
    }
  };

  return (
    <Box>
      {/* HEADER */}
      <Flex justify="space-between" mb={4} align="center">
        <Heading size="lg" color="blue.700">Tasks</Heading>
        {canCreate && (
          <Button onClick={() => navigate("/admin/tasks/create")} colorScheme="blue">
            + New Task
          </Button>
        )}
      </Flex>

      {/* FILTER BAR */}
      <Flex gap={3} mb={4} wrap="wrap">
        <input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          style={styles.input}
        />
        <Select
          placeholder="Filter by Status"
          width="200px"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          {taskStatuses.map((status) => (
            <option key={status._id} value={status._id}>{status.name}</option>
          ))}
        </Select>
        {canFilterByAssignee && (
          <Select
            placeholder="Filter by Assignee"
            width="200px"
            value={assigneeFilter}
            onChange={(e) => { setAssigneeFilter(e.target.value); setCurrentPage(1); }}
          >
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </Select>
        )}
      </Flex>

      {/* TABLE */}
      <Box bg="white" p={4} borderRadius="md">
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
              <tr key={task._id}>
                <td style={styles.td}>{startIndex + index + 1}</td>
                <td style={styles.td}>{task.name}</td>
                <td style={styles.td}>
                  <Badge colorScheme={getStatusColor(task.taskStatus?.name)}>
                    {task.taskStatus?.name}
                  </Badge>
                </td>
                <td style={styles.td}>{task.assignee?.name || "-"}</td>
                {(canUpdate || canDelete) && (
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <HStack justify="center">
                      {canUpdate && (
                        <Button size="sm" onClick={() => navigate(`/admin/tasks/edit/${task._id}`)}>
                          ✏️
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" colorScheme="red" onClick={() => handleDelete(task._id)}>
                          🗑
                        </Button>
                      )}
                    </HStack>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      {/* PAGINATION */}
      <Flex mt={4} justify="space-between" align="center">
        <Text fontSize="sm">Page {currentPage} of {totalPages}</Text>
        <HStack>
          <Text fontSize="sm">Rows</Text>
          <Select
            size="sm"
            width="80px"
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </Select>
        </HStack>
        <HStack>
          <Button size="sm" onClick={handlePrev} isDisabled={currentPage === 1}>◀</Button>
          <Button size="sm" onClick={handleNext} isDisabled={currentPage === totalPages}>▶</Button>
        </HStack>
      </Flex>
    </Box>
  );
}

const styles = {
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: 10, textAlign: "left" },
  td: { padding: 10, borderBottom: "1px solid #e5e7eb" },
  input: {
    padding: "8px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    width: 220,
  },
};
