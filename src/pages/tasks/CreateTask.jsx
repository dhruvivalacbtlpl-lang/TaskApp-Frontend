import { useEffect, useState } from "react";
import { Box, FormControl, FormLabel, Input, Select, Button, useToast } from "@chakra-ui/react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api"; // ✅ import centralized axios instance

export default function CreateTask() {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  if (!isAdmin && !hasPermission("task_write")) {
    return <Navigate to="/admin/tasks" />;
  }

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [media, setMedia] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/task-status")
      .then(res => setStatuses(res.data))
      .catch(err => console.error(err));

    api.get("/staff")
      .then(res => setStaffList(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("assignee", assignee);
      formData.append("taskStatus", taskStatus);
      if (media) formData.append("media", media);

      await api.post("/tasks", formData, {
        headers: { "Content-Type": "multipart/form-data" },
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

        <FormControl mb={3}>
          <FormLabel>Upload Media</FormLabel>
          <Input type="file" onChange={(e) => setMedia(e.target.files[0])} />
        </FormControl>

        <Button colorScheme="blue" type="submit">Create Task</Button>
      </form>
    </Box>
  );
}
