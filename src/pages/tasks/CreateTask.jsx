// src/pages/CreateTask.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  useToast,
} from "@chakra-ui/react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function CreateTask() {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  // redirect if no write permission
  if (!isAdmin && !hasPermission("task_write")) {
    return <Navigate to="/admin/tasks" />;
  }

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("http://localhost:5000/api/task-status")
      .then(res => setStatuses(res.data))
      .catch(err => console.error(err));

    axios.get("http://localhost:5000/api/staff")
      .then(res => setStaffList(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/tasks", {
        name,
        description,
        assignee,
        taskStatus
      });
      toast({ title: "Task created", status: "success", duration: 2000 });
      navigate("/admin/tasks");
    } catch (err) {
      console.error(err);
      toast({ title: "Error creating task", status: "error", duration: 2000 });
    }
  };

  return (
    <Box maxW="md" bg="white" p={6} borderRadius="md">
      <form onSubmit={handleSubmit}>
        <FormControl mb={3} isRequired>
          <FormLabel>Title</FormLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormControl>

        <FormControl mb={3} isRequired>
          <FormLabel>Description</FormLabel>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormControl>

        <FormControl mb={3} isRequired>
          <FormLabel>Status</FormLabel>
          <Select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
            <option value="">Select Status</option>
            {statuses.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </Select>
        </FormControl>

        <FormControl mb={3} isRequired>
          <FormLabel>Assignee</FormLabel>
          <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Select Staff</option>
            {staffList.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </Select>
        </FormControl>

        <Button colorScheme="blue" type="submit">Create Task</Button>
      </form>
    </Box>
  );
}
