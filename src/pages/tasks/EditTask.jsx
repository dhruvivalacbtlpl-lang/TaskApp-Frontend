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
  Text,
  Image,
} from "@chakra-ui/react";
import axios from "axios";

const API_BASE = "http://localhost:5000";

function resolveMediaUrl(media) {
  if (!media) return null;
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
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [assignee, setAssignee] = useState("");

  const [media, setMedia] = useState(null);
  const [existingMedia, setExistingMedia] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);

  const [statuses, setStatuses] = useState([]);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, statusRes, staffRes] = await Promise.all([
          axios.get(`${API_BASE}/api/tasks/${id}`, { withCredentials: true }),
          axios.get(`${API_BASE}/api/task-status`, { withCredentials: true }),
          axios.get(`${API_BASE}/api/staff`, { withCredentials: true }),
        ]);
        const task = taskRes.data;
        setName(task.name || "");
        setDescription(task.description || "");
        setTaskStatus(task.taskStatus?._id || "");
        setAssignee(task.assignee?._id || "");
        setExistingMedia(task.media || "");
        setStatuses(statusRes.data || []);
        setStaffList(staffRes.data || []);
      } catch {
        toast({ title: "Failed to load task", status: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, toast]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMedia(file);
    const videoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (videoTypes.includes(file.type)) {
      // ✅ For video use object URL (works fine in real browser)
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewIsVideo(true);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target.result);
      reader.readAsDataURL(file);
      setPreviewIsVideo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("assignee", assignee);
    formData.append("taskStatus", taskStatus);
    if (media) formData.append("media", media);
    try {
      await axios.put(`${API_BASE}/api/tasks/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      toast({ title: "Task updated successfully", status: "success" });
      navigate("/admin/tasks");
    } catch {
      toast({ title: "Update failed", status: "error" });
    }
  };

  if (loading) return <Box p={6}><Spinner /></Box>;

  const displayedMedia = previewUrl || resolveMediaUrl(existingMedia);
  const mediaIsVideo = previewIsVideo || isVideo(existingMedia);

  return (
    <Box maxW="md" bg="white" p={6} borderRadius="md" shadow="sm">

      {/* ================= LIGHTBOX / VIDEO MODAL ================= */}
      {lightbox && (
        <Box
          position="fixed"
          top={0} left={0} right={0} bottom={0}
          bg="blackAlpha.900"
          zIndex={9999}
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={() => setLightbox(false)}
          cursor="zoom-out"
        >
          {mediaIsVideo ? (
            <Box
              as="video"
              src={displayedMedia}
              controls
              autoPlay
              maxH="90vh"
              maxW="90vw"
              borderRadius="md"
              boxShadow="dark-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Image
              src={displayedMedia}
              alt="Task Full View"
              maxH="90vh"
              maxW="90vw"
              borderRadius="md"
              boxShadow="dark-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <Box
            position="absolute"
            top={4} right={6}
            color="white"
            fontSize="2xl"
            fontWeight="bold"
            cursor="pointer"
            onClick={() => setLightbox(false)}
          >
            ✕
          </Box>
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

        {/* ================= MEDIA PREVIEW ================= */}
        {displayedMedia && (
          <Box mb={4}>
            <FormLabel>{previewUrl ? "New Media Preview" : "Current Media"}</FormLabel>

            {mediaIsVideo ? (
              // ✅ VIDEO THUMBNAIL — click to open modal
              <Box
                position="relative"
                width="150px"
                cursor="pointer"
                onClick={() => setLightbox(true)}
              >
                <Box
                  as="video"
                  src={displayedMedia}
                  width="150px"
                  height="150px"
                  style={{ objectFit: "cover", borderRadius: "6px", border: "1px solid #ccc", pointerEvents: "none" }}
                />
                {/* Play icon overlay */}
                <Box
                  position="absolute"
                  top="50%" left="50%"
                  transform="translate(-50%, -50%)"
                  bg="blackAlpha.700"
                  borderRadius="full"
                  w="40px" h="40px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontSize="18px"
                >
                  ▶
                </Box>
              </Box>
            ) : (
              // ✅ IMAGE THUMBNAIL — click to open lightbox
              <Image
                src={displayedMedia}
                alt="Task"
                boxSize="150px"
                objectFit="cover"
                borderRadius="md"
                border="1px solid #ccc"
                cursor="zoom-in"
                title="Click to view full size"
                onClick={() => setLightbox(true)}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}

            <Text fontSize="xs" color="gray.400" mt={1}>
              Click to view full size
            </Text>
          </Box>
        )}

        <FormControl mb={4}>
          <FormLabel>Change Media (optional)</FormLabel>
          <Input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            Leave empty to keep existing media
          </Text>
        </FormControl>

        <Button colorScheme="blue" type="submit" width="100%">
          Update Task
        </Button>
      </form>
    </Box>
  );
}
