import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box, Flex, Heading, Text, Badge, Avatar, Spinner, Button,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, useDisclosure, Input, Textarea, Select,
  useToast, IconButton, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Grid, Tooltip, Alert, AlertIcon, AlertDescription,
  useColorModeValue, FormControl, FormErrorMessage, FormLabel,
  HStack, VStack, Progress,
} from "@chakra-ui/react";
import {
  MdAdd, MdDelete, MdEdit, MdBugReport, MdCheckCircle,
  MdUploadFile, MdDownload, MdDeleteSweep, MdCloudUpload,
} from "react-icons/md";
import * as XLSX from "xlsx";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

// ─── constants ────────────────────────────────────────────────────────────────
const priorityColors    = { low:"green", medium:"yellow", high:"orange", critical:"red" };
const severityColors    = { minor:"green", moderate:"yellow", major:"orange", critical:"red" };
const statusColor = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("done") || n.includes("complete") || n.includes("closed")) return "green";
  if (n.includes("progress") || n.includes("active")) return "blue";
  if (n.includes("review")   || n.includes("test"))   return "purple";
  if (n.includes("block")    || n.includes("hold"))   return "red";
  return "gray";
};
const SAFE_NAME         = /^[a-zA-Z0-9 .,\-_:!?()\n\r]*$/;
const SAFE_DESC         = /^[a-zA-Z0-9 .,\-_:!?()@#/\n\r]*$/;
const todayStr          = () => new Date().toISOString().split("T")[0];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const VALID_PRIORITY    = ["low","medium","high","critical"];
const VALID_SEVERITY    = ["minor","moderate","major","critical"];
const MAX_CHUNK_BYTES = 3 * 1024 * 1024; // 3MB per chunk — safe for devtunnel's ~4MB limit
const PARALLEL        = 5;               // chunks sent simultaneously
const EMPTY = {
  name:"", description:"", taskStatus:"", assignee:"",
  priority:"medium", issueType:"bug", severity:"minor",
  dueDate:"", createdDate: todayStr(),
};

export default function IssuesPage() {

  // ── data ──────────────────────────────────────────────────────────────────
  const [issues,      setIssues]      = useState([]);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [limit,       setLimit]       = useState(50);
  const [staff,       setStaff]       = useState([]);
  const [statuses,    setStatuses]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [fetchError,  setFetchError]  = useState("");

  // ── form ──────────────────────────────────────────────────────────────────
  const [form,   setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── delete single ─────────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── delete all ────────────────────────────────────────────────────────────
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteMsg,   setDeleteMsg]   = useState(null);

  // ── misc ──────────────────────────────────────────────────────────────────
  const [showAlert, setShowAlert] = useState(false);

  // ── mention ───────────────────────────────────────────────────────────────
  const [mQuery,   setMQuery]   = useState("");
  const [mOpen,    setMOpen]    = useState(false);
  const [mPos,     setMPos]     = useState(0);
  const [mentions, setMentions] = useState([]);
  const taRef = useRef(null);

  // ── bulk ──────────────────────────────────────────────────────────────────
  // HOW IT WORKS:
  //   1. User picks file → XLSX is parsed entirely on the client (fast, ~1-3s even for 10L rows)
  //   2. Click "Upload" → ONE api.post("/tasks/issues/bulk") with ALL parsed rows
  //   3. axios timeout: 0 (disabled) so even 20 crore rows won't time out
  //   4. Progress bar animates 0→90% while waiting; jumps to 100% on response
  //   5. On success → fetchPage() is called → table auto-refreshes, no manual refresh needed
  const [bulkFile,      setBulkFile]      = useState(null);
  const [bulkRows,      setBulkRows]      = useState(0);
  const [bulkReady,     setBulkReady]     = useState(false);
  const [bulkError,     setBulkError]     = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress,  setBulkProgress]  = useState(0);
  const [bulkResult,    setBulkResult]    = useState(null);
  const [bulkDone,      setBulkDone]      = useState(false);
  const bulkParsedRef  = useRef([]);  // stored in ref — no re-render on parse
  const progressRef    = useRef(null);
  const fileInputRef   = useRef(null);

  // ── modals ────────────────────────────────────────────────────────────────
  const { isOpen,                             onOpen,      onClose      } = useDisclosure();
  const { isOpen: isDel,   onOpen: onDelOpen,  onClose: onDelClose  } = useDisclosure();
  const { isOpen: isBulk,  onOpen: onBulkOpen, onClose: onBulkClose } = useDisclosure();

  const toast = useToast();
  const { user, hasPermission, selectedProject } = useAuth();
  const isAdmin   = user?.role?.name?.toLowerCase() === "admin";
  const canRead   = isAdmin || hasPermission("issues_read");
  const canCreate = isAdmin || hasPermission("issues_create");
  const canUpdate = isAdmin || hasPermission("issues_update");
  const canDelete = isAdmin || hasPermission("issues_delete");

  // ── theme ─────────────────────────────────────────────────────────────────
  const cardBg  = useColorModeValue("white","gray.800");
  const thead   = useColorModeValue("#fee2e2","#742a2a");
  const tColor  = useColorModeValue("gray.700","white");
  const text    = useColorModeValue("gray.800","white");
  const sub     = useColorModeValue("gray.500","gray.400");
  const erow    = useColorModeValue("white","gray.800");
  const orow    = useColorModeValue("gray.50","gray.750");
  const hrow    = useColorModeValue("red.50","gray.700");
  const border  = useColorModeValue("#e2e8f0","#4a5568");
  const iconBg  = useColorModeValue("red.100","red.900");
  const blueBg  = useColorModeValue("blue.50","blue.900");
  const blueBdr = useColorModeValue("#bee3f8","#2a4365");
  const blueClr = useColorModeValue("blue.700","blue.200");
  const roBg    = useColorModeValue("gray.50","gray.700");
  const ddBg    = useColorModeValue("white","gray.700");
  const ddBdr   = useColorModeValue("#e2e8f0","#4a5568");
  const ddHov   = useColorModeValue("red.50","gray.600");
  const upBg    = useColorModeValue("gray.50","gray.750");
  const grnBg   = useColorModeValue("green.50","green.900");

  // ── paginated fetch ───────────────────────────────────────────────────────
  const fetchPage = useCallback(async (pg = 1, lim = limit, projectId = null) => {
    setPageLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams({ page: pg, limit: lim });
      if (projectId) params.set("project", projectId);
      const res = await api.get(`/tasks/issues/all?${params}`);
      setIssues(res.data.issues ?? []);
      setTotal(res.data.total   ?? 0);
      setPages(res.data.pages   ?? 1);
      setPage(res.data.page     ?? 1);
    } catch (err) {
      setIssues([]); setTotal(0); setPages(1); setPage(1);
      setFetchError(err?.response?.data?.error || err?.message || "Failed to load issues.");
    } finally {
      setPageLoading(false);
    }
  }, [limit]);

  // ── mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canRead) { setLoading(false); return; }
    const pid = selectedProject?._id || null;
    Promise.all([
      api.get("/staff"),
      api.get("/task-status"),
      api.get(`/tasks/issues/all?page=1&limit=${limit}${pid ? `&project=${pid}` : ""}`),
    ]).then(([s, st, i]) => {
      setStaff(s.data     || []);
      setStatuses(st.data || []);
      setIssues(i.data.issues ?? []);
      setTotal(i.data.total   ?? 0);
      setPages(i.data.pages   ?? 1);
    }).catch(err => {
      setFetchError(err?.response?.data?.error || err?.message || "Failed to load issues.");
    }).finally(() => setLoading(false));
  }, [canRead]); // eslint-disable-line

  // ── re-fetch when project changes ─────────────────────────────────────────
  const prevProject = useRef(null);
  useEffect(() => {
    const newId = selectedProject?._id || null;
    if (prevProject.current === newId) return;
    prevProject.current = newId;
    if (!loading) fetchPage(1, limit, newId);
  }, [selectedProject, loading, fetchPage, limit]);

  if (!canRead) return (
    <Box p={6}><Alert status="error" borderRadius="md">
      <AlertIcon/><AlertDescription>No permission to view issues.</AlertDescription>
    </Alert></Box>
  );
  if (loading) return (
    <Flex justify="center" py={20}><Spinner size="xl" color="red.500"/></Flex>
  );

  const projectId = selectedProject?._id || null;
  const startIdx  = (page - 1) * limit;

  const goToPage = (pg) => {
    if (pg < 1 || pg > pages || pg === page) return;
    fetchPage(pg, limit, projectId);
  };

  // ── mention ───────────────────────────────────────────────────────────────
  const handleDesc = (e) => {
    const v = e.target.value;
    if (v && !SAFE_DESC.test(v)) return;
    setForm(p => ({...p, description: v}));
    setErrors(p => ({...p, description: undefined}));
    const c  = e.target.selectionStart;
    const at = v.slice(0, c).lastIndexOf("@");
    if (at !== -1 && !v.slice(at + 1, c).includes(" ")) {
      setMQuery(v.slice(at + 1, c).toLowerCase()); setMPos(at); setMOpen(true);
    } else setMOpen(false);
  };
  const fStaff = staff.filter(s => s.name.toLowerCase().includes(mQuery));
  const insertMention = (s) => {
    const before = form.description.slice(0, mPos);
    const after  = form.description.slice(taRef.current.selectionStart);
    setForm(p => ({...p, description: `${before}@${s.name} ${after}`}));
    setMentions(p => [...new Set([...p, s.name])]);
    setMOpen(false); taRef.current.focus();
  };

  // ── validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())                       e.name        = "Issue name is required.";
    else if (!SAFE_NAME.test(form.name))         e.name        = "No special characters.";
    if (!form.description.trim())                e.description = "Description is required.";
    else if (!SAFE_DESC.test(form.description))  e.description = "No special characters.";
    if (!form.assignee)                          e.assignee    = "Assignee is required.";
    if (!form.dueDate)                           e.dueDate     = "Due date is required.";
    return e;
  };

  const resetModal = () => {
    setForm({...EMPTY, createdDate: todayStr()});
    setEditId(null); setErrors({});
    setMentions([]); setMOpen(false); setMQuery("");
  };

  const openNew = () => {
    if (!selectedProject) { setShowAlert(true); setTimeout(() => setShowAlert(false), 4000); return; }
    setShowAlert(false); resetModal(); onOpen();
  };

  const openEdit = (issue) => {
    setForm({
      name:        issue.name,
      description: issue.description,
      taskStatus:  issue.taskStatus?._id || "",
      assignee:    issue.assignee?._id   || "",
      priority:    issue.priority        || "medium",
      issueType:   "bug",
      severity:    issue.severity        || "minor",
      dueDate:     issue.dueDate     ? issue.dueDate.split("T")[0]     : "",
      createdDate: issue.createdDate ? issue.createdDate.split("T")[0] : todayStr(),
    });
    setEditId(issue._id); setErrors({});
    setMentions([]); setMOpen(false); onOpen();
  };

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {...form, issueType:"bug", project: projectId};
      if (editId) {
        const res = await api.put(`/tasks/issues/${editId}`, payload);
        setIssues(p => p.map(i => i._id === editId ? res.data : i));
        toast({title:"Issue updated!", status:"success", duration:2000});
      } else {
        await api.post("/tasks/issues/create", payload);
        toast({title:"Issue created!", status:"success", duration:2000});
        fetchPage(1, limit, projectId);
      }
      onClose(); resetModal();
    } catch { toast({title:"Failed to save", status:"error", duration:2000}); }
    finally { setSaving(false); }
  };

  // ── delete single ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tasks/${deleteId}`);
      const remaining = issues.filter(i => i._id !== deleteId);
      if (remaining.length === 0 && page > 1) fetchPage(page - 1, limit, projectId);
      else { setIssues(remaining); setTotal(t => t - 1); }
      toast({title:"Deleted", status:"info", duration:2000});
      onDelClose(); setDeleteId(null);
    } catch { toast({title:"Failed to delete", status:"error", duration:2000}); }
    finally { setDeleting(false); }
  };

  // ── delete all ────────────────────────────────────────────────────────────
  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL issues? This cannot be undone.")) return;
    setDeletingAll(true); setDeleteMsg(null);
    try {
      const res = await api.delete("/tasks/issues/all");
      setIssues([]); setTotal(0); setPages(1); setPage(1);
      setDeleteMsg({ type:"info", text:`Deleted ${res.data.deleted.toLocaleString()} issue(s).` });
    } catch {
      setDeleteMsg({ type:"error", text:"Failed to delete all issues." });
    } finally { setDeletingAll(false); }
  };

  // ── bulk: reset ───────────────────────────────────────────────────────────
  const resetBulk = () => {
    clearInterval(progressRef.current);
    bulkParsedRef.current = [];
    setBulkFile(null); setBulkRows(0);
    setBulkReady(false); setBulkError("");
    setBulkUploading(false); setBulkProgress(0);
    setBulkResult(null); setBulkDone(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── bulk: pick file → ONLY count rows, no parse (instant, no UI freeze) ──
  // Parsing is deferred to upload time so picking the file is always instant
  // regardless of file size (10 rows or 10 lakh rows).
  const handleFilePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    resetBulk();
    setBulkFile(file);

    // Fast row count only — no full parse
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb  = XLSX.read(evt.target.result, { type:"binary", sheetRows: 0 });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const ref = ws["!ref"];
        if (!ref) { setBulkError("Empty sheet."); setBulkFile(null); return; }
        const rowCount = XLSX.utils.decode_range(ref).e.r; // header row excluded
        if (rowCount < 1) { setBulkError("No data rows found."); setBulkFile(null); return; }
        setBulkRows(rowCount);
        setBulkReady(true);
      } catch {
        setBulkError("Cannot read file. Must be a valid .xlsx or .xls file.");
        setBulkFile(null);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ── bulk: upload — parse at click time + chunked posts ───────────────────
  // Parse happens HERE (not on file pick) so picking a file is always instant.
  // Rows stored in ref (no re-render). Chunks of 2000 rows ≈ 80KB each —
  // safe for devtunnel's ~4MB limit. Auto-refreshes table when done.
  const handleBulkUpload = async () => {
    if (!bulkFile) return;

    setBulkUploading(true);
    setBulkDone(false);
    setBulkProgress(0);
    setBulkResult(null);

    // ── Step 1: parse file (shows "Parsing…" in progress bar) ──────────────
    let rows = [];
    try {
      const buf = await bulkFile.arrayBuffer();
      const wb  = XLSX.read(buf, { type:"array", dense:true });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval:"" });

      for (const row of raw) {
        const r = Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v])
        );
        const name   = String(r.name || r.title || r["issue name"] || "").trim();
        const assign = String(r.assignee || r["assigned to"] || r.staff || "").trim();
        if (!name || !assign) continue;

        const dv = r["due date"] || r.duedate || r.due || "";
        let dueDate = null;
        if (dv) {
          const d = typeof dv === "number"
            ? new Date(Math.round((dv - 25569) * 86400000))
            : new Date(dv);
          if (!isNaN(d)) dueDate = d.toISOString().split("T")[0];
        }
        const priority = String(r.priority || "medium").toLowerCase();
        const severity = String(r.severity  || "minor").toLowerCase();
        rows.push({
          name, assigneeName: assign,
          description: String(r.description || r.desc || "").trim(),
          statusName:  String(r.status || r["task status"] || "").trim(),
          priority:    VALID_PRIORITY.includes(priority) ? priority : "medium",
          severity:    VALID_SEVERITY.includes(severity) ? severity : "minor",
          issueType:   "bug", dueDate,
        });
      }
    } catch {
      setBulkResult({ created:0, failed:0, duplicates:0, unmatched:[],
        error:"Failed to parse file." });
      setBulkUploading(false); setBulkDone(true); return;
    }

    if (!rows.length) {
      setBulkResult({ created:0, failed:0, duplicates:0, unmatched:[],
        error:"No valid rows. Check 'name' and 'assignee' columns exist." });
      setBulkUploading(false); setBulkDone(true); return;
    }

    setBulkRows(rows.length); // update to actual parsed count
    bulkParsedRef.current = rows;

    // ── Step 2: build chunks dynamically by byte size ──────────────────────
    // Each chunk grows until adding the next row would exceed MAX_CHUNK_BYTES.
    // This works correctly for any data size — 10 rows or 10 crore rows —
    // and always sends the largest chunk that devtunnel can accept.
    const chunks = [];
    let current = [], currentBytes = 0;
    for (const row of rows) {
      const rowBytes = new TextEncoder().encode(JSON.stringify(row)).length;
      if (current.length > 0 && currentBytes + rowBytes > MAX_CHUNK_BYTES) {
        chunks.push(current);
        current = []; currentBytes = 0;
      }
      current.push(row);
      currentBytes += rowBytes;
    }
    if (current.length > 0) chunks.push(current);

    let totalCreated = 0, totalFailed = 0, totalDupes = 0, unmatched = [];
    let doneSoFar = 0;

    // ── Step 3: send chunks in parallel batches of PARALLEL ────────────────
    for (let i = 0; i < chunks.length; i += PARALLEL) {
      const batch = chunks.slice(i, i + PARALLEL);
      const results = await Promise.allSettled(
        batch.map(chunk =>
          api.post(
            "/tasks/issues/bulk",
            { issues: chunk, project: projectId || null },
            { timeout: 0 }
          )
        )
      );
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === "fulfilled") {
          totalCreated += r.value.data.created            || 0;
          totalFailed  += r.value.data.failed             || 0;
          totalDupes   += r.value.data.duplicates         || 0;
          if (r.value.data.unmatchedAssignees?.length)
            unmatched = [...new Set([...unmatched, ...r.value.data.unmatchedAssignees])];
        } else {
          totalFailed += batch[j].length;
        }
      }
      doneSoFar += batch.length;
      setBulkProgress(Math.round((doneSoFar / chunks.length) * 100));
    }

    setBulkResult({
      created: totalCreated, failed: totalFailed,
      duplicates: totalDupes, unmatched: unmatched.slice(0, 10),
    });

    // ── AUTO-LIST ───────────────────────────────────────────────────────────
    if (totalCreated > 0) fetchPage(1, limit, projectId);

    setBulkUploading(false);
    setBulkDone(true);
  };

  // ── sample xlsx download ──────────────────────────────────────────────────
  const downloadSample = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name:"Login button broken", description:"Fails on Safari",     assignee:"John Doe",   status:"Pending",     priority:"high",     severity:"major",    "due date":"2026-04-15" },
      { name:"Dashboard crash",     description:"TypeError useEffect", assignee:"Jane Smith", status:"In Progress", priority:"critical", severity:"critical", "due date":"2026-04-10" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Issues");
    XLSX.writeFile(wb, "bulk_issues_sample.xlsx");
  };

  const pOpts = ["low","medium","high","critical"];
  const sOpts = ["minor","moderate","major","critical"];

  const bulkPhaseLabel = (totalChunks) => {
    if (bulkProgress === 0)  return "Parsing file…";
    if (bulkProgress >= 100) return "Finalising…";
    const done = Math.round((bulkProgress / 100) * totalChunks);
    return `Batch ${done} of ${totalChunks} — ${PARALLEL} parallel uploads…`;
  };

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <Box>

      {/* ── HEADER ── */}
      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" mb={4}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Flex align="center" gap={3}>
            <Box bg={iconBg} p={3} borderRadius="lg"><MdBugReport size={26} color="#c53030"/></Box>
            <Box>
              <Heading size="md" color={text}>Issues</Heading>
              <Text fontSize="sm" color={sub}>
                {selectedProject
                  ? `📁 ${selectedProject.name} · ${total.toLocaleString()} issues`
                  : `All projects · ${total.toLocaleString()} issues`}
              </Text>
            </Box>
          </Flex>
          {canCreate && (
            <HStack spacing={2} flexWrap="wrap">
              <Button leftIcon={<MdUploadFile size={16}/>} colorScheme="gray" variant="outline" size="sm"
                onClick={() => { resetBulk(); onBulkOpen(); }}>Bulk Upload</Button>
              <Button leftIcon={<MdDeleteSweep size={17}/>} colorScheme="red" variant="outline" size="sm"
                onClick={handleDeleteAll} isLoading={deletingAll} loadingText="Deleting…">Delete All</Button>
              <Button leftIcon={<MdAdd/>} colorScheme="red" size="sm" onClick={openNew}>New Issue</Button>
            </HStack>
          )}
        </Flex>
      </Box>

      {/* ── ALERTS ── */}
      {showAlert && (
        <Alert status="warning" borderRadius="xl" mb={4}>
          <AlertIcon/>
          <AlertDescription fontWeight="500" flex={1}>Please select a project first.</AlertDescription>
          <Button size="xs" variant="ghost" onClick={() => setShowAlert(false)}>✕</Button>
        </Alert>
      )}
      {deleteMsg && (
        <Alert status={deleteMsg.type} borderRadius="xl" mb={4}>
          <AlertIcon/>
          <AlertDescription fontSize="sm" flex={1}>{deleteMsg.text}</AlertDescription>
          <Button size="xs" variant="ghost" onClick={() => setDeleteMsg(null)}>✕</Button>
        </Alert>
      )}
      {fetchError && (
        <Alert status="error" borderRadius="xl" mb={4}>
          <AlertIcon/>
          <AlertDescription fontSize="sm" flex={1}>{fetchError}</AlertDescription>
          <Button size="xs" colorScheme="red" variant="ghost"
            onClick={() => { setFetchError(""); fetchPage(1, limit, projectId); }}>Retry</Button>
        </Alert>
      )}

      {/* ── EMPTY ── */}
      {!fetchError && total === 0 && !pageLoading && (
        <Flex direction="column" align="center" justify="center" py={16}
          bg="green.50" borderRadius="xl" border="1px solid" borderColor="green.200"
          _dark={{bg:"green.900", borderColor:"green.600"}}>
          <MdCheckCircle size={52} color="#38a169"/>
          <Heading size="md" color="green.700" _dark={{color:"green.200"}} mt={3}>No Bugs Found</Heading>
          <Text fontSize="sm" color="green.600" mt={1}>
            {selectedProject
              ? `No issues for ${selectedProject.name} — try switching to "All Projects"`
              : "No issues yet"}
          </Text>
          {canCreate && (
            <Button mt={4} size="sm" colorScheme="red" leftIcon={<MdAdd/>} onClick={openNew}>
              Report an Issue
            </Button>
          )}
        </Flex>
      )}

      {/* ── TABLE ── */}
      {(total > 0 || pageLoading) && (
        <Box bg={cardBg} borderRadius="xl" boxShadow="md" border={`1px solid ${border}`} overflow="hidden">
          {pageLoading && <Progress size="xs" isIndeterminate colorScheme="red"/>}
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead bg={thead}>
                <Tr>
                  {["#","Issue","Priority","Severity","Status","Assignee","Project","Created","Due Date",
                    ...(canUpdate||canDelete ? ["Actions"] : [])].map(h => (
                    <Th key={h} color={tColor} fontSize="xs" py={3}
                      textAlign={h==="Actions"?"right":"left"}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {pageLoading
                  ? Array.from({length:5}).map((_,i) => (
                      <Tr key={i}>
                        {Array.from({length:9}).map((_,j) => (
                          <Td key={j}>
                            <Box h="12px" bg="gray.100" borderRadius="sm"
                              _dark={{bg:"gray.700"}} w={j===1?"140px":"60px"}/>
                          </Td>
                        ))}
                      </Tr>
                    ))
                  : issues.map((issue, idx) => (
                    <Tr key={issue._id} bg={idx%2===0?erow:orow}
                      _hover={{bg:hrow}} transition="background 0.15s">
                      <Td color={sub} fontSize="xs">{startIdx + idx + 1}</Td>
                      <Td py={3} maxW="220px">
                        <Badge colorScheme="red" borderRadius="full" fontSize="9px" px={2} mb={1}>bug</Badge>
                        <Text fontWeight="600" fontSize="sm" color={text} noOfLines={1}>{issue.name}</Text>
                        <Text fontSize="xs" color={sub} noOfLines={1}>{issue.description}</Text>
                      </Td>
                      <Td>
                        {issue.priority &&
                          <Badge colorScheme={priorityColors[issue.priority]} borderRadius="full"
                            fontSize="xs" px={2} textTransform="capitalize">{issue.priority}</Badge>}
                      </Td>
                      <Td>
                        {issue.severity &&
                          <Badge colorScheme={severityColors[issue.severity]} borderRadius="full"
                            fontSize="xs" px={2} textTransform="capitalize">{issue.severity}</Badge>}
                      </Td>
                      <Td>
                        {issue.taskStatus?.name &&
                          <Badge colorScheme={statusColor(issue.taskStatus.name)}
                            borderRadius="full" fontSize="xs" px={2}>{issue.taskStatus.name}</Badge>}
                      </Td>
                      <Td>
                        <Flex align="center" gap={2}>
                          <Avatar name={issue.assignee?.name} size="xs" bg="red.400" color="white"/>
                          <Text fontSize="xs" color={text} whiteSpace="nowrap">{issue.assignee?.name}</Text>
                        </Flex>
                      </Td>
                      <Td>
                        <Text fontSize="xs" color={sub} noOfLines={1}>
                          {issue.project?.name ? `📁 ${issue.project.name}` : "—"}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="xs" color={sub} whiteSpace="nowrap">
                          {new Date(issue.createdDate||issue.createdAt||Date.now())
                            .toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="xs" whiteSpace="nowrap"
                          color={issue.dueDate && new Date(issue.dueDate)<new Date() ? "red.500" : sub}
                          fontWeight={issue.dueDate && new Date(issue.dueDate)<new Date() ? "600" : "400"}>
                          {issue.dueDate
                            ? new Date(issue.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})
                            : "—"}
                        </Text>
                      </Td>
                      {(canUpdate||canDelete) && (
                        <Td textAlign="right">
                          <Flex justify="flex-end" gap={1}>
                            {canUpdate &&
                              <Tooltip label="Edit">
                                <IconButton icon={<MdEdit/>} size="xs" colorScheme="blue" variant="ghost"
                                  aria-label="Edit" onClick={() => openEdit(issue)}/>
                              </Tooltip>}
                            {canDelete &&
                              <Tooltip label="Delete">
                                <IconButton icon={<MdDelete/>} size="xs" colorScheme="red" variant="ghost"
                                  aria-label="Delete"
                                  onClick={() => { setDeleteId(issue._id); onDelOpen(); }}/>
                              </Tooltip>}
                          </Flex>
                        </Td>
                      )}
                    </Tr>
                  ))
                }
              </Tbody>
            </Table>
          </TableContainer>

          {/* ── PAGINATION ── */}
          <Flex px={4} py={3} justify="space-between" align="center"
            borderTop={`1px solid ${border}`} flexWrap="wrap" gap={2}>
            <Text fontSize="sm" color={sub} minW="140px">
              {total > 0
                ? `${(startIdx+1).toLocaleString()}–${Math.min(startIdx+limit,total).toLocaleString()} of ${total.toLocaleString()}`
                : "0 issues"}
            </Text>
            <HStack spacing={2}>
              <Text fontSize="sm" color={text} whiteSpace="nowrap">Rows/page</Text>
              <Select size="sm" w="80px" value={limit}
                onChange={e => { const lim=Number(e.target.value); setLimit(lim); fetchPage(1,lim,projectId); }}>
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </Select>
            </HStack>
            <HStack spacing={1}>
              <Button size="sm" onClick={() => goToPage(1)} isDisabled={page===1||pageLoading}>«</Button>
              <Button size="sm" onClick={() => goToPage(page-1)} isDisabled={page===1||pageLoading}>‹</Button>
              {Array.from({length: Math.min(5, pages)}, (_, i) => {
                let p;
                if (pages <= 5)           p = i + 1;
                else if (page <= 3)       p = i + 1;
                else if (page >= pages-2) p = pages - 4 + i;
                else                      p = page - 2 + i;
                return (
                  <Button key={p} size="sm"
                    colorScheme={p===page?"red":"gray"}
                    variant={p===page?"solid":"ghost"}
                    onClick={() => goToPage(p)}
                    isDisabled={pageLoading} minW="36px">{p}</Button>
                );
              })}
              <Button size="sm" onClick={() => goToPage(page+1)} isDisabled={page===pages||pageLoading}>›</Button>
              <Button size="sm" onClick={() => goToPage(pages)}  isDisabled={page===pages||pageLoading}>»</Button>
            </HStack>
          </Flex>
        </Box>
      )}

      {/* ══ MODAL: Create / Edit ══ */}
      {(canCreate||canUpdate) && (
        <Modal isOpen={isOpen} onClose={() => { onClose(); resetModal(); }} isCentered size="lg">
          <ModalOverlay/><ModalContent bg={cardBg}>
            <ModalHeader color={text}>
              <Flex align="center" gap={2}><MdBugReport/>{editId?"Edit Issue":"New Issue"}</Flex>
            </ModalHeader>
            <ModalCloseButton/>
            <ModalBody>
              <VStack spacing={3} align="stretch">
                {selectedProject &&
                  <Box p={3} bg={blueBg} borderRadius="lg" border={`1px solid ${blueBdr}`}>
                    <Text fontSize="xs" color={blueClr} fontWeight="600">📁 {selectedProject.name}</Text>
                  </Box>}
                <FormControl isInvalid={!!errors.name}>
                  <FormLabel fontSize="sm" color={text}>Issue Name *</FormLabel>
                  <Input placeholder="e.g. Login button not responding" value={form.name}
                    onChange={e => {
                      if (e.target.value && !SAFE_NAME.test(e.target.value)) return;
                      setForm(p => ({...p, name:e.target.value}));
                      setErrors(p => ({...p, name:undefined}));
                    }}/>
                  <FormErrorMessage>{errors.name}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.description}>
                  <FormLabel fontSize="sm" color={text} mb={1}>
                    Description * <Text as="span" fontSize="xs" color={sub}>(@ to mention)</Text>
                  </FormLabel>
                  <Box position="relative">
                    <Textarea ref={taRef} value={form.description} onChange={handleDesc}
                      rows={4} placeholder="Describe the issue…"/>
                    {mOpen && fStaff.length > 0 && (
                      <Box position="absolute" top="100%" left={0} zIndex={100} bg={ddBg}
                        border={`1px solid ${ddBdr}`} borderRadius="md" boxShadow="lg"
                        maxH="160px" overflowY="auto" w="220px" mt={1}>
                        {fStaff.map(s => (
                          <Flex key={s._id} px={3} py={2} align="center" gap={2}
                            cursor="pointer" _hover={{bg:ddHov}}
                            onMouseDown={ev => { ev.preventDefault(); insertMention(s); }}>
                            <Box w="24px" h="24px" borderRadius="full" bg="red.400" color="white"
                              display="flex" alignItems="center" justifyContent="center"
                              fontSize="10px" fontWeight="bold">{s.name[0].toUpperCase()}</Box>
                            <Text fontSize="sm" color={text}>{s.name}</Text>
                          </Flex>
                        ))}
                      </Box>
                    )}
                  </Box>
                  {mentions.length > 0 &&
                    <Flex gap={2} mt={2} wrap="wrap">
                      {mentions.map(m =>
                        <Badge key={m} colorScheme="red" borderRadius="full" px={2} fontSize="xs">@{m}</Badge>)}
                    </Flex>}
                  <FormErrorMessage>{errors.description}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.assignee}>
                  <FormLabel fontSize="sm" color={text}>Assignee *</FormLabel>
                  <Select placeholder="Select assignee" value={form.assignee}
                    onChange={e => { setForm(p => ({...p, assignee:e.target.value})); setErrors(p => ({...p, assignee:undefined})); }}>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Select>
                  <FormErrorMessage>{errors.assignee}</FormErrorMessage>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" color={text}>Status</FormLabel>
                  <Select placeholder="Select status" value={form.taskStatus}
                    onChange={e => setForm(p => ({...p, taskStatus:e.target.value}))}>
                    {statuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Select>
                </FormControl>
                <Grid templateColumns="repeat(2,1fr)" gap={3}>
                  <FormControl>
                    <FormLabel fontSize="sm" color={text}>Priority</FormLabel>
                    <Select value={form.priority} onChange={e => setForm(p => ({...p, priority:e.target.value}))}>
                      {pOpts.map(o => <option key={o} value={o}>{o[0].toUpperCase()+o.slice(1)}</option>)}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" color={text}>Severity</FormLabel>
                    <Select value={form.severity} onChange={e => setForm(p => ({...p, severity:e.target.value}))}>
                      {sOpts.map(o => <option key={o} value={o}>{o[0].toUpperCase()+o.slice(1)}</option>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid templateColumns="repeat(2,1fr)" gap={3}>
                  <FormControl>
                    <FormLabel fontSize="xs" color={sub} mb={1}>Created Date</FormLabel>
                    <Input type="date" value={form.createdDate} isReadOnly
                      bg={roBg} cursor="not-allowed" opacity={0.7}/>
                  </FormControl>
                  <FormControl isInvalid={!!errors.dueDate}>
                    <FormLabel fontSize="xs" color={sub} mb={1}>Due Date *</FormLabel>
                    <Input type="date" value={form.dueDate} min={form.createdDate}
                      onChange={e => { setForm(p => ({...p, dueDate:e.target.value})); setErrors(p => ({...p, dueDate:undefined})); }}/>
                    <FormErrorMessage>{errors.dueDate}</FormErrorMessage>
                  </FormControl>
                </Grid>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => { onClose(); resetModal(); }}>Cancel</Button>
              <Button colorScheme="red" isLoading={saving} onClick={handleSave}>
                {editId?"Update":"Create"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* ══ MODAL: Delete confirm ══ */}
      <Modal isOpen={isDel} onClose={onDelClose} isCentered size="sm">
        <ModalOverlay/><ModalContent bg={cardBg} borderRadius="xl">
          <ModalHeader fontSize="md" color={text}>Delete Issue</ModalHeader>
          <ModalBody fontSize="sm" color={sub}>Are you sure? This cannot be undone.</ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={onDelClose}>Cancel</Button>
            <Button size="sm" colorScheme="red" isLoading={deleting}
              loadingText="Deleting…" onClick={handleDelete}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ══ MODAL: Bulk Upload ══ */}
      <Modal
        isOpen={isBulk}
        onClose={() => { if (!bulkUploading) { onBulkClose(); resetBulk(); } }}
        isCentered size="md"
        closeOnOverlayClick={!bulkUploading}>
        <ModalOverlay backdropFilter="blur(2px)"/>
        <ModalContent bg={cardBg} borderRadius="2xl" overflow="hidden">

          <ModalHeader p={0}>
            <Flex align="center" gap={3} px={6} py={4} borderBottom={`1px solid ${border}`}>
              <Box bg="green.100" p={2} borderRadius="xl" _dark={{bg:"green.900"}}>
                <MdUploadFile size={20} color="#38a169"/>
              </Box>
              <Box>
                <Text fontSize="md" fontWeight="700" color={text}>Bulk Upload Issues</Text>
                <Text fontSize="xs" color={sub}>
                  Parse on client · 1 API call · auto-lists when done
                </Text>
              </Box>
            </Flex>
          </ModalHeader>
          {!bulkUploading && <ModalCloseButton top={4} right={4}/>}

          <ModalBody px={6} py={5}>
            <VStack spacing={4} align="stretch">

              {/* project tag */}
              {selectedProject
                ? <Box px={3} py={2} bg={blueBg} borderRadius="lg" border={`1px solid ${blueBdr}`}>
                    <Text fontSize="xs" color={blueClr} fontWeight="600">📁 {selectedProject.name}</Text>
                    <Text fontSize="xs" color={blueClr} opacity={0.8}>Issues will be linked to this project</Text>
                  </Box>
                : <Alert status="warning" borderRadius="lg" py={2}>
                    <AlertIcon/>
                    <AlertDescription fontSize="xs">
                      No project selected — issues won't appear under a project filter.
                    </AlertDescription>
                  </Alert>}

              {/* drop zone */}
              {!bulkUploading && !bulkDone && (
                <Box onClick={() => fileInputRef.current?.click()} cursor="pointer" p={8}
                  borderRadius="xl" border="2px dashed"
                  borderColor={bulkFile ? "green.400" : "gray.300"}
                  bg={bulkFile ? grnBg : upBg}
                  textAlign="center" transition="all 0.2s"
                  _hover={{borderColor:"green.400", bg:grnBg}}>
                  <MdCloudUpload size={40} color={bulkFile ? "#38a169" : "#a0aec0"}
                    style={{margin:"0 auto 8px"}}/>
                  <Text fontWeight="600" fontSize="sm" color={bulkFile ? "green.600" : text} mb={1}>
                    {bulkFile ? `📄 ${bulkFile.name}` : "Click to choose .xlsx or .xls file"}
                  </Text>
                  <Text fontSize="xs" color={sub}>
                    Required: <b>name</b>, <b>assignee</b> · Optional: description, status, priority, severity, due date
                  </Text>
                  <Input ref={fileInputRef} type="file" accept=".xlsx,.xls"
                    display="none" onChange={handleFilePick}/>
                </Box>
              )}

              {/* parse error */}
              {bulkError && (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon/><AlertDescription fontSize="sm">{bulkError}</AlertDescription>
                </Alert>
              )}

              {/* ready — show as soon as file is picked */}
              {bulkFile && !bulkUploading && !bulkDone && (
                <Box p={4} borderRadius="xl" border="1px solid" borderColor="green.200" bg={grnBg}>
                  <HStack spacing={2} mb={1} wrap="wrap">
                    <Badge colorScheme="green" borderRadius="full" px={3} py={1} fontSize="xs">
                      ✅ {bulkRows > 0 ? `~${bulkRows.toLocaleString()} rows detected` : "File ready"}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="green.700" _dark={{color:"green.300"}}>
                    Auto chunk size (max 3MB each) · {PARALLEL} parallel · table refreshes when done
                  </Text>
                </Box>
              )}

              {/* uploading */}
              {bulkUploading && (
                <Box p={5} borderRadius="xl" border="1px solid" borderColor="green.200" bg={grnBg}>
                  <Flex justify="space-between" align="center" mb={2}>
                    <VStack align="flex-start" spacing={0}>
                      <Text fontSize="sm" fontWeight="700" color="green.700" _dark={{color:"green.200"}}>
                        Uploading {bulkRows.toLocaleString()} issues…
                      </Text>
                      <Text fontSize="xs" color="green.600">{bulkPhaseLabel(Math.ceil(bulkRows / (MAX_CHUNK_BYTES / 150)))}</Text>
                    </VStack>
                    <Text fontSize="2xl" fontWeight="800" color="green.600">{bulkProgress}%</Text>
                  </Flex>
                  <Progress value={bulkProgress} size="lg" colorScheme="green"
                    borderRadius="full" hasStripe isAnimated
                    sx={{"& > div":{transition:"width 0.4s linear"}}}/>
                  <Text fontSize="xs" color="green.500" mt={2} textAlign="center">
                    Do not close this window
                  </Text>
                </Box>
              )}

              {/* result */}
              {bulkDone && bulkResult && (() => {
                const isErr  = !!bulkResult.error;
                const isGood = !isErr && bulkResult.created > 0;
                return (
                  <Box p={4} borderRadius="xl" border="1px solid"
                    borderColor={isErr ? "red.200" : isGood ? "green.200" : "orange.200"}
                    bg={useColorModeValue(
                      isErr ? "red.50"  : isGood ? "green.50"  : "orange.50",
                      isErr ? "red.900" : isGood ? "green.900" : "orange.900"
                    )}>
                    <Text fontSize="sm" fontWeight="700" mb={2}
                      color={isErr ? "red.600" : isGood ? "green.700" : "orange.600"}>
                      {isErr
                        ? `❌ ${bulkResult.error}`
                        : isGood
                          ? `✅ ${bulkResult.created.toLocaleString()} issue${bulkResult.created!==1?"s":""} uploaded!`
                          : bulkResult.unmatched?.length > 0
                            ? "❌ Assignee names not found in Staff"
                            : "⚠️ 0 inserted — check assignee names match Staff exactly"}
                    </Text>
                    {!isErr && (
                      <HStack spacing={2} wrap="wrap" mb={bulkResult.unmatched?.length > 0 ? 3 : 0}>
                        {bulkResult.created    > 0 &&
                          <Badge colorScheme="green"  borderRadius="full" px={2} py={1} fontSize="xs">
                            ✅ {bulkResult.created.toLocaleString()} created
                          </Badge>}
                        {bulkResult.duplicates > 0 &&
                          <Badge colorScheme="orange" borderRadius="full" px={2} py={1} fontSize="xs">
                            ⚠ {bulkResult.duplicates.toLocaleString()} duplicates
                          </Badge>}
                        {bulkResult.failed     > 0 &&
                          <Badge colorScheme="red"    borderRadius="full" px={2} py={1} fontSize="xs">
                            ❌ {bulkResult.failed.toLocaleString()} failed
                          </Badge>}
                      </HStack>
                    )}
                    {bulkResult.unmatched?.length > 0 && (
                      <Box p={3} bg="red.100" borderRadius="lg" _dark={{bg:"red.800"}}>
                        <Text fontSize="xs" fontWeight="700" color="red.700" mb={1}>Not found in Staff:</Text>
                        {bulkResult.unmatched.map(n =>
                          <Text key={n} fontSize="xs" color="red.600" fontFamily="mono">• "{n}"</Text>)}
                        <Text fontSize="xs" color="red.500" mt={2} fontWeight="600">
                          Add these names to Staff → re-upload
                        </Text>
                      </Box>
                    )}
                    {isGood && (
                      <Text fontSize="xs" color="green.600" mt={2}>
                        ✓ Table refreshed automatically — use pagination to browse all
                      </Text>
                    )}
                  </Box>
                );
              })()}

            </VStack>
          </ModalBody>

          <ModalFooter px={6} py={4} borderTop={`1px solid ${border}`} gap={2}>
            <Button size="sm" leftIcon={<MdDownload size={14}/>} variant="outline"
              onClick={downloadSample} isDisabled={bulkUploading}>Sample</Button>
            <Box flex={1}/>

            {/* no file yet — show cancel */}
            {!bulkFile && !bulkUploading && !bulkDone && (
              <Button size="sm" variant="ghost"
                onClick={() => { onBulkClose(); resetBulk(); }}>Cancel</Button>
            )}

            {/* file picked — show upload button immediately */}
            {bulkFile && !bulkUploading && !bulkDone && (
              <>
                <Button size="sm" variant="ghost" onClick={resetBulk}>Clear</Button>
                <Button colorScheme="green" size="sm" leftIcon={<MdUploadFile size={14}/>}
                  onClick={handleBulkUpload}>
                  Upload {bulkRows > 0 ? `~${bulkRows.toLocaleString()}` : ""} Issues
                </Button>
              </>
            )}

            {/* done or error */}
            {bulkDone && (
              <>
                <Button size="sm" variant="outline" onClick={resetBulk}>Upload Another</Button>
                <Button size="sm" colorScheme="green"
                  onClick={() => { onBulkClose(); resetBulk(); }}>Done</Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}