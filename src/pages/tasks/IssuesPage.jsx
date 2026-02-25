import { useState, useEffect, useRef } from "react";
import {
  Box, Flex, Heading, Text, Badge, Avatar, Spinner,
  Button, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, useDisclosure,
  Input, Textarea, Select, useToast, IconButton,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Grid, Tooltip, Alert, AlertIcon, AlertDescription,
  useColorModeValue, FormControl, FormErrorMessage, FormLabel,
} from "@chakra-ui/react";
import { MdAdd, MdDelete, MdEdit, MdBugReport, MdCheckCircle } from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

const priorityColors  = { low: "green", medium: "yellow", high: "orange", critical: "red" };
const severityColors  = { minor: "green", moderate: "yellow", major: "orange", critical: "red" };
const statusColorScheme = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("done") || n.includes("complete") || n.includes("closed")) return "green";
  if (n.includes("progress") || n.includes("active")) return "blue";
  if (n.includes("review") || n.includes("test")) return "purple";
  if (n.includes("block") || n.includes("hold")) return "red";
  return "gray";
};

// For name field — no special chars at all
const SAFE_NAME = /^[a-zA-Z0-9 .,\-_:!?()\n\r]*$/;
// For description — same but allows @ for mentions
const SAFE_DESC = /^[a-zA-Z0-9 .,\-_:!?()@#/\n\r]*$/;

const todayStr = () => new Date().toISOString().split("T")[0];

const empty = {
  name: "", description: "", taskStatus: "", assignee: "",
  priority: "medium", issueType: "bug", severity: "minor",
  dueDate: "", createdDate: todayStr(),
};

export default function IssuesPage() {
  const [issues, setIssues]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [staff, setStaff]         = useState([]);
  const [statuses, setStatuses]   = useState([]);
  const [form, setForm]           = useState(empty);
  const [errors, setErrors]       = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [showProjectAlert, setShowProjectAlert] = useState(false);

  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen]   = useState(false);
  const [mentionPos, setMentionPos]     = useState(0);
  const [mentions, setMentions]         = useState([]);
  const textareaRef = useRef(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { user, hasPermission, selectedProject } = useAuth();
  const isAdmin   = user?.role?.name?.toLowerCase() === "admin";
  const canRead   = isAdmin || hasPermission("issue_read");
  const canCreate = isAdmin || hasPermission("issue_create");
  const canUpdate = isAdmin || hasPermission("issue_update");
  const canDelete = isAdmin || hasPermission("issue_delete");

  const cardBg      = useColorModeValue("white", "gray.800");
  const theadBg     = useColorModeValue("#bee3f8", "#2a4365");
  const theadColor  = useColorModeValue("gray.500", "white");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.400", "gray.400");
  const rowEven     = useColorModeValue("white", "gray.800");
  const rowOdd      = useColorModeValue("gray.50", "gray.750");
  const rowHover    = useColorModeValue("blue.50", "gray.700");
  const borderColor = useColorModeValue("#e2e8f0", "#4a5568");
  const iconBg      = useColorModeValue("red.100", "red.900");
  const projBlueBg  = useColorModeValue("blue.50", "blue.900");
  const projBlueBdr = useColorModeValue("#bee3f8", "#2a4365");
  const projBlueClr = useColorModeValue("blue.600", "blue.200");
  const readOnlyBg  = useColorModeValue("gray.50", "gray.700");
  const dropdownBg  = useColorModeValue("white", "gray.700");
  const dropBorder  = useColorModeValue("#e2e8f0", "#4a5568");
  const dropHover   = useColorModeValue("blue.50", "gray.600");

  useEffect(() => {
    if (!canRead) { setLoading(false); return; }
    const fetchAll = async () => {
      try {
        const [issuesRes, staffRes, statusRes] = await Promise.all([
          api.get("/tasks/issues/all"),
          api.get("/staff"),
          api.get("/task-status"),
        ]);
        setIssues(issuesRes.data || []);
        setStaff(staffRes.data || []);
        setStatuses(statusRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [canRead]);

  if (!canRead) {
    return (
      <Box p={6}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription>You don't have permission to view issues.</AlertDescription>
        </Alert>
      </Box>
    );
  }

  const filteredIssues = selectedProject
    ? issues.filter(i => i.project?._id === selectedProject._id)
    : issues;

  // ── mention logic ──────────────────────────────────────────────────────────
  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    // Block truly harmful special chars but allow @ for mentions
    if (val && !SAFE_DESC.test(val)) return;
    setForm(p => ({ ...p, description: val }));
    setErrors(p => ({ ...p, description: undefined }));

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

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(mentionQuery)
  );

  const insertMention = (staffMember) => {
    const before  = form.description.slice(0, mentionPos);
    const after   = form.description.slice(textareaRef.current.selectionStart);
    const updated = `${before}@${staffMember.name} ${after}`;
    setForm(p => ({ ...p, description: updated }));
    setMentions(prev => [...new Set([...prev, staffMember.name])]);
    setMentionOpen(false);
    textareaRef.current.focus();
  };

  // ── validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};

    if (!form.name.trim())
      e.name = "Issue name is required.";
    else if (!SAFE_NAME.test(form.name))
      e.name = "No special characters allowed.";

    if (!form.description.trim())
      e.description = "Description is required.";
    else if (!SAFE_DESC.test(form.description))
      e.description = "No special characters allowed.";

    if (!form.assignee)
      e.assignee = "Assignee is required.";

    if (!form.dueDate)
      e.dueDate = "Due date is required.";

    return e;
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (val && !SAFE_NAME.test(val)) return; // block special chars live
    setForm(p => ({ ...p, name: val }));
    setErrors(p => ({ ...p, name: undefined }));
  };

  const handleFieldChange = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setErrors(p => ({ ...p, [field]: undefined }));
  };

  const resetModal = () => {
    setForm({ ...empty, createdDate: todayStr() });
    setEditingId(null);
    setErrors({});
    setMentions([]);
    setMentionOpen(false);
    setMentionQuery("");
  };

  const handleNewIssueClick = () => {
    if (!selectedProject) {
      setShowProjectAlert(true);
      setTimeout(() => setShowProjectAlert(false), 4000);
      return;
    }
    setShowProjectAlert(false);
    resetModal();
    onOpen();
  };

  const handleOpen = (issue) => {
    setForm({
      name: issue.name,
      description: issue.description,
      taskStatus: issue.taskStatus?._id || "",
      assignee: issue.assignee?._id || "",
      priority: issue.priority || "medium",
      issueType: "bug",
      severity: issue.severity || "minor",
      dueDate: issue.dueDate ? issue.dueDate.split("T")[0] : "",
      createdDate: issue.createdDate ? issue.createdDate.split("T")[0] : todayStr(),
    });
    setEditingId(issue._id);
    setErrors({});
    setMentions([]);
    setMentionOpen(false);
    onOpen();
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = { ...form, issueType: "bug", project: selectedProject?._id || null };
      if (editingId) {
        const res = await api.put(`/tasks/issues/${editingId}`, payload);
        setIssues(prev => prev.map(i => i._id === editingId ? res.data : i));
        toast({ title: "Issue updated!", status: "success", duration: 2000 });
      } else {
        const res = await api.post("/tasks/issues/create", payload);
        setIssues(prev => [res.data, ...prev]);
        toast({ title: "Issue created!", status: "success", duration: 2000 });
      }
      onClose();
      resetModal();
    } catch (err) {
      toast({ title: "Failed to save issue", status: "error", duration: 2000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setIssues(prev => prev.filter(i => i._id !== id));
      toast({ title: "Issue deleted", status: "info", duration: 2000 });
    } catch {
      toast({ title: "Failed to delete", status: "error", duration: 2000 });
    }
  };

  if (loading) return <Flex justify="center" py={20}><Spinner size="xl" color="blue.500" /></Flex>;

  return (
    <Box>
      {/* HEADER */}
      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" mb={4}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={3}>
            <Box bg={iconBg} p={3} borderRadius="lg">
              <MdBugReport size={26} color="#c53030" />
            </Box>
            <Box>
              <Heading size="md" color={textColor}>Issues</Heading>
              <Text fontSize="sm" color={subColor}>
                {selectedProject
                  ? `Showing bugs for: ${selectedProject.name}`
                  : `Showing all ${issues.length} issues — select a project to filter`}
              </Text>
            </Box>
          </Flex>
          {canCreate && (
            <Button leftIcon={<MdAdd />} colorScheme="blue" size="sm" onClick={handleNewIssueClick}>
              New Issue
            </Button>
          )}
        </Flex>
      </Box>

      {/* SELECT PROJECT ALERT */}
      {showProjectAlert && (
        <Alert status="warning" borderRadius="xl" mb={4}>
          <AlertIcon />
          <AlertDescription fontWeight="500">
            Please select a project from the top bar before creating an issue.
          </AlertDescription>
        </Alert>
      )}

      {/* ZERO BUGS STATE */}
      {selectedProject && filteredIssues.length === 0 && (
        <Flex
          direction="column" align="center" justify="center" py={16}
          bg="green.50" borderRadius="xl"
          border="1px solid" borderColor="green.200"
          _dark={{ bg: "green.900", borderColor: "green.600" }}
        >
          <MdCheckCircle size={52} color="#38a169" />
          <Heading size="md" color="green.700" _dark={{ color: "green.200" }} mt={3}>
            No Bugs Found
          </Heading>
          <Text fontSize="sm" color="green.600" _dark={{ color: "green.300" }} mt={1}>
            No issues reported for {selectedProject.name}
          </Text>
        </Flex>
      )}

      {/* EMPTY STATE */}
      {!selectedProject && issues.length === 0 && (
        <Flex direction="column" align="center" py={20} color={subColor}>
          <MdBugReport size={48} />
          <Text fontSize="sm" mt={2}>No issues found</Text>
        </Flex>
      )}

      {/* TABLE */}
      {filteredIssues.length > 0 && (
        <Box bg={cardBg} borderRadius="xl" boxShadow="md" border={`1px solid ${borderColor}`} overflow="hidden">
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}>
                <Tr>
                  {["Issue", "Priority", "Severity", "Status", "Assignee", "Project", "Created", "Due Date",
                    ...(canUpdate || canDelete ? ["Actions"] : [])].map(h => (
                    <Th key={h} color={theadColor} fontSize="xs" py={3}
                      textAlign={h === "Actions" ? "right" : "left"}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {filteredIssues.map((issue, idx) => (
                  <Tr key={issue._id}
                    bg={idx % 2 === 0 ? rowEven : rowOdd}
                    _hover={{ bg: rowHover }}
                    transition="background 0.15s">
                    <Td py={3} maxW="220px">
                      <Badge colorScheme="blue" borderRadius="full" fontSize="xs" px={2} mb={1}>bug</Badge>
                      <Text fontWeight="600" fontSize="sm" color={textColor} noOfLines={1}>{issue.name}</Text>
                      <Text fontSize="xs" color={subColor} noOfLines={1}>{issue.description}</Text>
                    </Td>
                    <Td>
                      {issue.priority && (
                        <Badge colorScheme={priorityColors[issue.priority]} borderRadius="full" fontSize="xs" px={2} textTransform="capitalize">
                          {issue.priority}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      {issue.severity && (
                        <Badge colorScheme={severityColors[issue.severity]} borderRadius="full" fontSize="xs" px={2} textTransform="capitalize">
                          {issue.severity}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      {issue.taskStatus?.name && (
                        <Badge colorScheme={statusColorScheme(issue.taskStatus.name)} borderRadius="full" fontSize="xs" px={2}>
                          {issue.taskStatus.name}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <Flex align="center" gap={2}>
                        <Avatar name={issue.assignee?.name} size="xs" bg="blue.400" color="white" />
                        <Text fontSize="xs" color={textColor} whiteSpace="nowrap">{issue.assignee?.name}</Text>
                      </Flex>
                    </Td>
                    <Td>
                      <Text fontSize="xs" color={subColor} noOfLines={1}>
                        {issue.project?.name ? `📁 ${issue.project.name}` : "—"}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="xs" color={subColor} whiteSpace="nowrap">
                        {issue.createdDate
                          ? new Date(issue.createdDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : new Date(issue.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="xs" color={subColor} whiteSpace="nowrap">
                        {issue.dueDate
                          ? new Date(issue.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </Text>
                    </Td>
                    {(canUpdate || canDelete) && (
                      <Td textAlign="right">
                        <Flex justify="flex-end" gap={1}>
                          {canUpdate && (
                            <Tooltip label="Edit">
                              <IconButton icon={<MdEdit />} size="xs" colorScheme="blue" variant="ghost"
                                aria-label="Edit" onClick={() => handleOpen(issue)} />
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip label="Delete">
                              <IconButton icon={<MdDelete />} size="xs" colorScheme="red" variant="ghost"
                                aria-label="Delete" onClick={() => handleDelete(issue._id)} />
                            </Tooltip>
                          )}
                        </Flex>
                      </Td>
                    )}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* MODAL */}
      {(canCreate || canUpdate) && (
        <Modal isOpen={isOpen} onClose={() => { onClose(); resetModal(); }} isCentered size="lg">
          <ModalOverlay />
          <ModalContent bg={cardBg}>
            <ModalHeader color={textColor}>{editingId ? "Edit Issue" : "New Issue"}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedProject && (
                <Box mb={3} p={3} bg={projBlueBg} borderRadius="lg" border={`1px solid ${projBlueBdr}`}>
                  <Text fontSize="xs" color={projBlueClr} fontWeight="600">📁 Project: {selectedProject.name}</Text>
                </Box>
              )}
              <Flex direction="column" gap={3}>

                {/* Issue Name — no special chars */}
                <FormControl isInvalid={!!errors.name}>
                  <Input
                    placeholder="Issue name *"
                    value={form.name}
                    onChange={handleNameChange}
                  />
                  <FormErrorMessage>{errors.name}</FormErrorMessage>
                </FormControl>

                {/* Description — @ allowed for mentions, other special chars blocked */}
                <FormControl isInvalid={!!errors.description}>
                  <FormLabel fontSize="sm" color={textColor} mb={1}>
                    Description *
                    <Text as="span" fontSize="xs" color={subColor} fontWeight="normal" ml={2}>
                      (type @ to mention staff)
                    </Text>
                  </FormLabel>
                  <Box position="relative">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Describe the issue... type @name to mention someone"
                      value={form.description}
                      onChange={handleDescriptionChange}
                      rows={4}
                    />
                    {mentionOpen && filteredStaff.length > 0 && (
                      <Box
                        position="absolute" top="100%" left={0} zIndex={100}
                        bg={dropdownBg} border={`1px solid ${dropBorder}`}
                        borderRadius="md" boxShadow="lg"
                        maxH="160px" overflowY="auto" w="220px" mt={1}
                      >
                        {filteredStaff.map(s => (
                          <Flex key={s._id} px={3} py={2} align="center" gap={2}
                            cursor="pointer" _hover={{ bg: dropHover }}
                            onMouseDown={(e) => { e.preventDefault(); insertMention(s); }}>
                            <Box
                              w="24px" h="24px" borderRadius="full"
                              bg="blue.400" color="white"
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
                        <Badge key={m} colorScheme="blue" borderRadius="full" px={2} fontSize="xs">@{m}</Badge>
                      ))}
                    </Flex>
                  )}
                  <FormErrorMessage>{errors.description}</FormErrorMessage>
                </FormControl>

                {/* Assignee */}
                <FormControl isInvalid={!!errors.assignee}>
                  <Select
                    placeholder="Assignee *"
                    value={form.assignee}
                    onChange={e => handleFieldChange("assignee", e.target.value)}
                  >
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Select>
                  <FormErrorMessage>{errors.assignee}</FormErrorMessage>
                </FormControl>

                {/* Status */}
                <Select placeholder="Status" value={form.taskStatus}
                  onChange={e => handleFieldChange("taskStatus", e.target.value)}>
                  {statuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </Select>

                {/* Priority & Severity */}
                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <Select value={form.priority} onChange={e => handleFieldChange("priority", e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </Select>
                  <Select value={form.severity} onChange={e => handleFieldChange("severity", e.target.value)}>
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </Select>
                </Grid>

                {/* Created Date (read-only) & Due Date (required) */}
                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <FormControl>
                    <FormLabel fontSize="xs" color={subColor} mb={1}>Created Date</FormLabel>
                    <Input
                      type="date"
                      value={form.createdDate}
                      isReadOnly
                      bg={readOnlyBg}
                      cursor="not-allowed"
                      opacity={0.7}
                    />
                  </FormControl>
                  <FormControl isInvalid={!!errors.dueDate}>
                    <FormLabel fontSize="xs" color={subColor} mb={1}>Due Date *</FormLabel>
                    <Input
                      type="date"
                      value={form.dueDate}
                      min={form.createdDate}
                      onChange={e => handleFieldChange("dueDate", e.target.value)}
                    />
                    <FormErrorMessage>{errors.dueDate}</FormErrorMessage>
                  </FormControl>
                </Grid>

              </Flex>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => { onClose(); resetModal(); }}>Cancel</Button>
              <Button colorScheme="blue" isLoading={saving} onClick={handleSave}>
                {editingId ? "Update" : "Create"} Issue
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}