import { useEffect, useState } from "react";
import {
  Box, FormControl, FormLabel, Input, Select, Button,
  Image, Flex, Text, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

export default function CreateTask() {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  if (!isAdmin && !hasPermission("task_create")) {
    return <Navigate to="/admin/tasks" />;
  }

  useEffect(() => {
    api.get("/task-status").then(res => setStatuses(res.data)).catch(console.error);
    api.get("/staff").then(res => setStaffList(res.data)).catch(console.error);
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setMediaFiles(files);
    const result = [];
    let loaded = 0;
    files.forEach((file) => {
      const videoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
      if (videoTypes.includes(file.type)) {
        result.push({ url: URL.createObjectURL(file), isVideo: true });
        loaded++;
        if (loaded === files.length) setPreviews([...result]);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          result.push({ url: ev.target.result, isVideo: false });
          loaded++;
          if (loaded === files.length) setPreviews([...result]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("assignee", assignee);
      formData.append("taskStatus", taskStatus);
      mediaFiles.forEach((file) => formData.append("media", file));
      await api.post("/tasks", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccessMsg("Task created successfully!");
      setTimeout(() => navigate("/admin/tasks"), 1500);
    } catch (err) {
      setErrorMsg("Error creating task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="md" bg="white" p={6} borderRadius="md">

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
          <Input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} />
          <Text fontSize="xs" color="gray.500" mt={1}>You can select multiple images or videos</Text>
        </FormControl>

        {previews.length > 0 && (
          <Box mb={4}>
            <Text fontSize="sm" mb={2} color="gray.600">
              Preview ({previews.length} file{previews.length > 1 ? "s" : ""})
            </Text>
            <Flex gap={2} flexWrap="wrap">
              {previews.map((p, i) => (
                <Box key={i} width="80px" height="80px" borderRadius="md"
                  overflow="hidden" border="1px solid #ccc" position="relative">
                  {p.isVideo ? (
                    <>
                      <Box as="video" src={p.url} width="80px" height="80px"
                        style={{ objectFit: "cover", pointerEvents: "none" }} />
                      <Box position="absolute" top="50%" left="50%"
                        transform="translate(-50%,-50%)" bg="blackAlpha.700"
                        borderRadius="full" w="28px" h="28px"
                        display="flex" alignItems="center" justifyContent="center"
                        color="white" fontSize="12px">▶</Box>
                    </>
                  ) : (
                    <Image src={p.url} width="80px" height="80px" objectFit="cover" />
                  )}
                </Box>
              ))}
            </Flex>
          </Box>
        )}

        <Button colorScheme="blue" type="submit" width="100%" isLoading={loading}>
          Create Task
        </Button>
      </form>
    </Box>
  );
}