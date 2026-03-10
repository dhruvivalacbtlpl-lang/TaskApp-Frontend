import { useState, useEffect, useRef } from "react";
import {
  Box, Flex, Heading, Text, Badge, Avatar, Spinner,
  Button, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, useDisclosure,
  Input, Textarea, Select, useToast, IconButton,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Grid, Tooltip, Alert, AlertIcon, AlertDescription,
  useColorModeValue, FormControl, FormErrorMessage, FormLabel,
  HStack, VStack, Progress,
} from "@chakra-ui/react";
import {
  MdAdd, MdDelete, MdEdit, MdBugReport, MdCheckCircle,
  MdUploadFile, MdDownload, MdDeleteSweep,
} from "react-icons/md";
import * as XLSX from "xlsx";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

// ── Constants ─────────────────────────────────────────────────────────────────
const priorityColors = { low: "green", medium: "yellow", high: "orange", critical: "red" };
const severityColors = { minor: "green", moderate: "yellow", major: "orange", critical: "red" };

const statusColorScheme = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("done") || n.includes("complete") || n.includes("closed")) return "green";
  if (n.includes("progress") || n.includes("active")) return "blue";
  if (n.includes("review") || n.includes("test")) return "purple";
  if (n.includes("block") || n.includes("hold")) return "red";
  return "gray";
};

const SAFE_NAME  = /^[a-zA-Z0-9 .,\-_:!?()\n\r]*$/;
const SAFE_DESC  = /^[a-zA-Z0-9 .,\-_:!?()@#/\n\r]*$/;
const todayStr   = () => new Date().toISOString().split("T")[0];
const PAGE_SIZES = [5, 10, 20];

const emptyForm = {
  name: "", description: "", taskStatus: "", assignee: "",
  priority: "medium", issueType: "bug", severity: "minor",
  dueDate: "", createdDate: todayStr(),
};

export default function IssuesPage() {
  // ── Core state ───────────────────────────────────────────────────────────
  const [issues, setIssues]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [staff, setStaff]         = useState([]);
  const [statuses, setStatuses]   = useState([]);
  const [form, setForm]           = useState(emptyForm);
  const [errors, setErrors]       = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [showProjectAlert, setShowProjectAlert] = useState(false);
  const [deleteId, setDeleteId]   = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [deletingAll, setDeletingAll]   = useState(false);
  const [deleteAllMsg, setDeleteAllMsg] = useState("");

  // ── Pagination ───────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(5);

  // ── Mention state ─────────────────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen]   = useState(false);
  const [mentionPos, setMentionPos]     = useState(0);
  const [mentions, setMentions]         = useState([]);
  const textareaRef = useRef(null);

  // ── Bulk upload state ─────────────────────────────────────────────────────
  const [bulkFileName, setBulkFileName]         = useState("");
  const [bulkFileReady, setBulkFileReady]       = useState(false);
  const [bulkParseError, setBulkParseError]     = useState("");
  const [bulkRowCount, setBulkRowCount]         = useState(0);
  const [bulkSkipped, setBulkSkipped]           = useState(0);
  const [bulkUploading, setBulkUploading]       = useState(false);
  const [bulkTotalCreated, setBulkTotalCreated] = useState(0);
  const [bulkTotalFailed, setBulkTotalFailed]   = useState(0);
  const [bulkDone, setBulkDone]                 = useState(false);
  const [bulkUnmatched, setBulkUnmatched]       = useState([]);   // assignee names not found in DB
  const [bulkDuplicates, setBulkDuplicates]     = useState(0);    // rows skipped as duplicates
  // ✅ Fake animated progress — goes 0→95 while API runs, jumps to 100 on done
  const [bulkProgress, setBulkProgress]         = useState(0);

  const bulkFileInputRef = useRef(null);
  const parsedRef        = useRef([]);
  const progressTimer    = useRef(null);

  // ── Modals ───────────────────────────────────────────────────────────────
  const { isOpen, onOpen, onClose }                                            = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isBulkOpen,   onOpen: onBulkOpen,   onClose: onBulkClose }  = useDisclosure();

  const toast = useToast();
  const { user, hasPermission, selectedProject } = useAuth();

  const isAdmin   = user?.role?.name?.toLowerCase() === "admin";
  const canRead   = isAdmin || hasPermission("issues_read");
  const canCreate = isAdmin || hasPermission("issues_create");
  const canUpdate = isAdmin || hasPermission("issues_update");
  const canDelete = isAdmin || hasPermission("issues_delete");

  // ── Colors ────────────────────────────────────────────────────────────────
  const cardBg      = useColorModeValue("white", "gray.800");
  const theadBg     = useColorModeValue("#fee2e2", "#742a2a");
  const theadColor  = useColorModeValue("gray.700", "white");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.500", "gray.400");
  const rowEven     = useColorModeValue("white", "gray.800");
  const rowOdd      = useColorModeValue("gray.50", "gray.750");
  const rowHover    = useColorModeValue("red.50", "gray.700");
  const borderColor = useColorModeValue("#e2e8f0", "#4a5568");
  const iconBg      = useColorModeValue("red.100", "red.900");
  const projBlueBg  = useColorModeValue("blue.50", "blue.900");
  const projBlueBdr = useColorModeValue("#bee3f8", "#2a4365");
  const projBlueClr = useColorModeValue("blue.700", "blue.200");
  const readOnlyBg  = useColorModeValue("gray.50", "gray.700");
  const dropdownBg  = useColorModeValue("white", "gray.700");
  const dropBorder  = useColorModeValue("#e2e8f0", "#4a5568");
  const dropHover   = useColorModeValue("red.50", "gray.600");
  const uploadBoxBg = useColorModeValue("gray.50", "gray.750");
  const uploadBdr   = useColorModeValue("#fca5a5", "#c53030");

  // ── Fetch ────────────────────────────────────────────────────────────────
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
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [canRead]);

  if (!canRead) return (
    <Box p={6}>
      <Alert status="error" borderRadius="md">
        <AlertIcon /><AlertDescription>No permission to view issues.</AlertDescription>
      </Alert>
    </Box>
  );

  // ── Filter + paginate ─────────────────────────────────────────────────────
  const filteredIssues = selectedProject
    ? issues.filter(i => i.project?._id === selectedProject._id)
    : issues;
  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginated  = filteredIssues.slice(startIndex, startIndex + pageSize);

  // ── Mention helpers ───────────────────────────────────────────────────────
  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    if (val && !SAFE_DESC.test(val)) return;
    setForm(p => ({ ...p, description: val }));
    setErrors(p => ({ ...p, description: undefined }));
    const caret = e.target.selectionStart;
    const atIdx = val.slice(0, caret).lastIndexOf("@");
    if (atIdx !== -1) {
      const query = val.slice(0, caret).slice(atIdx + 1);
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

  const insertMention = (s) => {
    const before = form.description.slice(0, mentionPos);
    const after  = form.description.slice(textareaRef.current.selectionStart);
    setForm(p => ({ ...p, description: `${before}@${s.name} ${after}` }));
    setMentions(prev => [...new Set([...prev, s.name])]);
    setMentionOpen(false);
    textareaRef.current.focus();
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())                      e.name        = "Issue name is required.";
    else if (!SAFE_NAME.test(form.name))        e.name        = "No special characters allowed.";
    if (!form.description.trim())               e.description = "Description is required.";
    else if (!SAFE_DESC.test(form.description)) e.description = "No special characters allowed.";
    if (!form.assignee)                         e.assignee    = "Assignee is required.";
    if (!form.dueDate)                          e.dueDate     = "Due date is required.";
    return e;
  };

  const resetModal = () => {
    setForm({ ...emptyForm, createdDate: todayStr() });
    setEditingId(null); setErrors({});
    setMentions([]); setMentionOpen(false); setMentionQuery("");
  };

  const handleNewIssueClick = () => {
    if (!selectedProject) {
      setShowProjectAlert(true);
      setTimeout(() => setShowProjectAlert(false), 4000);
      return;
    }
    setShowProjectAlert(false); resetModal(); onOpen();
  };

  const handleOpen = (issue) => {
    setForm({
      name:        issue.name,
      description: issue.description,
      taskStatus:  issue.taskStatus?._id || "",
      assignee:    issue.assignee?._id || "",
      priority:    issue.priority || "medium",
      issueType:   "bug",
      severity:    issue.severity || "minor",
      dueDate:     issue.dueDate ? issue.dueDate.split("T")[0] : "",
      createdDate: issue.createdDate ? issue.createdDate.split("T")[0] : todayStr(),
    });
    setEditingId(issue._id); setErrors({});
    setMentions([]); setMentionOpen(false); onOpen();
  };

  // ── Save ──────────────────────────────────────────────────────────────────
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
      onClose(); resetModal();
    } catch {
      toast({ title: "Failed to save issue", status: "error", duration: 2000 });
    } finally { setSaving(false); }
  };

  // ── Delete single ─────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tasks/${deleteId}`);
      setIssues(prev => prev.filter(i => i._id !== deleteId));
      toast({ title: "Issue deleted", status: "info", duration: 2000 });
      onDeleteClose(); setDeleteId(null);
    } catch {
      toast({ title: "Failed to delete", status: "error", duration: 2000 });
    } finally { setDeleting(false); }
  };

  // ── Delete all ────────────────────────────────────────────────────────────
  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL issues? This cannot be undone.")) return;
    setDeletingAll(true); setDeleteAllMsg("");
    try {
      const res = await api.delete("/tasks/issues/all");
      setIssues([]);
      setDeleteAllMsg("deleted:" + res.data.deleted);
    } catch {
      setDeleteAllMsg("error");
    } finally { setDeletingAll(false); }
  };

  // ── Bulk: reset ───────────────────────────────────────────────────────────
  const resetBulk = () => {
    setBulkFileName(""); setBulkFileReady(false); setBulkParseError("");
    setBulkRowCount(0); setBulkSkipped(0);
    setBulkUploading(false); setBulkTotalCreated(0); setBulkTotalFailed(0);
    setBulkDone(false); setBulkProgress(0); setBulkUnmatched([]); setBulkDuplicates(0);
    if (progressTimer.current) clearInterval(progressTimer.current);
    parsedRef.current = [];
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
  };

  // ── Bulk: parse ───────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    resetBulk();
    setBulkFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb  = XLSX.read(evt.target.result, { type: "binary" });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

        let valid = 0, skipped = 0;
        const rows = [];

        for (const row of raw) {
          const norm = {};
          Object.keys(row).forEach(k => { norm[k.trim().toLowerCase()] = row[k]; });

          const name     = String(norm["name"] || norm["title"] || norm["issue name"] || "").trim();
          const desc     = String(norm["description"] || norm["desc"] || "").trim();
          const assign   = String(norm["assignee"] || norm["assigned to"] || norm["staff"] || "").trim();
          const status   = String(norm["status"] || norm["task status"] || "").trim();
          const priority = String(norm["priority"] || "medium").toLowerCase().trim();
          const severity = String(norm["severity"] || "minor").toLowerCase().trim();
          const dueDateVal = norm["due date"] || norm["duedate"] || norm["due"] || "";

          if (!name || !assign) { skipped++; continue; }

          let parsedDue = "";
          if (dueDateVal) {
            if (typeof dueDateVal === "number") {
              parsedDue = new Date(Math.round((dueDateVal - 25569) * 86400 * 1000)).toISOString().split("T")[0];
            } else {
              const d = new Date(dueDateVal);
              parsedDue = isNaN(d) ? "" : d.toISOString().split("T")[0];
            }
          }

          rows.push({
            name, description: desc,
            assigneeName: assign,
            statusName:   status,
            priority:  ["low","medium","high","critical"].includes(priority) ? priority : "medium",
            severity:  ["minor","moderate","major","critical"].includes(severity) ? severity : "minor",
            issueType: "bug",
            dueDate:   parsedDue || null,
          });
          valid++;
        }

        if (valid === 0) {
          setBulkParseError("No valid rows found. Check that the file has name and assignee columns.");
          return;
        }

        parsedRef.current = rows;
        setBulkRowCount(valid);
        setBulkSkipped(skipped);
        setBulkFileReady(true);
      } catch {
        setBulkParseError("Failed to parse file. Make sure it's a valid .xlsx or .xls file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ── Bulk upload — ONE API call, animated progress ────────────────────────
  // Single POST with ALL rows. MongoDB insertMany handles 200k rows in ~1-2s.
  // Progress bar animates 0→95 while waiting, snaps to 100 on response.
  const handleBulkUpload = async () => {
    const rows = parsedRef.current;
    if (!rows.length) return;

    if (progressTimer.current) clearInterval(progressTimer.current);
    setBulkUploading(true);
    setBulkDone(false);
    setBulkTotalCreated(0);
    setBulkTotalFailed(0);
    setBulkProgress(0);

    // Animate 0 → 95 smoothly. Estimated time: ~2s for 200k rows.
    // Steps: every 30ms, increment so we reach 95 in ~2s = 66 steps → +1.43/step
    let animPct = 0;
    progressTimer.current = setInterval(() => {
      animPct = Math.min(animPct + 1.43, 95);
      setBulkProgress(+animPct.toFixed(1));
      if (animPct >= 95) clearInterval(progressTimer.current);
    }, 30);

    try {
      const res = await api.post("/tasks/issues/bulk", {
        issues:  rows,
        project: selectedProject?._id || null,
      });
      clearInterval(progressTimer.current);
      setBulkProgress(100);
      setBulkTotalCreated(res.data.created || 0);
      setBulkTotalFailed(res.data.failed   || 0);
      setBulkUnmatched(res.data.unmatchedAssignees || []);
      setBulkDuplicates(res.data.duplicates || 0);
      // Refresh list silently
      api.get("/tasks/issues/all").then(r => setIssues(r.data || [])).catch(() => {});
    } catch {
      clearInterval(progressTimer.current);
      setBulkProgress(100);
      setBulkTotalFailed(rows.length);
    }

    setBulkUploading(false);
    setBulkDone(true);
  };

  // ── Download sample ───────────────────────────────────────────────────────
  const downloadSample = () => {
    const sample = [
      { name: "Login button not working", description: "Nothing happens on Safari",  assignee: "John Doe",   status: "Pending",     priority: "high",     severity: "major",    "due date": "2026-04-15" },
      { name: "Dashboard crashes",        description: "TypeError in useEffect",      assignee: "Jane Smith", status: "In Progress", priority: "critical", severity: "critical", "due date": "2026-04-10" },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Issues");
    XLSX.writeFile(wb, "bulk_issues_sample.xlsx");
  };

  if (loading) return (
    <Flex justify="center" py={20}><Spinner size="xl" color="red.500" /></Flex>
  );

  const priorityOpts = ["low", "medium", "high", "critical"];
  const severityOpts = ["minor", "moderate", "major", "critical"];

  return (
    <Box>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
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
                  ? `📁 ${selectedProject.name} · ${filteredIssues.length} issues`
                  : `All projects · ${issues.length} issues`}
              </Text>
            </Box>
          </Flex>
          {canCreate && (
            <HStack spacing={2}>
              <Button leftIcon={<MdUploadFile size={16} />} colorScheme="gray" variant="outline" size="sm"
                onClick={() => { resetBulk(); onBulkOpen(); }}>
                Bulk Upload
              </Button>
              <Button leftIcon={<MdDeleteSweep size={17} />} colorScheme="red" variant="outline" size="sm"
                onClick={handleDeleteAll} isLoading={deletingAll} loadingText="Deleting…">
                Delete All
              </Button>
              <Button leftIcon={<MdAdd />} colorScheme="red" size="sm" onClick={handleNewIssueClick}>
                New Issue
              </Button>
            </HStack>
          )}
        </Flex>
      </Box>

      {/* ── ALERTS ──────────────────────────────────────────────────────── */}
      {showProjectAlert && (
        <Alert status="warning" borderRadius="xl" mb={4}>
          <AlertIcon />
          <AlertDescription fontWeight="500">Please select a project before creating an issue.</AlertDescription>
        </Alert>
      )}
      {deleteAllMsg && (
        <Alert status={deleteAllMsg.startsWith("deleted") ? "info" : "error"} borderRadius="xl" mb={4}>
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {deleteAllMsg.startsWith("deleted")
              ? `Deleted ${deleteAllMsg.split(":")[1]} issue(s) successfully.`
              : "Failed to delete issues."}
          </AlertDescription>
        </Alert>
      )}

      {/* ── EMPTY STATES ────────────────────────────────────────────────── */}
      {selectedProject && filteredIssues.length === 0 && (
        <Flex direction="column" align="center" justify="center" py={16}
          bg="green.50" borderRadius="xl" border="1px solid" borderColor="green.200"
          _dark={{ bg: "green.900", borderColor: "green.600" }}>
          <MdCheckCircle size={52} color="#38a169" />
          <Heading size="md" color="green.700" _dark={{ color: "green.200" }} mt={3}>No Bugs Found</Heading>
          <Text fontSize="sm" color="green.600" _dark={{ color: "green.300" }} mt={1}>
            No issues for {selectedProject.name}
          </Text>
          {canCreate && (
            <Button mt={4} size="sm" colorScheme="red" leftIcon={<MdAdd />} onClick={handleNewIssueClick}>
              Report an Issue
            </Button>
          )}
        </Flex>
      )}
      {!selectedProject && issues.length === 0 && (
        <Flex direction="column" align="center" py={20} color={subColor}>
          <MdBugReport size={48} /><Text fontSize="sm" mt={2}>No issues found</Text>
        </Flex>
      )}

      {/* ── TABLE ───────────────────────────────────────────────────────── */}
      {filteredIssues.length > 0 && (
        <Box bg={cardBg} borderRadius="xl" boxShadow="md" border={`1px solid ${borderColor}`} overflow="hidden">
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}>
                <Tr>
                  {["#","Issue","Priority","Severity","Status","Assignee","Project","Created","Due Date",
                    ...(canUpdate || canDelete ? ["Actions"] : [])].map(h => (
                    <Th key={h} color={theadColor} fontSize="xs" py={3}
                      textAlign={h === "Actions" ? "right" : "left"}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {paginated.map((issue, idx) => (
                  <Tr key={issue._id} bg={idx % 2 === 0 ? rowEven : rowOdd}
                    _hover={{ bg: rowHover }} transition="background 0.15s">
                    <Td color={subColor} fontSize="xs">{startIndex + idx + 1}</Td>
                    <Td py={3} maxW="220px">
                      <Badge colorScheme="red" borderRadius="full" fontSize="9px" px={2} mb={1}>bug</Badge>
                      <Text fontWeight="600" fontSize="sm" color={textColor} noOfLines={1}>{issue.name}</Text>
                      <Text fontSize="xs" color={subColor} noOfLines={1}>{issue.description}</Text>
                    </Td>
                    <Td>{issue.priority && <Badge colorScheme={priorityColors[issue.priority]} borderRadius="full" fontSize="xs" px={2} textTransform="capitalize">{issue.priority}</Badge>}</Td>
                    <Td>{issue.severity && <Badge colorScheme={severityColors[issue.severity]} borderRadius="full" fontSize="xs" px={2} textTransform="capitalize">{issue.severity}</Badge>}</Td>
                    <Td>{issue.taskStatus?.name && <Badge colorScheme={statusColorScheme(issue.taskStatus.name)} borderRadius="full" fontSize="xs" px={2}>{issue.taskStatus.name}</Badge>}</Td>
                    <Td>
                      <Flex align="center" gap={2}>
                        <Avatar name={issue.assignee?.name} size="xs" bg="red.400" color="white" />
                        <Text fontSize="xs" color={textColor} whiteSpace="nowrap">{issue.assignee?.name}</Text>
                      </Flex>
                    </Td>
                    <Td><Text fontSize="xs" color={subColor} noOfLines={1}>{issue.project?.name ? `📁 ${issue.project.name}` : "—"}</Text></Td>
                    <Td><Text fontSize="xs" color={subColor} whiteSpace="nowrap">{new Date(issue.createdDate || issue.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text></Td>
                    <Td>
                      <Text fontSize="xs" whiteSpace="nowrap"
                        color={issue.dueDate && new Date(issue.dueDate) < new Date() ? "red.500" : subColor}
                        fontWeight={issue.dueDate && new Date(issue.dueDate) < new Date() ? "600" : "400"}>
                        {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </Text>
                    </Td>
                    {(canUpdate || canDelete) && (
                      <Td textAlign="right">
                        <Flex justify="flex-end" gap={1}>
                          {canUpdate && <Tooltip label="Edit"><IconButton icon={<MdEdit />} size="xs" colorScheme="blue" variant="ghost" aria-label="Edit" onClick={() => handleOpen(issue)} /></Tooltip>}
                          {canDelete && <Tooltip label="Delete"><IconButton icon={<MdDelete />} size="xs" colorScheme="red" variant="ghost" aria-label="Delete" onClick={() => { setDeleteId(issue._id); onDeleteOpen(); }} /></Tooltip>}
                        </Flex>
                      </Td>
                    )}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          <Flex px={4} py={3} justify="space-between" align="center" borderTop={`1px solid ${borderColor}`}>
            <Text fontSize="sm" color={subColor}>{`${startIndex + 1}–${Math.min(startIndex + pageSize, filteredIssues.length)} of ${filteredIssues.length}`}</Text>
            <HStack spacing={2}>
              <Text fontSize="sm" color={textColor}>Rows</Text>
              <Select size="sm" w="72px" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
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

      {/* ── MODAL: Create / Edit ─────────────────────────────────────────── */}
      {(canCreate || canUpdate) && (
        <Modal isOpen={isOpen} onClose={() => { onClose(); resetModal(); }} isCentered size="lg">
          <ModalOverlay /><ModalContent bg={cardBg}>
            <ModalHeader color={textColor}>
              <Flex align="center" gap={2}><MdBugReport />{editingId ? "Edit Issue" : "New Issue"}</Flex>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={3} align="stretch">
                {selectedProject && (
                  <Box p={3} bg={projBlueBg} borderRadius="lg" border={`1px solid ${projBlueBdr}`}>
                    <Text fontSize="xs" color={projBlueClr} fontWeight="600">📁 {selectedProject.name}</Text>
                  </Box>
                )}
                <FormControl isInvalid={!!errors.name}>
                  <FormLabel fontSize="sm" color={textColor}>Issue Name *</FormLabel>
                  <Input placeholder="e.g. Login button not responding" value={form.name}
                    onChange={e => { if (e.target.value && !SAFE_NAME.test(e.target.value)) return; setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: undefined })); }} />
                  <FormErrorMessage>{errors.name}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.description}>
                  <FormLabel fontSize="sm" color={textColor} mb={1}>Description * <Text as="span" fontSize="xs" color={subColor}>(@ to mention)</Text></FormLabel>
                  <Box position="relative">
                    <Textarea ref={textareaRef} value={form.description} onChange={handleDescriptionChange} rows={4} placeholder="Describe the issue in detail..." />
                    {mentionOpen && filteredStaff.length > 0 && (
                      <Box position="absolute" top="100%" left={0} zIndex={100} bg={dropdownBg} border={`1px solid ${dropBorder}`} borderRadius="md" boxShadow="lg" maxH="160px" overflowY="auto" w="220px" mt={1}>
                        {filteredStaff.map(s => (
                          <Flex key={s._id} px={3} py={2} align="center" gap={2} cursor="pointer" _hover={{ bg: dropHover }}
                            onMouseDown={e => { e.preventDefault(); insertMention(s); }}>
                            <Box w="24px" h="24px" borderRadius="full" bg="red.400" color="white" display="flex" alignItems="center" justifyContent="center" fontSize="10px" fontWeight="bold">{s.name.charAt(0).toUpperCase()}</Box>
                            <Text fontSize="sm" color={textColor}>{s.name}</Text>
                          </Flex>
                        ))}
                      </Box>
                    )}
                  </Box>
                  {mentions.length > 0 && <Flex gap={2} mt={2} wrap="wrap">{mentions.map(m => <Badge key={m} colorScheme="red" borderRadius="full" px={2} fontSize="xs">@{m}</Badge>)}</Flex>}
                  <FormErrorMessage>{errors.description}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.assignee}>
                  <FormLabel fontSize="sm" color={textColor}>Assignee *</FormLabel>
                  <Select placeholder="Select assignee" value={form.assignee} onChange={e => { setForm(p => ({ ...p, assignee: e.target.value })); setErrors(p => ({ ...p, assignee: undefined })); }}>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Select>
                  <FormErrorMessage>{errors.assignee}</FormErrorMessage>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" color={textColor}>Status</FormLabel>
                  <Select placeholder="Select status" value={form.taskStatus} onChange={e => setForm(p => ({ ...p, taskStatus: e.target.value }))}>
                    {statuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Select>
                </FormControl>
                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <FormControl>
                    <FormLabel fontSize="sm" color={textColor}>Priority</FormLabel>
                    <Select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                      {priorityOpts.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" color={textColor}>Severity</FormLabel>
                    <Select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                      {severityOpts.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <FormControl>
                    <FormLabel fontSize="xs" color={subColor} mb={1}>Created Date</FormLabel>
                    <Input type="date" value={form.createdDate} isReadOnly bg={readOnlyBg} cursor="not-allowed" opacity={0.7} />
                  </FormControl>
                  <FormControl isInvalid={!!errors.dueDate}>
                    <FormLabel fontSize="xs" color={subColor} mb={1}>Due Date *</FormLabel>
                    <Input type="date" value={form.dueDate} min={form.createdDate} onChange={e => { setForm(p => ({ ...p, dueDate: e.target.value })); setErrors(p => ({ ...p, dueDate: undefined })); }} />
                    <FormErrorMessage>{errors.dueDate}</FormErrorMessage>
                  </FormControl>
                </Grid>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => { onClose(); resetModal(); }}>Cancel</Button>
              <Button colorScheme="red" isLoading={saving} onClick={handleSave}>{editingId ? "Update Issue" : "Create Issue"}</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* ── MODAL: Delete ────────────────────────────────────────────────── */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered size="sm">
        <ModalOverlay /><ModalContent bg={cardBg} borderRadius="xl">
          <ModalHeader fontSize="md" color={textColor}>Delete Issue</ModalHeader>
          <ModalBody fontSize="sm" color={subColor}>Are you sure? This cannot be undone.</ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={onDeleteClose}>Cancel</Button>
            <Button size="sm" colorScheme="red" isLoading={deleting} loadingText="Deleting…" onClick={handleDeleteConfirm}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: Bulk Upload
      ══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => { if (!bulkUploading) { onBulkClose(); resetBulk(); } }}
        isCentered size="md"
        closeOnOverlayClick={!bulkUploading}
      >
        <ModalOverlay backdropFilter="blur(2px)" />
        <ModalContent bg={cardBg} borderRadius="2xl" overflow="hidden">

          {/* ── Header ──────────────────────────────────────────────── */}
          <ModalHeader p={0}>
            <Flex align="center" gap={3} px={6} py={4} borderBottom={`1px solid ${borderColor}`}>
              <Box bg="green.100" p={2} borderRadius="xl" _dark={{ bg: "green.900" }}>
                <MdUploadFile size={20} color="#38a169" />
              </Box>
              <Box>
                <Text fontSize="md" fontWeight="700" color={textColor}>Bulk Upload Issues</Text>
                <Text fontSize="xs" color={subColor}>Upload thousands of issues instantly</Text>
              </Box>
            </Flex>
          </ModalHeader>
          {!bulkUploading && <ModalCloseButton top={4} right={4} />}

          <ModalBody px={6} py={5}>
            <VStack spacing={4} align="stretch">

              {/* Project tag */}
              {selectedProject ? (
                <Box px={3} py={2} bg={projBlueBg} borderRadius="lg" border={`1px solid ${projBlueBdr}`}>
                  <Text fontSize="xs" color={projBlueClr} fontWeight="600">📁 {selectedProject.name}</Text>
                </Box>
              ) : (
                <Alert status="warning" borderRadius="lg" py={2}>
                  <AlertIcon />
                  <AlertDescription fontSize="xs">No project selected — issues will be created without one.</AlertDescription>
                </Alert>
              )}

              {/* ── Drop zone ─────────────────────────────────────── */}
              {!bulkUploading && !bulkDone && (
                <Box
                  onClick={() => bulkFileInputRef.current?.click()}
                  cursor="pointer"
                  p={8}
                  borderRadius="xl"
                  border="2px dashed"
                  borderColor={bulkFileName ? "green.400" : "gray.300"}
                  bg={bulkFileName
                    ? useColorModeValue("green.50", "green.900")
                    : uploadBoxBg}
                  textAlign="center"
                  transition="all 0.2s"
                  _hover={{ borderColor: "green.400", bg: useColorModeValue("green.50", "green.900") }}
                >
                  <MdUploadFile
                    size={40}
                    color={bulkFileName ? "#38a169" : "#a0aec0"}
                    style={{ margin: "0 auto 8px" }}
                  />
                  <Text fontWeight="600" fontSize="sm" color={bulkFileName ? "green.600" : textColor} mb={1}>
                    {bulkFileName ? `📄 ${bulkFileName}` : "Click to choose .xlsx or .xls file"}
                  </Text>
                  <Text fontSize="xs" color={subColor}>
                    Required: <b>name</b>, <b>assignee</b>
                    &nbsp;·&nbsp;
                    Optional: description, status, priority, severity, due date
                  </Text>
                  <Input
                    ref={bulkFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    display="none"
                    onChange={handleFileChange}
                  />
                </Box>
              )}

              {/* Parse error */}
              {bulkParseError && (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  <AlertDescription fontSize="sm">{bulkParseError}</AlertDescription>
                </Alert>
              )}

              {/* ── File ready summary ────────────────────────────── */}
              {bulkFileReady && !bulkUploading && !bulkDone && (
                <Box
                  p={4} borderRadius="xl"
                  border="1px solid"
                  borderColor="green.200"
                  bg={useColorModeValue("green.50", "green.900")}
                >
                  <HStack spacing={2} mb={1}>
                    <Badge colorScheme="green" borderRadius="full" px={3} py={1} fontSize="xs">
                      ✅ {bulkRowCount.toLocaleString()} rows ready
                    </Badge>
                    {bulkSkipped > 0 && (
                      <Badge colorScheme="orange" borderRadius="full" px={3} py={1} fontSize="xs">
                        ⚠ {bulkSkipped.toLocaleString()} skipped
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="xs" color="green.700" _dark={{ color: "green.300" }}>
                    Single request · MongoDB bulk insert · ~1–2s for 200k rows
                  </Text>
                  {bulkSkipped > 0 && (
                    <Text fontSize="xs" color="orange.600" mt={1}>
                      Skipped rows are missing a name or assignee column.
                    </Text>
                  )}
                </Box>
              )}

              {/* ── Progress bar ──────────────────────────────────── */}
              {bulkUploading && (
                <Box
                  p={5} borderRadius="xl"
                  border="1px solid"
                  borderColor="green.200"
                  bg={useColorModeValue("green.50", "green.900")}
                >
                  <Flex justify="space-between" align="center" mb={1}>
                    <Text fontSize="sm" fontWeight="700" color="green.700" _dark={{ color: "green.200" }}>
                      Uploading {bulkRowCount.toLocaleString()} issues…
                    </Text>
                    <Text fontSize="xl" fontWeight="800" color="green.600">
                      {Math.round(bulkProgress)}%
                    </Text>
                  </Flex>
                  <Text fontSize="xs" color="green.600" _dark={{ color: "green.400" }} mb={3}>
                    Sending to server — please wait
                  </Text>
                  <Progress
                    value={bulkProgress}
                    size="lg"
                    colorScheme="green"
                    borderRadius="full"
                    hasStripe
                    isAnimated
                    sx={{ "& > div": { transition: "width 0.05s linear" } }}
                  />
                  <Text fontSize="xs" color="green.500" mt={2} textAlign="center" fontWeight="500">
                    ⚡ Fast bulk insert — all rows in one request
                  </Text>
                </Box>
              )}

              {/* ── Done ─────────────────────────────────────────── */}
              {bulkDone && (
                <Box
                  p={4} borderRadius="xl"
                  border="1px solid"
                  borderColor={bulkTotalCreated > 0 ? "green.200" : bulkUnmatched.length > 0 ? "red.200" : "orange.200"}
                  bg={useColorModeValue(
                    bulkTotalCreated > 0 ? "green.50" : bulkUnmatched.length > 0 ? "red.50" : "orange.50",
                    bulkTotalCreated > 0 ? "green.900" : bulkUnmatched.length > 0 ? "red.900" : "orange.900"
                  )}
                >
                  {/* Headline */}
                  <Text fontSize="sm" fontWeight="700"
                    color={
                      bulkTotalCreated > 0 ? "green.700"
                      : bulkUnmatched.length > 0 ? "red.600"
                      : "orange.600"
                    }
                    _dark={{
                      color: bulkTotalCreated > 0 ? "green.200"
                        : bulkUnmatched.length > 0 ? "red.200"
                        : "orange.200"
                    }}
                    mb={2}
                  >
                    {bulkTotalCreated > 0
                      ? `✅ ${bulkTotalCreated.toLocaleString()} issue${bulkTotalCreated !== 1 ? "s" : ""} uploaded successfully!`
                      : bulkUnmatched.length > 0
                        ? "❌ Upload failed — assignee names not found in Staff"
                        : "⚠️ All rows already exist in database"}
                  </Text>

                  {/* Stat badges */}
                  <HStack spacing={2} wrap="wrap" mb={bulkUnmatched.length > 0 || (bulkDuplicates > 0 && bulkTotalCreated === 0) ? 3 : 0}>
                    {bulkTotalCreated > 0 && (
                      <Badge colorScheme="green" borderRadius="full" px={2} py={1} fontSize="xs">
                        ✅ {bulkTotalCreated.toLocaleString()} created
                      </Badge>
                    )}
                    {bulkDuplicates > 0 && (
                      <Badge colorScheme="orange" borderRadius="full" px={2} py={1} fontSize="xs">
                        ⚠ {bulkDuplicates.toLocaleString()} duplicates
                      </Badge>
                    )}
                    {bulkTotalFailed > 0 && (
                      <Badge colorScheme="red" borderRadius="full" px={2} py={1} fontSize="xs">
                        ❌ {bulkTotalFailed.toLocaleString()} unmatched
                      </Badge>
                    )}
                  </HStack>

                  {/* Unmatched assignees */}
                  {bulkUnmatched.length > 0 && (
                    <Box p={3} bg="red.100" borderRadius="lg" _dark={{ bg: "red.800" }}>
                      <Text fontSize="xs" fontWeight="700" color="red.700" _dark={{ color: "red.200" }} mb={1}>
                        These names were not found in your Staff list:
                      </Text>
                      {bulkUnmatched.map(n => (
                        <Text key={n} fontSize="xs" color="red.600" _dark={{ color: "red.300" }} fontFamily="mono">
                          • "{n}"
                        </Text>
                      ))}
                      <Text fontSize="xs" color="red.500" mt={2} fontWeight="600">
                        Go to Staff → add these names exactly → re-upload
                      </Text>
                    </Box>
                  )}

                  {/* Duplicate hint */}
                  {bulkDuplicates > 0 && bulkTotalCreated === 0 && bulkUnmatched.length === 0 && (
                    <Text fontSize="xs" color="orange.700" _dark={{ color: "orange.300" }}>
                      Delete existing issues first, or upload a file with different issue names.
                    </Text>
                  )}

                  {bulkTotalCreated > 0 && (
                    <Text fontSize="xs" color="green.600" mt={1}>Issue list refreshed ✓</Text>
                  )}
                </Box>
              )}

            </VStack>
          </ModalBody>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <ModalFooter px={6} py={4} borderTop={`1px solid ${borderColor}`} gap={2}>
            <Button
              size="sm"
              leftIcon={<MdDownload size={14} />}
              variant="outline"
              onClick={downloadSample}
              isDisabled={bulkUploading}
            >
              Sample
            </Button>

            <Box flex={1} />

            {!bulkUploading && !bulkDone && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { onBulkClose(); resetBulk(); }}
              >
                Cancel
              </Button>
            )}

            {bulkDone && (
              <>
                <Button size="sm" variant="outline" onClick={resetBulk}>
                  Upload Another
                </Button>
                <Button
                  size="sm"
                  colorScheme="green"
                  onClick={() => { onBulkClose(); resetBulk(); }}
                >
                  Done
                </Button>
              </>
            )}

            {bulkFileReady && !bulkUploading && !bulkDone && (
              <Button
                colorScheme="green"
                size="sm"
                leftIcon={<MdUploadFile size={14} />}
                onClick={handleBulkUpload}
              >
                Upload {bulkRowCount.toLocaleString()} Issues
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}