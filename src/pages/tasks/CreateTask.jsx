import { useEffect, useState, useRef } from "react";
import {
  Box, FormControl, FormLabel, Input, Select, Button,
  Flex, Text, Alert, AlertIcon, AlertDescription, Heading,
  Textarea, Badge, useColorModeValue, Image, IconButton,
} from "@chakra-ui/react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MdClose, MdUploadFile } from "react-icons/md";
import api from "../../api";

export default function CreateTask() {
  const { user, hasPermission, selectedProject } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [assignee, setAssignee]     = useState("");
  const [statuses, setStatuses]     = useState([]);
  const [staffList, setStaffList]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]     = useState("");

  // ── Mention state ──────────────────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen]   = useState(false);
  const [mentionPos, setMentionPos]     = useState(0);
  const [mentions, setMentions]         = useState([]);
  const textareaRef = useRef(null);

  // ── Media state ────────────────────────────────────────────────────────────
  const [mediaFiles, setMediaFiles]     = useState([]); // File objects
  const [mediaPreviews, setMediaPreviews] = useState([]); // { url, isVideo, name }
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  const cardBg      = useColorModeValue("white", "gray.800");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.400", "gray.500");
  const dropdownBg  = useColorModeValue("white", "gray.700");
  const dropBorder  = useColorModeValue("#e2e8f0", "#4a5568");
  const dropHover   = useColorModeValue("brand.50", "gray.600");
  const projBlueBg  = useColorModeValue("brand.50", "brand.900");
  const projBlueBdr = useColorModeValue("#bee3f8", "#2a4365");
  const projBlueClr = useColorModeValue("brand.600", "brand.200");
  const projOrgBg   = useColorModeValue("orange.50", "orange.900");
  const projOrgBdr  = useColorModeValue("#fbd38d", "#744210");
  const projOrgClr  = useColorModeValue("orange.600", "orange.200");
  const uploadBg    = useColorModeValue("gray.50", "gray.700");
  const uploadBdr   = useColorModeValue("#bee3f8", "#4a5568");

  if (!isAdmin && !hasPermission("task_create")) {
    return <Navigate to="/admin/tasks" />;
  }

  useEffect(() => {
    api.get("/task-status").then(res => setStatuses(res.data)).catch(console.error);
    api.get("/staff").then(res => setStaffList(res.data)).catch(console.error);
  }, []);

  // ── Mention handlers ───────────────────────────────────────────────────────
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

  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(mentionQuery)
  );

  const insertMention = (staffMember) => {
    const before = description.slice(0, mentionPos);
    const after = description.slice(textareaRef.current.selectionStart);
    setDescription(`${before}@${staffMember.name} ${after}`);
    setMentions(prev => [...new Set([...prev, staffMember.name])]);
    setMentionOpen(false);
    textareaRef.current.focus();
  };

  // ── Media handlers ─────────────────────────────────────────────────────────
  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newFiles    = [...mediaFiles, ...files];
    const newPreviews = [
      ...mediaPreviews,
      ...files.map((f) => {
        const isVideo = f.type.startsWith("video/");
        return { url: URL.createObjectURL(f), isVideo, name: f.name };
      }),
    ];

    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
    e.target.value = ""; // allow re-selecting same file
  };

  const removeMedia = (index) => {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");
    if (!name || !description || !assignee || !taskStatus) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    try {
      setLoading(true);

      // Use FormData so multer can receive files
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("assignee", assignee);
      formData.append("taskStatus", taskStatus);
      if (selectedProject?._id) formData.append("project", selectedProject._id);
      mediaFiles.forEach((f) => formData.append("media", f));

      await api.post("/tasks", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMsg("Task created successfully!");
      setTimeout(() => navigate("/admin/tasks"), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Error creating task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="lg" bg={cardBg} p={6} borderRadius="md" boxShadow="sm">
      <Heading size="md" mb={5} color={textColor}>📋 Create Task</Heading>

      {successMsg && <Alert status="success" borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{successMsg}</AlertDescription></Alert>}
      {errorMsg   && <Alert status="error"   borderRadius="md" mb={4}><AlertIcon /><AlertDescription>{errorMsg}</AlertDescription></Alert>}

      {/* Project banner */}
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
        {/* Title */}
        <FormControl mb={3} isRequired>
          <FormLabel color={textColor}>Title</FormLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Task title" />
        </FormControl>

        {/* Description + mentions */}
        <FormControl mb={3} isRequired>
          <FormLabel color={textColor}>
            Description
            <Text as="span" fontSize="xs" color={subColor} fontWeight="normal" ml={2}>
              (type @ to mention staff)
            </Text>
          </FormLabel>
          <Box position="relative">
            <Textarea
              ref={textareaRef}
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Describe the task... type @name to mention someone"
              rows={4}
            />
            {mentionOpen && filteredStaff.length > 0 && (
              <Box
                position="absolute" top="100%" left={0} zIndex={100}
                bg={dropdownBg} border={`1px solid ${dropBorder}`}
                borderRadius="md" boxShadow="lg" maxH="160px" overflowY="auto"
                w="220px" mt={1}
              >
                {filteredStaff.map(s => (
                  <Flex
                    key={s._id} px={3} py={2} align="center" gap={2}
                    cursor="pointer" _hover={{ bg: dropHover }}
                    onMouseDown={(e) => { e.preventDefault(); insertMention(s); }}
                  >
                    <Box
                      w="24px" h="24px" borderRadius="full" bg="brand.500" color="white"
                      display="flex" alignItems="center" justifyContent="center"
                      fontSize="10px" fontWeight="bold" flexShrink={0}
                    >
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

        {/* Status */}
        <FormControl mb={3} isRequired>
          <FormLabel color={textColor}>Status</FormLabel>
          <Select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
            <option value="">Select Status</option>
            {statuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        </FormControl>

        {/* Assignee */}
        <FormControl mb={4} isRequired>
          <FormLabel color={textColor}>Assignee</FormLabel>
          <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Select Staff</option>
            {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        </FormControl>

        {/* ── NEW: Media Upload ── */}
        <FormControl mb={4}>
          <FormLabel color={textColor}>
            Attachments
            <Text as="span" fontSize="xs" color={subColor} fontWeight="normal" ml={2}>
              (images or videos, optional)
            </Text>
          </FormLabel>

          {/* Drop zone / click to upload */}
          <Flex
            direction="column" align="center" justify="center"
            p={5} borderRadius="lg" border={`2px dashed ${uploadBdr}`}
            bg={uploadBg} cursor="pointer" gap={2}
            onClick={() => fileInputRef.current?.click()}
            _hover={{ borderColor: "brand.400" }}
            transition="border-color 0.2s"
          >
            <MdUploadFile size={28} color="#63b3ed" />
            <Text fontSize="sm" color={textColor} fontWeight="500">
              Click to attach images or videos
            </Text>
            <Text fontSize="xs" color={subColor}>PNG, JPG, GIF, MP4, MOV …</Text>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              display="none"
              onChange={handleMediaChange}
            />
          </Flex>

          {/* Previews */}
          {mediaPreviews.length > 0 && (
            <Flex gap={2} mt={3} flexWrap="wrap">
              {mediaPreviews.map((item, i) => (
                <Box
                  key={i}
                  position="relative"
                  w="72px" h="72px"
                  borderRadius="md" overflow="hidden"
                  border="1px solid"
                  borderColor={uploadBdr}
                  flexShrink={0}
                >
                  {item.isVideo ? (
                    <>
                      <Box
                        as="video"
                        src={item.url}
                        style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
                      />
                      <Box
                        position="absolute" top="50%" left="50%"
                        transform="translate(-50%,-50%)"
                        bg="blackAlpha.700" borderRadius="full"
                        w="24px" h="24px" display="flex" alignItems="center"
                        justifyContent="center" color="white" fontSize="10px"
                      >▶</Box>
                    </>
                  ) : (
                    <Image
                      src={item.url} alt={item.name}
                      w="100%" h="100%" objectFit="cover"
                    />
                  )}
                  {/* Remove button */}
                  <IconButton
                    icon={<MdClose size={12} />}
                    size="xs" colorScheme="red"
                    position="absolute" top="2px" right="2px"
                    minW="18px" h="18px" p={0}
                    borderRadius="full"
                    aria-label="Remove"
                    onClick={(e) => { e.stopPropagation(); removeMedia(i); }}
                  />
                </Box>
              ))}
            </Flex>
          )}
        </FormControl>

        <Button colorScheme="brand" type="submit" width="100%" isLoading={loading}>
          Create Task
        </Button>
      </form>
    </Box>
  );
}