/**
 * DocumentEditor.jsx
 * Place at: src/pages/documents/DocumentEditor.jsx
 *
 * Usage:
 *   <DocumentEditor />                   // create new
 *   <DocumentEditor documentId="xyz" />  // edit existing
 *   or via router: /admin/documents/editor/:id
 *
 * Install:
 *   npm install @ckeditor/ckeditor5-react @ckeditor/ckeditor5-build-classic
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import {
  Box, Flex, HStack, VStack, Input, Select, Text, Badge,
  Button, Switch, FormControl, FormLabel, Tooltip, Spinner,
  useColorModeValue, useToast, Divider, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import {
  MdSave, MdClose, MdAutoMode, MdCheckCircle, MdSchedule,
} from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

const AUTO_SAVE_DELAY = 3000; // ms idle before auto-save fires

export default function DocumentEditor({ documentId: propDocId }) {
  const { id: paramId }  = useParams();
  const docId            = propDocId || paramId || null;
  const isEditMode       = !!docId;
  const navigate         = useNavigate();
  const toast            = useToast();
  const { projects }     = useAuth();

  // ── Form ──────────────────────────────────────────────────────────────────
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [status,       setStatus]       = useState("draft");
  const [projectId,    setProjectId]    = useState("");
  const [richContent,  setRichContent]  = useState("");

  // ── Editor meta ───────────────────────────────────────────────────────────
  const [autoSave,      setAutoSave]      = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [lastSavedAt,   setLastSavedAt]   = useState(null);
  const [isDirty,       setIsDirty]       = useState(false);
  const [loading,       setLoading]       = useState(isEditMode);
  const [currentDocId,  setCurrentDocId]  = useState(docId);
  const [saveError,     setSaveError]     = useState("");

  // Snapshot of last-saved state — used by Cancel to revert
  const savedSnapshot  = useRef({ title: "", description: "", status: "draft", projectId: "", richContent: "" });
  const autoSaveTimer  = useRef(null);
  const autoSaveRef    = useRef(autoSave);
  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const cardBg    = useColorModeValue("white",   "gray.800");
  const borderClr = useColorModeValue("#e2e8f0", "#4a5568");
  const subColor  = useColorModeValue("gray.500","gray.400");
  const textColor = useColorModeValue("gray.800","white");
  const toolbarBg = useColorModeValue("#f7fafc", "#2d3748");

  // ── Load existing doc ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;
    api.get(`/documents/${docId}`)
      .then(res => {
        const d = res.data;
        const snap = {
          title:       d.title        || "",
          description: d.description  || "",
          status:      d.status       || "draft",
          projectId:   d.project?._id || "",
          richContent: d.richContent  || "",
        };
        setTitle(snap.title);
        setDescription(snap.description);
        setStatus(snap.status);
        setProjectId(snap.projectId);
        setRichContent(snap.richContent);
        if (d.lastSavedAt) setLastSavedAt(new Date(d.lastSavedAt));
        savedSnapshot.current = snap;
      })
      .catch(() => toast({ title: "Failed to load document", status: "error", duration: 3000 }))
      .finally(() => setLoading(false));
  }, [docId, isEditMode]);

  // Keyboard shortcut: Ctrl/Cmd+S → manual save
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!autoSaveRef.current) save({ silent: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  // ── Save (create or update) ───────────────────────────────────────────────
  const save = useCallback(async ({ silent = false } = {}) => {
    if (!title.trim()) {
      if (!silent) toast({ title: "Title is required", status: "warning", duration: 2000 });
      return;
    }
    setSaving(true);
    setSaveError("");
    const payload = { title, description, richContent, status, project: projectId || "" };

    try {
      let res;
      if (currentDocId) {
        // UPDATE — PUT /documents/editor/:id
        res = await api.put(`/documents/editor/${currentDocId}`, payload);
      } else {
        // CREATE — POST /documents/editor
        res = await api.post("/documents/editor", payload);
        setCurrentDocId(res.data.document._id);
      }

      const savedAt = new Date(res.data.savedAt);
      setLastSavedAt(savedAt);
      setIsDirty(false);
      savedSnapshot.current = { title, description, status, projectId, richContent };

      if (!silent) {
        toast({ title: "Saved!", status: "success", duration: 1500, position: "top-right" });
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Save failed";
      setSaveError(msg);
      if (!silent) toast({ title: msg, status: "error", duration: 3000 });
    } finally {
      setSaving(false);
    }
  }, [title, description, richContent, status, projectId, currentDocId]);

  // ── Auto-save scheduler ───────────────────────────────────────────────────
  const scheduleAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (autoSaveRef.current) save({ silent: true });
    }, AUTO_SAVE_DELAY);
  }, [save]);

  // ── Field handlers ────────────────────────────────────────────────────────
  const onChange = (setter) => (e) => {
    setter(e.target.value);
    setIsDirty(true);
    scheduleAutoSave();
  };

  const handleEditorChange = (_, editor) => {
    setRichContent(editor.getData());
    setIsDirty(true);
    scheduleAutoSave();
  };

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    clearTimeout(autoSaveTimer.current);
    if (isDirty) {
      const snap = savedSnapshot.current;
      setTitle(snap.title);
      setDescription(snap.description);
      setStatus(snap.status);
      setProjectId(snap.projectId);
      setRichContent(snap.richContent);
      setIsDirty(false);
      setSaveError("");
    } else {
      navigate(-1);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtTime = (d) => d
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  const statusColors = { draft: "gray", active: "green", review: "yellow", archived: "red" };
  const manualSaveDisabled = saving || (!isDirty && !!currentDocId);

  if (loading) {
    return (
      <Flex justify="center" align="center" h="60vh">
        <VStack spacing={3}>
          <Spinner size="xl" color="brand.500" />
          <Text color={subColor} fontSize="sm">Loading document…</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box maxW="1000px" mx="auto" pb={12}>

      {/* ── TOP TOOLBAR ──────────────────────────────────────────────────── */}
      <Box bg={cardBg} px={6} py={4} borderRadius="xl" boxShadow="md" mb={4}
        border={`1px solid ${borderClr}`}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>

          {/* Left: doc title + badges */}
          <HStack spacing={3}>
            <VStack align="flex-start" spacing={1}>
              <HStack spacing={2}>
                <Text fontSize="xs" color={subColor} fontWeight="600"
                  textTransform="uppercase" letterSpacing="wide">
                  {isEditMode ? "Editing" : "New Document"}
                </Text>
                <Badge colorScheme={statusColors[status]} borderRadius="full" fontSize="xs" px={2}>
                  {status}
                </Badge>
                {isDirty && (
                  <Badge colorScheme="orange" borderRadius="full" fontSize="xs" variant="outline">
                    unsaved
                  </Badge>
                )}
              </HStack>
              <Text fontWeight="700" fontSize="md" color={textColor} noOfLines={1} maxW="280px">
                {title || "Untitled Document"}
              </Text>
            </VStack>
          </HStack>

          {/* Right: save indicator + toggle + buttons */}
          <HStack spacing={3} flexWrap="wrap">

            {/* Save status */}
            {saving ? (
              <HStack spacing={1} color={subColor} fontSize="xs">
                <Spinner size="xs" /><Text>Saving…</Text>
              </HStack>
            ) : lastSavedAt ? (
              <HStack spacing={1} color="green.500" fontSize="xs">
                <MdCheckCircle size={14} /><Text>Saved {fmtTime(lastSavedAt)}</Text>
              </HStack>
            ) : null}

            <Divider orientation="vertical" h="28px" />

            {/* Auto-save toggle */}
            <FormControl display="flex" alignItems="center" gap={2} w="auto">
              <MdAutoMode size={16} color={autoSave ? "#38a169" : "#a0aec0"} />
              <FormLabel htmlFor="autosave" mb={0} fontSize="sm" color={textColor} cursor="pointer">
                Auto-save
              </FormLabel>
              <Switch id="autosave" colorScheme="green" isChecked={autoSave} size="sm"
                onChange={e => {
                  setAutoSave(e.target.checked);
                  if (e.target.checked) clearTimeout(autoSaveTimer.current);
                }} />
            </FormControl>

            <Divider orientation="vertical" h="28px" />

            {/* Save button — HIDDEN when auto-save is ON */}
            {!autoSave && (
              <Tooltip label="Ctrl+S">
                <Button colorScheme="brand" size="sm" leftIcon={<MdSave size={14} />}
                  isLoading={saving} loadingText="Saving…"
                  isDisabled={manualSaveDisabled}
                  onClick={() => save({ silent: false })}>
                  Save
                </Button>
              </Tooltip>
            )}

            {/* Cancel — ALWAYS visible */}
            <Button variant="outline" colorScheme="gray" size="sm"
              leftIcon={<MdClose size={14} />} onClick={handleCancel}>
              {isDirty ? "Revert" : "Cancel"}
            </Button>

          </HStack>
        </Flex>

        {saveError && (
          <Alert status="error" borderRadius="lg" mt={3} py={2}>
            <AlertIcon />
            <AlertDescription fontSize="sm">{saveError}</AlertDescription>
          </Alert>
        )}
      </Box>

      {/* ── META FIELDS ──────────────────────────────────────────────────── */}
      <Box bg={cardBg} px={6} py={5} borderRadius="xl" boxShadow="sm" mb={4}
        border={`1px solid ${borderClr}`}>
        <Flex gap={4} wrap="wrap">

          <FormControl flex="2" minW="180px">
            <FormLabel fontSize="xs" color={subColor} mb={1}
              textTransform="uppercase" letterSpacing="wide">Title *</FormLabel>
            <Input value={title} onChange={onChange(setTitle)}
              placeholder="Document title…" fontWeight="600"
              _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 1px var(--chakra-colors-brand-400)" }} />
          </FormControl>

          <FormControl flex="2" minW="180px">
            <FormLabel fontSize="xs" color={subColor} mb={1}
              textTransform="uppercase" letterSpacing="wide">Description</FormLabel>
            <Input value={description} onChange={onChange(setDescription)}
              placeholder="Short description…" />
          </FormControl>

          <FormControl flex="1" minW="120px">
            <FormLabel fontSize="xs" color={subColor} mb={1}
              textTransform="uppercase" letterSpacing="wide">Status</FormLabel>
            <Select value={status} onChange={onChange(setStatus)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="archived">Archived</option>
            </Select>
          </FormControl>

          <FormControl flex="1" minW="140px">
            <FormLabel fontSize="xs" color={subColor} mb={1}
              textTransform="uppercase" letterSpacing="wide">Project</FormLabel>
            <Select value={projectId} onChange={onChange(setProjectId)} placeholder="No project">
              {(projects || []).map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </Select>
          </FormControl>

        </Flex>
      </Box>

      {/* ── CKEDITOR ─────────────────────────────────────────────────────── */}
      <Box bg={cardBg} borderRadius="xl" boxShadow="sm"
        border={`1px solid ${borderClr}`} overflow="hidden"
        sx={{
          ".ck-toolbar": {
            background: `${toolbarBg} !important`,
            borderBottom: `1px solid ${borderClr} !important`,
            border: "none !important",
            borderBottomWidth: "1px !important",
            borderBottomStyle: "solid !important",
            borderBottomColor: `${borderClr} !important`,
          },
          ".ck-editor__editable": {
            minHeight: "480px",
            fontSize: "15px",
            lineHeight: "1.8",
            padding: "28px 36px !important",
            background: `${cardBg} !important`,
            color: `${textColor} !important`,
            border: "none !important",
            boxShadow: "none !important",
            outline: "none !important",
          },
          ".ck.ck-editor": { border: "none !important" },
          ".ck.ck-editor__editable.ck-focused": {
            boxShadow: "none !important",
            border: "none !important",
          },
        }}>
        <CKEditor
          editor={ClassicEditor}
          data={richContent}
          onChange={handleEditorChange}
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
            table: { contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"] },
            placeholder: "Start writing your document here…",
          }}
        />
      </Box>

      {/* ── BOTTOM BAR — only shown when auto-save is OFF ────────────────── */}
      {!autoSave && (
        <Box bg={cardBg} px={6} py={4} borderRadius="xl" boxShadow="md" mt={4}
          border={`1px solid ${borderClr}`}>
          <Flex justify="space-between" align="center">
            <HStack spacing={2} color={subColor} fontSize="sm">
              <MdSchedule size={16} />
              <Text>
                {lastSavedAt ? `Last saved ${fmtTime(lastSavedAt)}` : "Not yet saved"}
              </Text>
              {isDirty && (
                <Badge colorScheme="orange" borderRadius="full" fontSize="xs">unsaved changes</Badge>
              )}
            </HStack>
            <HStack spacing={3}>
              <Button variant="outline" colorScheme="gray" size="sm"
                leftIcon={<MdClose size={14} />} onClick={handleCancel}>
                {isDirty ? "Revert" : "Cancel"}
              </Button>
              <Button colorScheme="brand" size="sm" leftIcon={<MdSave size={14} />}
                isLoading={saving} loadingText="Saving…"
                isDisabled={manualSaveDisabled}
                onClick={() => save({ silent: false })}>
                Save Document
              </Button>
            </HStack>
          </Flex>
        </Box>
      )}

    </Box>
  );
}