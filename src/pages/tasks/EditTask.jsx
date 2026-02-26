import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, FormControl, FormLabel, Input, Select, Button,
  Spinner, Text, Image, Flex, Alert, AlertIcon, AlertDescription,
  Heading, Textarea, Badge, useColorModeValue,
} from "@chakra-ui/react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

const API_BASE = "https://w2ml73xv-5000.inc1.devtunnels.ms";

function resolveMediaUrl(media) {
  if (!media || typeof media !== "string") return null;
  if (media.startsWith("http://") || media.startsWith("https://")) return media;
  return `${API_BASE}${media}`;
}

function isVideoFile(url) {
  if (!url) return false;
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  return ["mp4", "webm", "ogg", "mov"].includes(ext);
}

export default function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedProject } = useAuth();

  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [existingMedia, setExistingMedia] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPos, setMentionPos] = useState(0);
  const [mentions, setMentions] = useState([]);
  const textareaRef = useRef(null);

  const cardBg      = useColorModeValue("white", "gray.800");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.400", "gray.500");
  const dropdownBg  = useColorModeValue("white", "gray.700");
  const dropBorder  = useColorModeValue("#e2e8f0", "#4a5568");
  const dropHover   = useColorModeValue("brand.50", "gray.600");
  const mediaBorder = useColorModeValue("#ccc", "#4a5568");
  const projBlueBg  = useColorModeValue("brand.50", "brand.900");
  const projBlueBdr = useColorModeValue("#bee3f8", "#2a4365");
  const projBlueClr = useColorModeValue("brand.600", "brand.200");
  const projOrgBg   = useColorModeValue("orange.50", "orange.900");
  const projOrgBdr  = useColorModeValue("#fbd38d", "#744210");
  const projOrgClr  = useColorModeValue("orange.600", "orange.200");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, statusRes, staffRes] = await Promise.all([
          api.get(`/tasks/${id}`),
          api.get(`/task-status`),
          api.get(`/staff`),
        ]);
        const task = taskRes.data;
        setName(task.name || "");
        setDescription(task.description || "");
        setTaskStatus(task.taskStatus?._id || "");
        setAssignee(task.assignee?._id || "");
        const foundMentions = (task.description || "").match(/@(\w+)/g);
        if (foundMentions) setMentions(foundMentions.map(m => m.slice(1)));
        let mediaArr = [];
        if (Array.isArray(task.media)) mediaArr = task.media.filter(Boolean);
        else if (typeof task.media === "string" && task.media) mediaArr = [task.media];
        setExistingMedia(mediaArr);
        setStatuses(statusRes.data || []);
        setStaffList(staffRes.data || []);
      } catch {
        setErrorMsg("Failed to load task. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    setDescription(val);
    const caret = e.target.selectionStart;
    const textUpToCaret = val.slice(0, caret);
    const atIdx = textUpToCaret.lastIndexOf("@");
    if (atIdx !== -1) {
      const query = textUpToCaret.slice(atIdx + 1);
      if (!query.includes(" ")) {
        setMentionQuery(query.toLowerCase());
        setMentionPos(atIdx);
        setMentionOpen(true);
        return;
      }
    }
    setMentionOpen(false);
  };

  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(mentionQuery));

  const insertMention = (staffMember) => {
    const before = description.slice(0, mentionPos);
    const after = description.slice(textareaRef.current.selectionStart);
    setDescription(`${before}@${staffMember.name} ${after}`);
    setMentions(prev => [...new Set([...prev, staffMember.name])]);
    setMentionOpen(false);
    textareaRef.current.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");
    try {
      setSubmitting(true);
      await api.put(`/tasks/${id}`, {
        name, description, assignee, taskStatus,
        project: selectedProject?._id || null,
      });
      setSuccessMsg("Task updated successfully!");
      setTimeout(() => navigate("/admin/tasks"), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Update failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Flex justify="center" py={10}><Spinner size="lg" color="brand.500" /></Flex>;

  const displayList = existingMedia
    .map((m) => ({ url: resolveMediaUrl(m), isVideo: isVideoFile(m) }))
    .filter((item) => item.url);

  return (
    <Box maxW="lg" bg={cardBg} p={6} borderRadius="md" shadow="sm">
      <Heading size="md" mb={5} color={textColor}>✏️ Edit Task</Heading>

      {successMsg && <Alert status="success" borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{successMsg}</AlertDescription></Alert>}
      {errorMsg   && <Alert status="error"   borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{errorMsg}</AlertDescription></Alert>}

      {lightbox && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} bg="blackAlpha.900"
          zIndex={9999} display="flex" alignItems="center" justifyContent="center"
          onClick={() => setLightbox(null)} cursor="zoom-out">
          {lightbox.isVideo ? (
            <Box as="video" src={lightbox.url} controls autoPlay maxH="90vh" maxW="90vw"
              borderRadius="md" boxShadow="dark-lg" onClick={(e) => e.stopPropagation()} />
          ) : (
            <Image src={lightbox.url} alt="Full View" maxH="90vh" maxW="90vw"
              borderRadius="md" boxShadow="dark-lg" onClick={(e) => e.stopPropagation()} />
          )}
          <Box position="absolute" top={4} right={6} color="white" fontSize="2xl"
            fontWeight="bold" cursor="pointer" onClick={() => setLightbox(null)}>✕</Box>
        </Box>
      )}

      {selectedProject ? (
        <Box mb={4} p={3} bg={projBlueBg} borderRadius="lg" border={`1px solid ${projBlueBdr}`}>
          <Text fontSize="xs" color={projBlueClr} fontWeight="600">📁 Project: {selectedProject.name}</Text>
        </Box>
      ) : (
        <Box mb={4} p={3} bg={projOrgBg} borderRadius="lg" border={`1px solid ${projOrgBdr}`}>
          <Text fontSize="xs" color={projOrgClr} fontWeight="600">⚠️ No project selected</Text>
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <FormControl mb={3} isRequired>
          <FormLabel color={textColor}>Title</FormLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormControl>

        <FormControl mb={3} isRequired>
          <FormLabel color={textColor}>
            Description
            <Text as="span" fontSize="xs" color={subColor} fontWeight="normal" ml={2}>(type @ to mention staff)</Text>
          </FormLabel>
          <Box position="relative">
            <Textarea ref={textareaRef} value={description} onChange={handleDescriptionChange}
              placeholder="Describe the task... type @name to mention someone" rows={4} />
            {mentionOpen && filteredStaff.length > 0 && (
              <Box position="absolute" top="100%" left={0} zIndex={100} bg={dropdownBg}
                border={`1px solid ${dropBorder}`} borderRadius="md" boxShadow="lg"
                maxH="160px" overflowY="auto" w="220px" mt={1}>
                {filteredStaff.map(s => (
                  <Flex key={s._id} px={3} py={2} align="center" gap={2} cursor="pointer"
                    _hover={{ bg: dropHover }}
                    onMouseDown={(e) => { e.preventDefault(); insertMention(s); }}>
                    <Box w="24px" h="24px" borderRadius="full" bg="brand.500" color="white"
                      display="flex" alignItems="center" justifyContent="center"
                      fontSize="10px" fontWeight="bold" flexShrink={0}>
                      {s.name.charAt(0).toUpperCase()}
                    </Box>
                    <Text fontSize="sm" color={textColor}>{s.name}</Text>
                  </Flex>
                ))}
              </Box>
            )}
          </Box>
          {mentions.length > 0 && (
            <Flex gap={2} mt={2} wrap="wrap">
              {mentions.map(m => (
                <Badge key={m} colorScheme="brand" borderRadius="full" px={2} fontSize="xs">@{m}</Badge>
              ))}
            </Flex>
          )}
        </FormControl>

        <FormControl mb={3} isRequired>
          <FormLabel color={textColor}>Status</FormLabel>
          <Select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
            <option value="">Select Status</option>
            {statuses.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        </FormControl>

        <FormControl mb={4} isRequired>
          <FormLabel color={textColor}>Assignee</FormLabel>
          <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Select Staff</option>
            {staffList.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        </FormControl>

        {displayList.length > 0 && (
          <Box mb={4}>
            <FormLabel color={textColor}>Current Media</FormLabel>
            <Flex gap={2} flexWrap="wrap">
              {displayList.map((item, i) => (
                <Box key={i} position="relative" width="80px" height="80px" cursor="pointer"
                  onClick={() => setLightbox(item)} borderRadius="md" overflow="hidden"
                  border={`1px solid ${mediaBorder}`}>
                  {item.isVideo ? (
                    <>
                      <Box as="video" src={item.url} width="80px" height="80px"
                        style={{ objectFit: "cover", pointerEvents: "none" }} />
                      <Box position="absolute" top="50%" left="50%" transform="translate(-50%,-50%)"
                        bg="blackAlpha.700" borderRadius="full" w="28px" h="28px"
                        display="flex" alignItems="center" justifyContent="center"
                        color="white" fontSize="12px">▶</Box>
                    </>
                  ) : (
                    <Image src={item.url} alt={`media-${i}`} width="80px" height="80px"
                      objectFit="cover" onError={(e) => { e.target.style.display = "none"; }} />
                  )}
                </Box>
              ))}
            </Flex>
            <Text fontSize="xs" color={subColor} mt={1}>Click any to view full size</Text>
          </Box>
        )}

        <Button colorScheme="brand" type="submit" width="100%" isLoading={submitting}>
          Update Task
        </Button>
      </form>
    </Box>
  );
}