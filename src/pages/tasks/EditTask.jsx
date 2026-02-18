import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import axios from "axios";

export default function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [media, setMedia] = useState(null);

  const [statuses, setStatuses] = useState([]);
  const [staffList, setStaffList] = useState([]);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, statusRes, staffRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/tasks/${id}`),
          axios.get("http://localhost:5000/api/task-status"),
          axios.get("http://localhost:5000/api/staff"),
        ]);

        const task = taskRes.data;

        setName(task.name || "");
        setDescription(task.description || "");
        setTaskStatus(task.taskStatus?._id || "");
        setAssignee(task.assignee?._id || "");

        setStatuses(statusRes.data || []);
        setStaffList(staffRes.data || []);
      } catch (err) {
        console.error(err);
        toast({ title: "Failed to load task", status: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  /* ================= UPDATE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("assignee", assignee);
    formData.append("taskStatus", taskStatus);
    if (media) formData.append("media", media);

    try {
      await axios.put(
        `http://localhost:5000/api/tasks/${id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      toast({ title: "Task updated", status: "success" });
      navigate("/admin/tasks");
    } catch (err) {
      console.error(err);
      toast({ title: "Update failed", status: "error" });
    }
  };

  if (loading) return <Spinner />;

  return (
    <Box maxW="md" bg="white" p={6} borderRadius="md">
      <form onSubmit={handleSubmit}>
        <FormControl mb={3} isRequired>
          <FormLabel>Title</FormLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormControl>

        <FormControl mb={3} isRequired>
          <FormLabel>Description</FormLabel>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormControl>

        <FormControl mb={3} isRequired>
          <FormLabel>Status</FormLabel>
          <Select
            value={taskStatus}
            onChange={(e) => setTaskStatus(e.target.value)}
          >
            <option value="">Select Status</option>
            {statuses.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl mb={3} isRequired>
          <FormLabel>Assignee</FormLabel>
          <Select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">Select Staff</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Media (optional)</FormLabel>
          <Input
            type="file"
            onChange={(e) => setMedia(e.target.files[0])}
          />
        </FormControl>

        <Button colorScheme="blue" type="submit">
          Update Task
        </Button>
      </form>
    </Box>
  );
}
