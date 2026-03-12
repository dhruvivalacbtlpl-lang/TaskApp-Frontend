/**
 * DocumentEditor.jsx
 * Full-page CKEditor for creating/editing text documents.
 * Uses existing backend: POST /documents and PUT /documents/:id
 *
 * Routes (add to your router):
 *   /documents/editor          → create new
 *   /documents/editor/:id      → edit existing
 *
 * Install CKEditor if not already:
 *   npm install @ckeditor/ckeditor5-react @ckeditor/ckeditor5-build-classic
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import {
  Box, Flex, HStack, VStack, Input, Select, Text, Badge,
  Button, Switch, FormControl, FormLabel, Tooltip, Spinner,
  useColorModeValue, useToast, Divider, Alert, AlertIcon,
  AlertDescription, Avatar, IconButton,
} from "@chakra-ui/react";
import {
  MdSave, MdClose, MdCheckCircle, MdSchedule, MdArrowBack,
  MdDescription, MdAutoMode, MdPerson, MdFolder
} from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

const AUTO_SAVE_DELAY = 3000; // ms idle before auto-save triggers

// Strip HTML tags to count plain-text words
const countWords = (html) => {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
};

const countChars = (html) => {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, "").length;
};

export default function DocumentEditor() {
  const { id: paramId } = useParams();
  const docId           = paramId || null;
  const isEditMode      = !!docId;
  const navigate        = useNavigate();
  const toast           = useToast();
  const { user, selectedProject, staff } = useAuth();

  // ── Form fields ────────────────────────────────────────────────────────────
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [status,      setStatus]      = useState("draft");
  const [assignee,    setAssignee]    = useState("");
  const [content,     setContent]     = useState("");

  // ── Local staff list (fallback if not in context) ─────────────────────────
  const [staffList, setStaffList] = useState([]);

  // ── Editor meta ────────────────────────────────────────────────────────────
  const [autoSave,     setAutoSave]     = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [lastSavedAt,  setLastSavedAt]  = useState(null);
  const [isDirty,      setIsDirty]      = useState(false);
  const [loading,      setLoading]      = useState(isEditMode);
  const [currentDocId, setCurrentDocId] = useState(docId);
  const [saveError,    setSaveError]    = useState("");
  const [timeAgo,      setTimeAgo]      = useState("");

  // Snapshot for revert
  const savedSnapshot    = useRef({ title:"", description:"", status:"draft", assignee:"", content:"" });
  const autoSaveTimer    = useRef(null);
  const autoSaveRef      = useRef(autoSave);
  const saveControllerRef = useRef(null); // ← AbortController for cancelling in-flight saves
  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);

  // ── Colors ─────────────────────────────────────────────────────────────────
  const cardBg     = useColorModeValue("white",    "gray.800");
  const borderClr  = useColorModeValue("#e2e8f0",  "#4a5568");
  const subColor   = useColorModeValue("gray.500", "gray.400");
  const textColor  = useColorModeValue("gray.800", "white");
  const toolbarBg  = useColorModeValue("#f7fafc",  "#2d3748");
  const metaBg     = useColorModeValue("gray.50",  "gray.750");

  // ── Load existing doc ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;
    api.get(`/documents/${docId}`)
      .then(res => {
        const d = res.data;
        const snap = {
          title:       d.title        || "",
          description: d.description  || "",
          status:      d.status       || "draft",
          assignee:    d.assignee?._id || "",
          content:     d.content      || "",
        };
        setTitle(snap.title);
        setDescription(snap.description);
        setStatus(snap.status);
        setAssignee(snap.assignee);
        setContent(snap.content);
        if (d.updatedAt) setLastSavedAt(new Date(d.updatedAt));
        savedSnapshot.current = snap;
      })
      .catch(() => toast({ title:"Failed to load document", status:"error", duration:3000 }))
      .finally(() => setLoading(false));
  }, [docId, isEditMode]); // eslint-disable-line

  // ── Load staff if not available in context ─────────────────────────────────
  useEffect(() => {
    if (staff?.length) { setStaffList(staff); return; }
    api.get("/staff").then(res => setStaffList(res.data || [])).catch(() => {});
  }, [staff]);

  // ── Ctrl+S shortcut ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!autoSaveRef.current) save({ silent: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line

  // ── "X seconds ago" live timer ─────────────────────────────────────────────
  useEffect(() => {
    if (!lastSavedAt) return;
    const update = () => {
      const diff = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
      if (diff < 5)   setTimeAgo("just now");
      else if (diff < 60)  setTimeAgo(`${diff}s ago`);
      else if (diff < 3600) setTimeAgo(`${Math.floor(diff/60)}m ago`);
      else setTimeAgo(lastSavedAt.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }));
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(autoSaveTimer.current);         // cancel pending debounce
    saveControllerRef.current?.abort();          // cancel any in-flight save request
  }, []);


  // ── Save ───────────────────────────────────────────────────────────────────
  const save = useCallback(async ({ silent = false } = {}) => {
    if (!title.trim()) {
      if (!silent) toast({ title:"Title is required", status:"warning", duration:2000 });
      return;
    }

    // ── Abort Controller ───────────────────────────────────────────────────
    // If a previous save request is still in flight, cancel it immediately.
    // This prevents race conditions where an older slow request finishes
    // after a newer one and overwrites the correct data in the database.
    if (saveControllerRef.current) {
      saveControllerRef.current.abort();
    }
    saveControllerRef.current = new AbortController();
    const signal = saveControllerRef.current.signal;
    // ──────────────────────────────────────────────────────────────────────

    setSaving(true);
    setSaveError("");

    // Use FormData so it's compatible with the existing multer upload route
    const fd = new FormData();
    fd.append("title",       title);
    fd.append("description", description);
    fd.append("status",      status);
    fd.append("content",     content);
    if (assignee)         fd.append("assignee", assignee);
    if (selectedProject)  fd.append("project",  selectedProject._id);

    try {
      let res;
      if (currentDocId) {
        res = await api.put(`/documents/${currentDocId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
          signal, // ← attach abort signal to axios request
        });
      } else {
        res = await api.post("/documents", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          signal, // ← attach abort signal to axios request
        });
        setCurrentDocId(res.data._id);
      }

      setLastSavedAt(new Date());
      setIsDirty(false);
      savedSnapshot.current = { title, description, status, assignee, content };

      if (!silent) {
        toast({ title:"Saved!", status:"success", duration:1500, position:"top-right" });
      }
    } catch (err) {
      // If the error is from our own abort — it means a newer save took over.
      // This is expected behaviour, not a real error — so we silently ignore it.
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;

      const msg = err.response?.data?.error || "Save failed";
      setSaveError(msg);
      if (!silent) toast({ title:msg, status:"error", duration:3000 });
    } finally {
      setSaving(false);
    }
  }, [title, description, content, status, assignee, selectedProject, currentDocId]); // eslint-disable-line

  // ── Auto-save scheduler ────────────────────────────────────────────────────
  const scheduleAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (autoSaveRef.current) save({ silent: true });
    }, AUTO_SAVE_DELAY);
  }, [save]);

  // ── Field change handler ───────────────────────────────────────────────────
  const onFieldChange = (setter) => (e) => {
    setter(e.target.value);
    setIsDirty(true);
    scheduleAutoSave();
  };

  // ── Cancel / Revert ────────────────────────────────────────────────────────
  const handleCancel = () => {
    clearTimeout(autoSaveTimer.current);
    if (isDirty) {
      const s = savedSnapshot.current;
      setTitle(s.title); setDescription(s.description);
      setStatus(s.status); setAssignee(s.assignee); setContent(s.content);
      setIsDirty(false); setSaveError("");
    } else {
      navigate("/admin/documents");
    }
  };

  const wordCount = countWords(content);
  const charCount = countChars(content);
  const manualSaveDisabled = saving || (!isDirty && !!currentDocId);
  const statusColors = { draft:"gray", active:"green", review:"yellow", archived:"red" };

  if (loading) return (
    <Flex justify="center" align="center" h="60vh">
      <VStack spacing={3}>
        <Spinner size="xl" color="brand.500"/>
        <Text color={subColor} fontSize="sm">Loading document…</Text>
      </VStack>
    </Flex>
  );

  return (
    <Box maxW="1100px" mx="auto" pb={16}>

      {/* ── TOP TOOLBAR ───────────────────────────────────────────────────── */}
      <Box bg={cardBg} px={6} py={4} borderRadius="xl" boxShadow="md" mb={4}
        border={`1px solid ${borderClr}`}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>

          {/* Left: back + title + badges */}
          <HStack spacing={3}>
            <Tooltip label="Back to Documents">
              <IconButton icon={<MdArrowBack size={18}/>} size="sm" variant="ghost"
                aria-label="Back" onClick={() => navigate("/admin/documents")}/>
            </Tooltip>
            <Divider orientation="vertical" h="28px"/>
            <VStack align="flex-start" spacing={0}>
              <HStack spacing={2}>
                <Text fontSize="xs" color={subColor} fontWeight="600"
                  textTransform="uppercase" letterSpacing="wide">
                  {isEditMode ? "Editing document" : "New document"}
                </Text>
                <Badge colorScheme={statusColors[status]||"gray"}
                  borderRadius="full" fontSize="xs" px={2}>
                  {status}
                </Badge>
                {isDirty && (
                  <Badge colorScheme="orange" borderRadius="full" fontSize="xs" variant="outline">
                    unsaved
                  </Badge>
                )}
                {selectedProject && (
                  <Badge colorScheme="blue" borderRadius="full" fontSize="xs" variant="subtle">
                    {selectedProject.name}
                  </Badge>
                )}
              </HStack>
              <Text fontWeight="700" fontSize="md" color={textColor} noOfLines={1} maxW="320px">
                {title || "Untitled Document"}
              </Text>
            </VStack>
          </HStack>

          {/* Right: save status + auto-save + buttons */}
          <HStack spacing={3} flexWrap="wrap">

            {/* Save status indicator */}
            {saving ? (
              <HStack spacing={1} color={subColor} fontSize="xs">
                <Spinner size="xs"/><Text>Saving…</Text>
              </HStack>
            ) : lastSavedAt ? (
              <HStack spacing={1} color="green.500" fontSize="xs">
                <MdCheckCircle size={14}/>
                <Text>Saved {timeAgo}</Text>
              </HStack>
            ) : null}

            <Divider orientation="vertical" h="28px"/>

            {/* Auto-save toggle */}
            <FormControl display="flex" alignItems="center" gap={2} w="auto">
              <MdAutoMode size={16} color={autoSave ? "#38a169" : "#a0aec0"}/>
              <FormLabel mb={0} fontSize="sm" color={textColor} cursor="pointer">
                Auto-save
              </FormLabel>
              <Switch colorScheme="green" isChecked={autoSave} size="sm"
                onChange={e => {
                  setAutoSave(e.target.checked);
                  if (!e.target.checked) clearTimeout(autoSaveTimer.current);
                }}/>
            </FormControl>

            <Divider orientation="vertical" h="28px"/>

            {/* Manual save — hidden when auto-save is ON */}
            {!autoSave && (
              <Tooltip label="Ctrl+S">
                <Button colorScheme="brand" size="sm" leftIcon={<MdSave size={14}/>}
                  isLoading={saving} loadingText="Saving…"
                  isDisabled={manualSaveDisabled}
                  onClick={() => save({ silent:false })}>
                  Save
                </Button>
              </Tooltip>
            )}

            {/* Cancel */}
            <Button variant="outline" colorScheme="gray" size="sm"
              leftIcon={<MdClose size={14}/>} onClick={handleCancel}>
              {isDirty ? "Revert" : "Close"}
            </Button>
          </HStack>
        </Flex>

        {saveError && (
          <Alert status="error" borderRadius="lg" mt={3} py={2}>
            <AlertIcon/>
            <AlertDescription fontSize="sm">{saveError}</AlertDescription>
          </Alert>
        )}
      </Box>

      {/* ── META FIELDS ───────────────────────────────────────────────────── */}
      <Box bg={cardBg} px={6} py={5} borderRadius="xl" boxShadow="sm" mb={4}
        border={`1px solid ${borderClr}`}>
        <Flex gap={4} wrap="wrap">

          {/* Title */}
          <FormControl flex="2" minW="200px">
            <FormLabel fontSize="xs" color={subColor} mb={1}
              textTransform="uppercase" letterSpacing="wide">Title *</FormLabel>
            <Input value={title} onChange={onFieldChange(setTitle)}
              placeholder="Document title…" fontWeight="600"
              _focus={{ borderColor:"brand.400",
                boxShadow:"0 0 0 1px var(--chakra-colors-brand-400)" }}/>
          </FormControl>

          {/* Description */}
          <FormControl flex="2" minW="200px">
            <FormLabel fontSize="xs" color={subColor} mb={1}
              textTransform="uppercase" letterSpacing="wide">Description</FormLabel>
            <Input value={description} onChange={onFieldChange(setDescription)}
              placeholder="Short description…"/>
          </FormControl>

          {/* Status */}
          <FormControl flex="1" minW="130px">
            <FormLabel fontSize="xs" color={subColor} mb={1}
              textTransform="uppercase" letterSpacing="wide">Status</FormLabel>
            <Select value={status} onChange={onFieldChange(setStatus)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="archived">Archived</option>
            </Select>
          </FormControl>

          {/* Assignee */}
          <FormControl flex="1" minW="150px">
            <FormLabel fontSize="xs" color={subColor} mb={1}
              textTransform="uppercase" letterSpacing="wide">Assignee</FormLabel>
            <Select value={assignee} placeholder="No assignee"
              onChange={onFieldChange(setAssignee)}>
              {staffList.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </Select>
          </FormControl>

        </Flex>

        {/* Project info row */}
        {(selectedProject || user?.name) && (
          <Flex mt={3} pt={3} borderTop={`1px solid ${borderClr}`} gap={4} wrap="wrap">
            {selectedProject && (
              <Flex align="center" gap={2}>
                <MdFolder size={13} color="#3182ce"/>
                <Text fontSize="xs" color={subColor}>
                  Project: <strong style={{ color: textColor }}>{selectedProject.name}</strong>
                </Text>
              </Flex>
            )}
            {user?.name && (
              <Flex align="center" gap={2}>
                <MdPerson size={13} color="#805ad5"/>
                <Text fontSize="xs" color={subColor}>
                  Author: <strong style={{ color: textColor }}>{user.name}</strong>
                </Text>
              </Flex>
            )}
          </Flex>
        )}
      </Box>

      {/* ── CKEDITOR ──────────────────────────────────────────────────────── */}
      <Box bg={cardBg} borderRadius="xl" boxShadow="sm"
        border={`1px solid ${borderClr}`} overflow="hidden"
        sx={{
          ".ck-toolbar": {
            background:        `${toolbarBg} !important`,
            border:            "none !important",
            borderBottom:      `1px solid ${borderClr} !important`,
            borderBottomWidth: "1px !important",
            borderBottomStyle: "solid !important",
            borderBottomColor: `${borderClr} !important`,
          },
          ".ck-editor__editable": {
            minHeight:  "520px",
            fontSize:   "15px",
            lineHeight: "1.85",
            padding:    "32px 40px !important",
            background: `${cardBg} !important`,
            color:      `${textColor} !important`,
            border:     "none !important",
            boxShadow:  "none !important",
            outline:    "none !important",
          },
          ".ck.ck-editor":                      { border: "none !important" },
          ".ck.ck-editor__editable.ck-focused": { boxShadow: "none !important", border: "none !important" },
          ".ck-editor__editable h2":            { fontSize: "1.5em", fontWeight: "700", marginBottom: "0.5em" },
          ".ck-editor__editable h3":            { fontSize: "1.25em", fontWeight: "600" },
          ".ck-editor__editable blockquote":    { borderLeft: "4px solid #3182ce", paddingLeft: "16px", color: "#718096" },
          ".ck-editor__editable table":         { borderCollapse: "collapse", width: "100%" },
          ".ck-editor__editable table td, .ck-editor__editable table th": {
            border: `1px solid ${borderClr}`, padding: "8px 12px",
          },
        }}>
        <CKEditor
          editor={ClassicEditor}
          data={content}
          onChange={(_, editor) => {
            setContent(editor.getData());
            setIsDirty(true);
            scheduleAutoSave();
          }}
          config={{
            toolbar: {
              items: [
                "heading", "|",
                "bold", "italic", "underline", "strikethrough", "|",
                "bulletedList", "numberedList", "todoList", "|",
                "outdent", "indent", "|",
                "blockQuote", "insertTable", "horizontalLine", "|",
                "link", "|",
                "undo", "redo",
              ],
            },
            table: { contentToolbar: ["tableColumn","tableRow","mergeTableCells"] },
            placeholder: "Start writing your document here…",
          }}
        />
      </Box>

      {/* ── BOTTOM STATUS BAR ─────────────────────────────────────────────── */}
      <Box bg={cardBg} px={6} py={3} borderRadius="xl" boxShadow="sm" mt={3}
        border={`1px solid ${borderClr}`}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={2}>

          {/* Word + char count */}
          <HStack spacing={4} color={subColor} fontSize="xs">
            <Flex align="center" gap={1}>
              <MdDescription size={13}/>
              <Text><strong style={{ color: textColor }}>{wordCount.toLocaleString()}</strong> words</Text>
            </Flex>
            <Text color={borderClr}>|</Text>
            <Text><strong style={{ color: textColor }}>{charCount.toLocaleString()}</strong> characters</Text>
            {lastSavedAt && (
              <>
                <Text color={borderClr}>|</Text>
                <Flex align="center" gap={1} color="green.500">
                  <MdCheckCircle size={12}/>
                  <Text>Saved {timeAgo}</Text>
                </Flex>
              </>
            )}
            {!lastSavedAt && isDirty && (
              <>
                <Text color={borderClr}>|</Text>
                <Flex align="center" gap={1} color="orange.400">
                  <MdSchedule size={12}/>
                  <Text>Unsaved changes</Text>
                </Flex>
              </>
            )}
          </HStack>

          {/* Bottom save button — only when auto-save is OFF */}
          {!autoSave && (
            <HStack spacing={2}>
              <Button variant="outline" colorScheme="gray" size="sm"
                leftIcon={<MdClose size={13}/>} onClick={handleCancel}>
                {isDirty ? "Revert" : "Close"}
              </Button>
              <Button colorScheme="brand" size="sm" leftIcon={<MdSave size={13}/>}
                isLoading={saving} isDisabled={manualSaveDisabled}
                onClick={() => save({ silent:false })}>
                Save Document
              </Button>
            </HStack>
          )}
        </Flex>
      </Box>

    </Box>
  );
}