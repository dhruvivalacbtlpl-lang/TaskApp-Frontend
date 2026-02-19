import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, FormControl, FormLabel, Input, Select, Button,
  Spinner, Text, Image, Flex, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import axios from "axios";

const API_BASE = "https://w2ml73xv-5000.inc1.devtunnels.ms";

function resolveMediaUrl(media) {
  if (!media || typeof media !== "string") return null;
  if (media.startsWith("http://") || media.startsWith("https://")) return media;
  return `${API_BASE}${media}`;
}

function isVideo(url) {
  if (!url) return false;
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  return ["mp4", "webm", "ogg", "mov"].includes(ext);
}

export default function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, statusRes, staffRes] = await Promise.all([
          axios.get(`/tasks/${id}`, { withCredentials: true }),
          axios.get(`/task-status`, { withCredentials: true }),
          axios.get(`/staff`, { withCredentials: true }),
        ]);
        const task = taskRes.data;
        setName(task.name || "");
        setDescription(task.description || "");
        setTaskStatus(task.taskStatus?._id || "");
        setAssignee(task.assignee?._id || "");
        let mediaArr = [];
        if (Array.isArray(task.media)) {
          mediaArr = task.media.filter(Boolean);
        } else if (typeof task.media === "string" && task.media) {
          mediaArr = [task.media];
        }
        setExistingMedia(mediaArr);
        setStatuses(statusRes.data || []);
        setStaffList(staffRes.data || []);
      } catch (err) {
        setErrorMsg("Failed to load task. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setNewFiles(files);
    const previews = [];
    let loaded = 0;
    files.forEach((file) => {
      const videoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
      if (videoTypes.includes(file.type)) {
        previews.push({ url: URL.createObjectURL(file), isVideo: true });
        loaded++;
        if (loaded === files.length) setNewPreviews([...previews]);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          previews.push({ url: ev.target.result, isVideo: false });
          loaded++;
          if (loaded === files.length) setNewPreviews([...previews]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("assignee", assignee);
    formData.append("taskStatus", taskStatus);
    newFiles.forEach((file) => formData.append("media", file));
    try {
      setSubmitting(true);
      await axios.put(`/tasks/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      setSuccessMsg("Task updated successfully!");
      setTimeout(() => navigate("/admin/tasks"), 1500);
    } catch {
      setErrorMsg("Update failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box p={6}><Spinner /></Box>;

  const displayList = newPreviews.length > 0
    ? newPreviews
    : existingMedia
        .map((m) => ({ url: resolveMediaUrl(m), isVideo: isVideo(m) }))
        .filter((item) => item.url);

  return (
    <Box maxW="md" bg="white" p={6} borderRadius="md" shadow="sm">

      {/* ✅ Messages */}
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

      {/* LIGHTBOX */}
      {lightbox && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0}
          bg="blackAlpha.900" zIndex={9999}
          display="flex" alignItems="center" justifyContent="center"
          onClick={() => setLightbox(null)} cursor="zoom-out">
          {lightbox.isVideo ? (
            <Box as="video" src={lightbox.url} controls autoPlay
              maxH="90vh" maxW="90vw" borderRadius="md" boxShadow="dark-lg"
              onClick={(e) => e.stopPropagation()} />
          ) : (
            <Image src={lightbox.url} alt="Full View"
              maxH="90vh" maxW="90vw" borderRadius="md" boxShadow="dark-lg"
              onClick={(e) => e.stopPropagation()} />
          )}
          <Box position="absolute" top={4} right={6}
            color="white" fontSize="2xl" fontWeight="bold"
            cursor="pointer" onClick={() => setLightbox(null)}>✕</Box>
        </Box>
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
            {statuses.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </Select>
        </FormControl>
        <FormControl mb={3} isRequired>
          <FormLabel>Assignee</FormLabel>
          <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Select Staff</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </Select>
        </FormControl>

        {displayList.length > 0 && (
          <Box mb={4}>
            <FormLabel>{newPreviews.length > 0 ? "New Media Preview" : "Current Media"}</FormLabel>
            <Flex gap={2} flexWrap="wrap">
              {displayList.map((item, i) => (
                <Box key={i} position="relative" width="80px" height="80px"
                  cursor="pointer" onClick={() => setLightbox(item)}
                  borderRadius="md" overflow="hidden" border="1px solid #ccc">
                  {item.isVideo ? (
                    <>
                      <Box as="video" src={item.url} width="80px" height="80px"
                        style={{ objectFit: "cover", pointerEvents: "none" }} />
                      <Box position="absolute" top="50%" left="50%"
                        transform="translate(-50%,-50%)" bg="blackAlpha.700"
                        borderRadius="full" w="28px" h="28px"
                        display="flex" alignItems="center" justifyContent="center"
                        color="white" fontSize="12px">▶</Box>
                    </>
                  ) : (
                    <Image src={item.url} alt={`media-${i}`}
                      width="80px" height="80px" objectFit="cover"
                      onError={(e) => { e.target.style.display = "none"; }} />
                  )}
                </Box>
              ))}
            </Flex>
            <Text fontSize="xs" color="gray.400" mt={1}>Click any to view full size</Text>
          </Box>
        )}

        <FormControl mb={4}>
          <FormLabel>Change Media (optional)</FormLabel>
          <Input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} />
          <Text fontSize="xs" color="gray.500" mt={1}>
            Select multiple files. Leave empty to keep existing media.
          </Text>
        </FormControl>

        <Button colorScheme="blue" type="submit" width="100%" isLoading={submitting}>
          Update Task
        </Button>
      </form>
    </Box>
  );
}