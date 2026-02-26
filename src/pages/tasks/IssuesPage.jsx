import { useState, useEffect, useRef } from "react";
import {
  Box, Flex, Heading, Text, Badge, Avatar, Spinner,
  Button, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, useDisclosure,
  Input, Textarea, Select, useToast, IconButton,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Grid, Tooltip, Alert, AlertIcon, AlertDescription,
  useColorModeValue, FormControl, FormErrorMessage, FormLabel,
  HStack,
} from "@chakra-ui/react";
import { MdAdd, MdDelete, MdEdit, MdBugReport, MdCheckCircle } from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

const priorityColors  = { low: "green", medium: "yellow", high: "orange", critical: "red" };
const severityColors  = { minor: "green", moderate: "yellow", major: "orange", critical: "red" };
const statusColorScheme = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("done") || n.includes("complete") || n.includes("closed")) return "green";
  if (n.includes("progress") || n.includes("active")) return "brand";
  if (n.includes("review") || n.includes("test")) return "purple";
  if (n.includes("block") || n.includes("hold")) return "red";
  return "gray";
};

const SAFE_NAME  = /^[a-zA-Z0-9 .,\-_:!?()\n\r]*$/;
const SAFE_DESC  = /^[a-zA-Z0-9 .,\-_:!?()@#/\n\r]*$/;
const todayStr   = () => new Date().toISOString().split("T")[0];
const PAGE_SIZES = [5, 10, 20];

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

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(5);

  const [deleteId, setDeleteId]   = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen]   = useState(false);
  const [mentionPos, setMentionPos]     = useState(0);
  const [mentions, setMentions]         = useState([]);
  const textareaRef = useRef(null);

  const { isOpen, onOpen, onClose }                               = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const toast = useToast();
  const { user, hasPermission, selectedProject } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  // ── Fix: use "issues_read" to match what UpdateRole saves ──────────────────
  // Your permissions collection has value:"issues", UpdateRole splits by "_"
  // so it saves "issues_read", "issues_create" etc to the role
  const canRead   = isAdmin || hasPermission("issues_read");
  const canCreate = isAdmin || hasPermission("issues_create");
  const canUpdate = isAdmin || hasPermission("issues_update");
  const canDelete = isAdmin || hasPermission("issues_delete");

  const cardBg      = useColorModeValue("white", "gray.800");
  const theadBg     = useColorModeValue("#bee3f8", "#2a4365");
  const theadColor  = useColorModeValue("gray.600", "white");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.400", "gray.400");
  const rowEven     = useColorModeValue("white", "gray.800");
  const rowOdd      = useColorModeValue("gray.50", "gray.750");
  const rowHover    = useColorModeValue("brand.50", "gray.700");
  const borderColor = useColorModeValue("#e2e8f0", "#4a5568");
  const iconBg      = useColorModeValue("red.100", "red.900");
  const projBlueBg  = useColorModeValue("brand.50", "brand.900");
  const projBlueBdr = useColorModeValue("#bee3f8", "#2a4365");
  const projBlueClr = useColorModeValue("brand.600", "brand.200");
  const readOnlyBg  = useColorModeValue("gray.50", "gray.700");
  const dropdownBg  = useColorModeValue("white", "gray.700");
  const dropBorder  = useColorModeValue("#e2e8f0", "#4a5568");
  const dropHover   = useColorModeValue("brand.50", "gray.600");

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

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginated  = filteredIssues.slice(startIndex, startIndex + pageSize);

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
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

  const filteredStaff = staff.filter(s => s.name.toLowerCase().includes(mentionQuery));

  const insertMention = (staffMember) => {
    const before  = form.description.slice(0, mentionPos);
    const after   = form.description.slice(textareaRef.current.selectionStart);
    const updated = `${before}@${staffMember.name} ${after}`;
    setForm(p => ({ ...p, description: updated }));
    setMentions(prev => [...new Set([...prev, staffMember.name])]);
    setMentionOpen(false);
    textareaRef.current.focus();
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())               e.name = "Issue name is required.";
    else if (!SAFE_NAME.test(form.name)) e.name = "No special characters allowed.";
    if (!form.description.trim())        e.description = "Description is required.";
    else if (!SAFE_DESC.test(form.description)) e.description = "No special characters allowed.";
    if (!form.assignee)                  e.assignee = "Assignee is required.";
    if (!form.dueDate)                   e.dueDate = "Due date is required.";
    return e;
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (val && !SAFE_NAME.test(val)) return;
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

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tasks/${deleteId}`);
      setIssues(prev => prev.filter(i => i._id !== deleteId));
      toast({ title: "Issue deleted", status: "info", duration: 2000 });
      onDeleteClose();
      setDeleteId(null);
    } catch {
      toast({ title: "Failed to delete", status: "error", duration: 2000 });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Flex justify="center" py={20}><Spinner size="xl" color="brand.500" /></Flex>;

  return (
    <Box>
      {/* ── HEADER ── */}
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
            <Button leftIcon={<MdAdd />} colorScheme="brand" size="sm" onClick={handleNewIssueClick}>
              New Issue
            </Button>
          )}
        </Flex>
      </Box>

      {showProjectAlert && (
        <Alert status="warning" borderRadius="xl" mb={4}>
          <AlertIcon />
          <AlertDescription fontWeight="500">
            Please select a project from the top bar before creating an issue.
          </AlertDescription>
        </Alert>
      )}

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

      {!selectedProject && issues.length === 0 && (
        <Flex direction="column" align="center" py={20} color={subColor}>
          <MdBugReport size={48} />
          <Text fontSize="sm" mt={2}>No issues found</Text>
        </Flex>
      )}

      {/* ── TABLE ── */}
      {filteredIssues.length > 0 && (
        <Box bg={cardBg} borderRadius="xl" boxShadow="md"
          border={`1px solid ${borderColor}`} overflow="hidden">
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}>
                <Tr>
                  {["#", "Issue", "Priority", "Severity", "Status", "Assignee", "Project", "Created", "Due Date",
                    ...(canUpdate || canDelete ? ["Actions"] : [])].map(h => (
                    <Th key={h} color={theadColor} fontSize="xs" py={3}
                      textAlign={h === "Actions" ? "right" : "left"}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {paginated.map((issue, idx) => (
                  <Tr key={issue._id}
                    bg={idx % 2 === 0 ? rowEven : rowOdd}
                    _hover={{ bg: rowHover }}
                    transition="background 0.15s">
                    <Td color={subColor} fontSize="xs">{startIndex + idx + 1}</Td>
                    <Td py={3} maxW="220px">
                      <Badge colorScheme="brand" borderRadius="full" fontSize="xs" px={2} mb={1}>bug</Badge>
                      <Text fontWeight="600" fontSize="sm" color={textColor} noOfLines={1}>{issue.name}</Text>
                      <Text fontSize="xs" color={subColor} noOfLines={1}>{issue.description}</Text>
                    </Td>
                    <Td>
                      {issue.priority && (
                        <Badge colorScheme={priorityColors[issue.priority]}
                          borderRadius="full" fontSize="xs" px={2} textTransform="capitalize">
                          {issue.priority}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      {issue.severity && (
                        <Badge colorScheme={severityColors[issue.severity]}
                          borderRadius="full" fontSize="xs" px={2} textTransform="capitalize">
                          {issue.severity}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      {issue.taskStatus?.name && (
                        <Badge colorScheme={statusColorScheme(issue.taskStatus.name)}
                          borderRadius="full" fontSize="xs" px={2}>
                          {issue.taskStatus.name}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <Flex align="center" gap={2}>
                        <Avatar name={issue.assignee?.name} size="xs" bg="brand.500" color="white" />
                        <Text fontSize="xs" color={textColor} whiteSpace="nowrap">
                          {issue.assignee?.name}
                        </Text>
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
                              <IconButton icon={<MdEdit />} size="xs" colorScheme="brand" variant="ghost"
                                aria-label="Edit" onClick={() => handleOpen(issue)} />
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip label="Delete">
                              <IconButton icon={<MdDelete />} size="xs" colorScheme="red" variant="ghost"
                                aria-label="Delete"
                                onClick={() => { setDeleteId(issue._id); onDeleteOpen(); }} />
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

          {/* ── PAGINATION ── */}
          <Flex px={4} py={3} justify="space-between" align="center"
            borderTop={`1px solid ${borderColor}`}>
            <Text fontSize="sm" color={subColor}>
              {filteredIssues.length === 0 ? "No results"
                : `${startIndex + 1}–${Math.min(startIndex + pageSize, filteredIssues.length)} of ${filteredIssues.length}`}
            </Text>
            <HStack spacing={2}>
              <Text fontSize="sm" color={textColor}>Rows</Text>
              <Select size="sm" w="72px" value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
              </Select>
            </HStack>
            <HStack spacing={1}>
              <Button size="sm" onClick={() => setCurrentPage(1)} isDisabled={currentPage === 1}>«</Button>
              <Button size="sm" onClick={() => setCurrentPage(p => p - 1)} isDisabled={currentPage === 1}>‹</Button>
              <Text fontSize="sm" color={textColor} px={2}>{currentPage} / {totalPages}</Text>
              <Button size="sm" onClick={() => setCurrentPage(p => p + 1)} isDisabled={currentPage === totalPages}>›</Button>
              <Button size="sm" onClick={() => setCurrentPage(totalPages)} isDisabled={currentPage === totalPages}>»</Button>
            </HStack>
          </Flex>
        </Box>
      )}

      {/* ── MODAL: Create / Edit ── */}
      {(canCreate || canUpdate) && (
        <Modal isOpen={isOpen} onClose={() => { onClose(); resetModal(); }} isCentered size="lg">
          <ModalOverlay />
          <ModalContent bg={cardBg}>
            <ModalHeader color={textColor}>{editingId ? "Edit Issue" : "New Issue"}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedProject && (
                <Box mb={3} p={3} bg={projBlueBg} borderRadius="lg" border={`1px solid ${projBlueBdr}`}>
                  <Text fontSize="xs" color={projBlueClr} fontWeight="600">
                    📁 Project: {selectedProject.name}
                  </Text>
                </Box>
              )}
              <Flex direction="column" gap={3}>
                <FormControl isInvalid={!!errors.name}>
                  <Input placeholder="Issue name *" value={form.name} onChange={handleNameChange} />
                  <FormErrorMessage>{errors.name}</FormErrorMessage>
                </FormControl>

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
                            onMouseDown={e => { e.preventDefault(); insertMention(s); }}>
                            <Box w="24px" h="24px" borderRadius="full"
                              bg="brand.500" color="white"
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
                  <FormErrorMessage>{errors.description}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.assignee}>
                  <Select placeholder="Assignee *" value={form.assignee}
                    onChange={e => handleFieldChange("assignee", e.target.value)}>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Select>
                  <FormErrorMessage>{errors.assignee}</FormErrorMessage>
                </FormControl>

                <Select placeholder="Status" value={form.taskStatus}
                  onChange={e => handleFieldChange("taskStatus", e.target.value)}>
                  {statuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </Select>

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

                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <FormControl>
                    <FormLabel fontSize="xs" color={subColor} mb={1}>Created Date</FormLabel>
                    <Input type="date" value={form.createdDate} isReadOnly
                      bg={readOnlyBg} cursor="not-allowed" opacity={0.7} />
                  </FormControl>
                  <FormControl isInvalid={!!errors.dueDate}>
                    <FormLabel fontSize="xs" color={subColor} mb={1}>Due Date *</FormLabel>
                    <Input type="date" value={form.dueDate} min={form.createdDate}
                      onChange={e => handleFieldChange("dueDate", e.target.value)} />
                    <FormErrorMessage>{errors.dueDate}</FormErrorMessage>
                  </FormControl>
                </Grid>
              </Flex>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => { onClose(); resetModal(); }}>Cancel</Button>
              <Button colorScheme="brand" isLoading={saving} onClick={handleSave}>
                {editingId ? "Update" : "Create"} Issue
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* ── MODAL: Delete ── */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered size="sm">
        <ModalOverlay />
        <ModalContent bg={cardBg} borderRadius="xl">
          <ModalHeader fontSize="md" color={textColor}>Delete Issue</ModalHeader>
          <ModalBody fontSize="sm" color={subColor}>
            Are you sure you want to delete this issue? This action cannot be undone.
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={onDeleteClose}>Cancel</Button>
            <Button size="sm" colorScheme="red" isLoading={deleting}
              loadingText="Deleting..." onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}