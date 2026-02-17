// src/pages/EditTask.jsx
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormLabel,
  Input,
  Select,
  VStack,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function EditTask() {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  // redirect if no write permission
  if (!isAdmin && !hasPermission("task_write")) {
    return <Navigate to="/admin/tasks" />;
  }

  const { id } = useParams();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [staff, setStaff] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, staffRes, statusRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/tasks/${id}`),
          axios.get("http://localhost:5000/api/staff"),
          axios.get("http://localhost:5000/api/task-status"),
        ]);

        const task = taskRes.data;
        setName(task.name);
        setDescription(task.description);
        setAssignee(task.assignee?._id || "");
        setTaskStatus(task.taskStatus?._id || "");
        setStaff(staffRes.data);
        setStatuses(statusRes.data);
      } catch (err) {
        console.error(err);
        toast({ title: "Error fetching data", status: "error", duration: 2000 });
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/tasks/${id}`, {
        name,
        description,
        assignee,
        taskStatus
      });
      toast({ title: "Task updated", status: "success", duration: 2000 });
      navigate("/admin/tasks");
    } catch (err) {
      console.error(err);
      toast({ title: "Error updating task", status: "error", duration: 2000 });
    }
  };

  return (
    <Box p={4} bg="white" borderRadius="md">
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <Box>
            <FormLabel>Task Name</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Box>

          <Box>
            <FormLabel>Description</FormLabel>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
          </Box>

          <Box>
            <FormLabel>Assignee</FormLabel>
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} required>
              <option value="">Select Staff</option>
              {staff.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </Select>
          </Box>

          <Box>
            <FormLabel>Task Status</FormLabel>
            <Select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)} required>
              <option value="">Select Status</option>
              {statuses.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </Select>
          </Box>

          <Button type="submit" colorScheme="blue">Update Task</Button>
        </VStack>
      </form>
    </Box>
  );
}
