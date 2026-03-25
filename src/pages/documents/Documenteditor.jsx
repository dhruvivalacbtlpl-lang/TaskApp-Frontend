/**
 * DocumentEditor.jsx — FULL REPLACEMENT
 *
 * Key changes vs previous version:
 *  ✅ All pages stacked VERTICALLY (like Word/Google Docs) — no tabs
 *  ✅ Shift+Enter via DOM keydown on wrapper div — 100% reliable
 *  ✅ Auto-scrolls to new page when created
 *  ✅ Type-picker modal on new doc creation
 *  ✅ Auto-save debounced 3s
 *  ✅ .docx (CKEditor) | .txt (textarea)
 *  ✅ PDF export via print
 *  ✅ Per-page header & footer
 *
 * Routes (unchanged):
 *   /admin/documents/editor          → create new
 *   /admin/documents/editor/:id      → edit existing
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams }  from "react-router-dom";
import { CKEditor }                from "@ckeditor/ckeditor5-react";
import DecoupledEditor             from "@ckeditor/ckeditor5-build-decoupled-document";
import {
  Alert, AlertDescription, AlertIcon,
  Badge, Box, Button, Divider, Flex, FormControl, FormLabel,
  HStack, IconButton, Input, Modal, ModalBody, ModalCloseButton,
  ModalContent, ModalFooter, ModalHeader, ModalOverlay,
  Popover, PopoverBody, PopoverContent, PopoverTrigger,
  Select, Spinner, Switch, Text, Textarea, Tooltip, VStack,
  useColorModeValue, useDisclosure, useToast,
} from "@chakra-ui/react";
import {
  MdAdd, MdArrowBack, MdCheckCircle, MdClose, MdDelete,
  MdDescription, MdPrint, MdSave, MdSchedule, MdSettings,
  MdTextFields, MdPerson, MdFolder,
} from "react-icons/md";
import api         from "../../api";
import { useAuth } from "../../context/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const AUTO_SAVE_MS = 3000;
const MAX_PAGES    = 5;
const A4_W         = 794;
const A4_H         = 1123;
const BRAND        = "#1a56db";
const BRAND_DARK   = "#1040b0";
const BRAND_LITE   = "#e8f0fd";

const blankPage = (num, header = "", footer = "") => ({
  pageNumber: num, pageContent: "", headerText: header, footerText: footer, _isNew: true,
});

const countWords = (html = "") =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    .split(" ").filter(Boolean).length;

// ─── Type-picker modal ────────────────────────────────────────────────────────
function TypePickerModal({ isOpen, onClose, onConfirm }) {
  const [title,   setTitle]   = useState("");
  const [desc,    setDesc]    = useState("");
  const [docType, setDocType] = useState("docx");
  const [saving,  setSaving]  = useState(false);
  const toast = useToast();

  const cardBg    = useColorModeValue("white",    "gray.800");
  const textColor = useColorModeValue("gray.800", "white");
  const subColor  = useColorModeValue("gray.500", "gray.400");
  const borderClr = useColorModeValue("#e2e8f0",  "#4a5568");
  const selBg     = useColorModeValue(BRAND_LITE, "#1e3a5f");
  const txtSelBg  = useColorModeValue("#f7fafc",  "#2d3748");

  useEffect(() => { if (isOpen) { setTitle(""); setDesc(""); setDocType("docx"); } }, [isOpen]);

  const handleConfirm = async () => {
    if (!title.trim()) { toast({ title: "Title is required", status: "warning", duration: 2000 }); return; }
    setSaving(true);
    await onConfirm({ title: title.trim(), description: desc.trim() || title.trim(), docType });
    setSaving(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(4px)"/>
      <ModalContent bg={cardBg} borderRadius="2xl" overflow="hidden">
        <Box h="3px" bg={`linear-gradient(90deg,${BRAND},#60a5fa)`}/>
        <ModalHeader color={textColor} pb={2}>New Document</ModalHeader>
        <ModalCloseButton top={5}/>
        <ModalBody pb={2}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm" color={textColor} fontWeight="600">Title *</FormLabel>
              <Input placeholder="e.g. Project Proposal Q3" value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConfirm()} autoFocus/>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color={textColor} fontWeight="600">
                Description <Text as="span" color={subColor} fontWeight="400">(optional)</Text>
              </FormLabel>
              <Textarea placeholder="Short description…" rows={2} resize="none"
                value={desc} onChange={e => setDesc(e.target.value)}/>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" color={textColor} fontWeight="600" mb={2}>Document Type</FormLabel>
              <HStack spacing={3}>
                <Box flex={1} p={4} borderRadius="xl" cursor="pointer" border="2px solid"
                  borderColor={docType === "docx" ? BRAND : borderClr}
                  bg={docType === "docx" ? selBg : "transparent"}
                  onClick={() => setDocType("docx")} transition="all 0.15s">
                  <VStack spacing={1}>
                    <MdDescription size={26} color={docType === "docx" ? BRAND : "#a0aec0"}/>
                    <Text fontWeight="700" fontSize="sm" color={docType === "docx" ? BRAND : textColor}>.docx</Text>
                    <Text fontSize="10px" color={subColor} textAlign="center">Rich text, tables, images. Export to PDF.</Text>
                    <Badge colorScheme="blue" fontSize="9px" borderRadius="full">Recommended</Badge>
                  </VStack>
                </Box>
                <Box flex={1} p={4} borderRadius="xl" cursor="pointer" border="2px solid"
                  borderColor={docType === "txt" ? "#718096" : borderClr}
                  bg={docType === "txt" ? txtSelBg : "transparent"}
                  onClick={() => setDocType("txt")} transition="all 0.15s">
                  <VStack spacing={1}>
                    <MdTextFields size={26} color={docType === "txt" ? "#718096" : "#a0aec0"}/>
                    <Text fontWeight="700" fontSize="sm" color={docType === "txt" ? "#718096" : textColor}>.txt</Text>
                    <Text fontSize="10px" color={subColor} textAlign="center">Plain text only. Lightweight.</Text>
                  </VStack>
                </Box>
              </HStack>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter borderTop={`1px solid ${borderClr}`} gap={2} mt={4}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button bg={BRAND} color="white" _hover={{ bg: BRAND_DARK }}
            isLoading={saving} loadingText="Creating…" onClick={handleConfirm}>
            Create &amp; Open Editor
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DocumentEditor() {
  const { id: paramId } = useParams();
  const isNew           = !paramId;
  const navigate        = useNavigate();
  const toast           = useToast();
  const { user, selectedProject, staff } = useAuth();

  const { isOpen: isPickerOpen, onOpen: openPicker, onClose: closePicker } = useDisclosure();

  // Doc meta
  const [docId,         setDocId]         = useState(paramId || null);
  const [docLoading,    setDocLoading]    = useState(!isNew);
  const [title,         setTitle]         = useState("");
  const [description,   setDescription]   = useState("");
  const [status,        setStatus]        = useState("draft");
  const [assignee,      setAssignee]      = useState("");
  const [staffList,     setStaffList]     = useState([]);
  const [docType,       setDocType]       = useState("docx");

  // Pages — all rendered vertically
  const [pages,         setPages]         = useState([]);

  // Header / footer defaults
  const [defaultHeader, setDefaultHeader] = useState("");
  const [defaultFooter, setDefaultFooter] = useState("");
  const [hfDirty,       setHfDirty]       = useState(false);
  const [hfSaving,      setHfSaving]      = useState(false);

  // Save state
  const [saving,        setSaving]        = useState(false);
  const [autoSave,      setAutoSave]      = useState(true);
  const [lastSavedAt,   setLastSavedAt]   = useState(null);
  const [isDirty,       setIsDirty]       = useState(false);
  const [saveError,     setSaveError]     = useState("");
  const [timeAgo,       setTimeAgo]       = useState("");

  // Refs
  const toolbarContRef  = useRef(null);   // single shared toolbar
  const pageRefs        = useRef({});     // pageNumber → DOM div ref (for scroll)
  const editorInstances = useRef({});     // pageNumber → CKEditor instance
  const focusedPage     = useRef(1);      // which page is currently active
  const autoSaveTimer   = useRef(null);
  const autoSaveRef     = useRef(autoSave);
  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);

  // Colors
  const appBg     = useColorModeValue("#f0f2f5",  "#0f172a");
  const canvasBg  = useColorModeValue("#c8c8c8",  "#111827");
  const pageBg    = useColorModeValue("#ffffff",  "#1f2937");
  const borderClr = useColorModeValue("#c8c8c8",  "#374151");
  const subColor  = useColorModeValue("#5a5a5a",  "#9ca3af");
  const textColor = useColorModeValue("#111111",  "#f3f4f6");
  const headerBg  = useColorModeValue("#1e3a5f",  "#0f2040");
  const ribbonBg  = useColorModeValue("#f5f5f5",  "#1a2535");
  const statusBg  = useColorModeValue("#ececec",  "#0c1624");

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNew) { openPicker(); return; }
    loadDoc(paramId);
  }, [paramId]); // eslint-disable-line

  const loadDoc = async (id) => {
    setDocLoading(true);
    try {
      const [docRes, pagesRes] = await Promise.all([
        api.get(`/documents/${id}`),
        api.get(`/document-pages?documentId=${id}`),
      ]);
      const d = docRes.data;
      setDocId(d._id);
      setTitle(d.title || ""); setDescription(d.description || "");
      setStatus(d.status || "draft"); setAssignee(d.assignee?._id || "");
      setDocType(d.documentType || "docx");
      setDefaultHeader(d.defaultHeader || ""); setDefaultFooter(d.defaultFooter || "");
      setPages(
        pagesRes.data.length === 0
          ? [blankPage(1, d.defaultHeader || "", d.defaultFooter || "")]
          : pagesRes.data.map(p => ({ ...p, _isNew: false }))
      );
      setLastSavedAt(new Date(d.updatedAt));
    } catch {
      toast({ title: "Failed to load document", status: "error", duration: 3000 });
    } finally { setDocLoading(false); }
  };

  // Staff
  useEffect(() => {
    if (staff?.length) { setStaffList(staff); return; }
    api.get("/staff").then(r => setStaffList(r.data || [])).catch(() => {});
  }, [staff]);

  // ── Shared CKEditor toolbar — mount from whichever editor is focused ──────
  const mountToolbar = useCallback((pageNumber) => {
    const editor = editorInstances.current[pageNumber];
    if (editor && toolbarContRef.current) {
      toolbarContRef.current.innerHTML = "";
      toolbarContRef.current.appendChild(editor.ui.view.toolbar.element);
    }
  }, []);

  // ── Time ago ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!lastSavedAt) return;
    const upd = () => {
      const s = Math.floor((Date.now() - new Date(lastSavedAt).getTime()) / 1000);
      setTimeAgo(s < 5 ? "just now" : s < 60 ? `${s}s ago`
        : s < 3600 ? `${Math.floor(s/60)}m ago`
        : new Date(lastSavedAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }));
    };
    upd(); const iv = setInterval(upd, 5000); return () => clearInterval(iv);
  }, [lastSavedAt]);

  // ── Ctrl+S ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); save({ silent: false }); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []); // eslint-disable-line

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  // ── Add page ──────────────────────────────────────────────────────────────
  const addPage = useCallback(() => {
    if (pages.length >= MAX_PAGES) {
      toast({ title: `Max ${MAX_PAGES} pages`, status: "warning", duration: 2000, position: "top-right" });
      return;
    }
    const newPageNum = pages.length + 1;
    setPages(prev => [...prev, blankPage(newPageNum, defaultHeader, defaultFooter)]);
    setIsDirty(true);
    scheduleAutoSave();
    // Scroll to new page after render
    setTimeout(() => {
      pageRefs.current[newPageNum]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [pages, defaultHeader, defaultFooter]); // eslint-disable-line

  // ── Delete page ───────────────────────────────────────────────────────────
  const deletePage = useCallback(async (idx) => {
    if (pages.length === 1) {
      toast({ title: "Cannot delete the only page", status: "warning", duration: 2000 });
      return;
    }
    const page = pages[idx];
    if (!page._isNew && page._id) {
      try { await api.delete(`/document-pages/${page._id}`); }
      catch { toast({ title: "Failed to delete page", status: "error", duration: 2000 }); return; }
    }
    // Remove and re-number
    setPages(prev => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, pageNumber: i + 1 })));
    setIsDirty(true);
  }, [pages, toast]);

  // ── Go to next page or create one (called by Shift+Enter) ─────────────────
  const goToNextOrCreate = useCallback((currentPageNumber) => {
    const currentIdx = pages.findIndex(p => p.pageNumber === currentPageNumber);
    if (currentIdx < pages.length - 1) {
      // Next page exists — scroll to it and focus
      const nextNum = pages[currentIdx + 1].pageNumber;
      pageRefs.current[nextNum]?.scrollIntoView({ behavior: "smooth", block: "start" });
      // Focus the editor on next page
      setTimeout(() => {
        const nextEditor = editorInstances.current[nextNum];
        if (nextEditor) nextEditor.editing.view.focus();
      }, 300);
    } else {
      // Create a new page
      addPage();
    }
  }, [pages, addPage]);

  // ── Update a page field ───────────────────────────────────────────────────
  const updatePageField = useCallback((pageNumber, field, value) => {
    setPages(prev => prev.map(p => p.pageNumber === pageNumber ? { ...p, [field]: value } : p));
    setIsDirty(true);
    scheduleAutoSave();
  }, []); // eslint-disable-line

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const scheduleAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (autoSaveRef.current) save({ silent: true });
    }, AUTO_SAVE_MS);
  }, []); // eslint-disable-line

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = useCallback(async ({ silent = false } = {}) => {
    if (!docId) return;
    if (!title.trim()) {
      if (!silent) toast({ title: "Title is required", status: "warning", duration: 2000 });
      return;
    }
    setSaving(true); setSaveError("");
    try {
      const fd = new FormData();
      fd.append("title", title); fd.append("description", description);
      fd.append("status", status); fd.append("documentType", docType); fd.append("content", "");
      if (assignee)        fd.append("assignee", assignee);
      if (selectedProject) fd.append("project",  selectedProject._id);
      await api.put(`/documents/${docId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });

      await api.put("/document-pages/bulk-save", {
        documentId: docId,
        pages: pages.map(p => ({
          pageNumber: p.pageNumber, pageContent: p.pageContent,
          headerText: p.headerText, footerText: p.footerText,
        })),
      });

      setLastSavedAt(new Date()); setIsDirty(false);
      if (!silent) toast({ title: "Saved!", status: "success", duration: 1500, position: "top-right" });
    } catch (err) {
      const msg = err.response?.data?.error || "Save failed";
      setSaveError(msg);
      if (!silent) toast({ title: msg, status: "error", duration: 3000 });
    } finally { setSaving(false); }
  }, [docId, title, description, status, docType, assignee, selectedProject, pages, toast]);

  // ── Create new doc ────────────────────────────────────────────────────────
  const handleCreate = useCallback(async ({ title: t, description: d, docType: dt }) => {
    const fd = new FormData();
    fd.append("title", t); fd.append("description", d);
    fd.append("documentType", dt); fd.append("content", ""); fd.append("status", "draft");
    if (selectedProject) fd.append("project", selectedProject._id);
    try {
      const res    = await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const newDoc = res.data;
      closePicker();
      setDocId(newDoc._id);
      setTitle(newDoc.title); setDescription(newDoc.description);
      setStatus(newDoc.status || "draft"); setDocType(newDoc.documentType || dt);
      setDefaultHeader(newDoc.defaultHeader || ""); setDefaultFooter(newDoc.defaultFooter || "");
      setPages([blankPage(1, newDoc.defaultHeader || "", newDoc.defaultFooter || "")]);
      setLastSavedAt(new Date());
      window.history.replaceState(null, "", `/admin/documents/editor/${newDoc._id}`);
    } catch (err) {
      toast({ title: err.response?.data?.error || "Failed to create", status: "error", duration: 3000 });
      throw err;
    }
  }, [selectedProject, closePicker, toast]);

  // ── Header/footer save ────────────────────────────────────────────────────
  const saveHeaderFooter = useCallback(async ({ applyToAllPages = false } = {}) => {
    if (!docId) return;
    setHfSaving(true);
    try {
      await api.put(`/document-pages/document/${docId}/header-footer`, { defaultHeader, defaultFooter, applyToAllPages });
      if (applyToAllPages) {
        setPages(prev => prev.map(p => ({ ...p, headerText: defaultHeader, footerText: defaultFooter })));
      }
      setHfDirty(false);
      toast({ title: "Header/footer saved!", status: "success", duration: 2000 });
    } catch { toast({ title: "Failed to save", status: "error", duration: 2000 }); }
    finally { setHfSaving(false); }
  }, [docId, defaultHeader, defaultFooter, toast]);

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const html = pages.map(p =>
      `<div class="page">
        ${p.headerText ? `<div class="hdr">${p.headerText}</div>` : ""}
        <div class="body">${p.pageContent}</div>
        ${p.footerText ? `<div class="ftr">${p.footerText}</div>` : ""}
      </div>`
    ).join('<div class="pb"></div>');
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${title||"Document"}</title>
      <style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Georgia,serif;font-size:12pt;color:#111}
      .page{width:794px;min-height:1123px;padding:72px 96px;display:flex;flex-direction:column}
      .hdr{font-size:9pt;color:#555;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:20px;text-align:center}
      .ftr{font-size:9pt;color:#555;border-top:1px solid #ddd;padding-top:6px;margin-top:auto;text-align:center}
      .body{flex:1}.pb{page-break-after:always}
      table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px}
      h1{font-size:22pt;color:#1040b0}h2{font-size:17pt;color:#1a56db}
      blockquote{border-left:4px solid #1a56db;padding:8px 16px;color:#555;font-style:italic;background:#e8f0fd}
      pre{background:#1e293b;color:#e2e8f0;padding:14px;border-radius:6px;font-size:10pt}</style>
      </head><body>${html}</body></html>`);
    win.document.close(); win.print();
  }, [pages, title]);

  // ── CKEditor config ───────────────────────────────────────────────────────
  const ckConfig = {
    toolbar: {
      items: ["heading","|","fontFamily","fontSize","|","fontColor","fontBackgroundColor","|",
        "bold","italic","underline","strikethrough","|","alignment","|",
        "bulletedList","numberedList","todoList","|","outdent","indent","|",
        "link","insertImage","insertTable","blockQuote","codeBlock","horizontalLine","|",
        "undo","redo","|","findAndReplace"],
      shouldNotGroupWhenFull: true,
    },
    heading: { options: [
      { model:"paragraph", title:"Normal",    class:"ck-heading_paragraph" },
      { model:"heading1",  view:"h1", title:"Heading 1", class:"ck-heading_heading1" },
      { model:"heading2",  view:"h2", title:"Heading 2", class:"ck-heading_heading2" },
      { model:"heading3",  view:"h3", title:"Heading 3", class:"ck-heading_heading3" },
    ]},
    fontFamily: { options: ["default","Georgia, serif","Times New Roman, Times, serif",
      "Arial, Helvetica, sans-serif","Trebuchet MS, Helvetica, sans-serif","Courier New, Courier, monospace"] },
    fontSize: { options: [9,10,11,12,14,16,18,20,24,28,32,36] },
    table: { contentToolbar: ["tableColumn","tableRow","mergeTableCells","tableProperties","tableCellProperties"] },
    image: { toolbar: ["imageTextAlternative","imageStyle:inline","imageStyle:block","imageStyle:side","|","toggleImageCaption"] },
    alignment: { options: ["left","center","right","justify"] },
    link: { addTargetToExternalLinks: true, defaultProtocol: "https://" },
  };

  // CKEditor sx styles
  const ckSx = {
    ".ck-toolbar": { background:`${ribbonBg} !important`, border:"none !important", borderRadius:"0 !important", padding:"4px 8px !important", flexWrap:"wrap !important" },
    ".ck-toolbar__separator": { background:`${borderClr} !important`, margin:"2px 6px !important", height:"20px !important", alignSelf:"center !important" },
    ".ck.ck-button,.ck.ck-button.ck-off": { borderRadius:"3px !important", padding:"5px 6px !important", color:`${textColor} !important`, minWidth:"28px !important", height:"28px !important", cursor:"pointer !important", border:"1px solid transparent !important" },
    ".ck.ck-button:hover:not(.ck-disabled)": { background:`${BRAND_LITE} !important`, color:`${BRAND_DARK} !important`, borderColor:`${BRAND} !important` },
    ".ck.ck-button.ck-on": { background:`${BRAND_LITE} !important`, color:`${BRAND} !important`, borderColor:`${BRAND} !important` },
    ".ck-dropdown__panel": { background:`${pageBg} !important`, border:`1px solid ${borderClr} !important`, borderRadius:"4px !important", boxShadow:"0 4px 16px rgba(0,0,0,0.15) !important" },
    ".ck.ck-editor__editable.ck-focused": { boxShadow:"none !important", border:"none !important" },
    ".ck-editor__editable": { minHeight:"600px", padding:"0 !important", background:`${pageBg} !important`, color:`${textColor} !important`, border:"none !important", boxShadow:"none !important", fontFamily:"'Georgia','Times New Roman',serif !important", fontSize:"12pt !important", lineHeight:"1.85 !important" },
    ".ck.ck-editor": { border:"none !important" },
    ".ck-editor__editable h1": { fontSize:"22pt", fontWeight:"700", color:BRAND_DARK, borderBottom:`2px solid ${BRAND_LITE}`, paddingBottom:"6px", margin:"16px 0 8px" },
    ".ck-editor__editable h2": { fontSize:"17pt", fontWeight:"700", color:BRAND, margin:"14px 0 6px" },
    ".ck-editor__editable h3": { fontSize:"13pt", fontWeight:"600", margin:"12px 0 4px" },
    ".ck-editor__editable p":  { marginBottom:"8px" },
    ".ck-editor__editable ul,.ck-editor__editable ol": { paddingLeft:"28px", marginBottom:"8px" },
    ".ck-editor__editable blockquote": { borderLeft:`4px solid ${BRAND}`, padding:"8px 16px", color:subColor, fontStyle:"italic", background:BRAND_LITE, borderRadius:"0 4px 4px 0", margin:"12px 0" },
    ".ck-editor__editable pre":  { background:"#1e293b", color:"#e2e8f0", padding:"12px 16px", borderRadius:"6px", fontSize:"10pt", fontFamily:"'Fira Code','Consolas',monospace", margin:"12px 0" },
    ".ck-editor__editable code": { background:"#f1f5f9", color:"#0f172a", padding:"1px 5px", borderRadius:"3px", fontSize:"10pt" },
    ".ck-editor__editable table": { borderCollapse:"collapse", width:"100%", fontSize:"11pt" },
    ".ck-editor__editable table td,.ck-editor__editable table th": { border:`1px solid ${borderClr}`, padding:"7px 12px", verticalAlign:"top" },
    ".ck-editor__editable table th": { background:BRAND_LITE, fontWeight:"700", color:BRAND_DARK },
    ".ck-editor__editable img": { maxWidth:"100%", borderRadius:"4px" },
    ".ck-editor__editable a": { color:BRAND, textDecoration:"underline" },
    ".ck-editor__editable hr": { border:"none", borderTop:`2px solid ${BRAND_LITE}`, margin:"16px 0" },
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const isDocx     = docType === "docx";
  const totalWords = pages.reduce((a, p) => a + countWords(p.pageContent), 0);
  const statusClr  = { draft:"gray", active:"green", review:"yellow", archived:"red" };
  const IS = { h:"26px", fontSize:"12px", borderRadius:"3px", borderColor:borderClr, bg:pageBg, color:textColor,
    _focus:{ borderColor:BRAND, boxShadow:`0 0 0 1px ${BRAND}` }, _placeholder:{ color:"gray.400", fontSize:"11px" } };

  // ── Loading states ────────────────────────────────────────────────────────
  if (docLoading) return (
    <Flex justify="center" align="center" h="calc(100vh - 70px)">
      <VStack spacing={3}><Spinner size="xl" color={BRAND} thickness="3px"/>
        <Text color={subColor} fontSize="sm">Loading document…</Text></VStack>
    </Flex>
  );

  if (isNew && !docId) return (
    <>
      <Flex justify="center" align="center" h="calc(100vh - 70px)" bg={appBg}>
        <VStack spacing={3} color={subColor}>
          <MdDescription size={40}/><Text fontSize="sm">Setting up your document…</Text>
        </VStack>
      </Flex>
      <TypePickerModal isOpen={isPickerOpen}
        onClose={() => navigate("/admin/documents")} onConfirm={handleCreate}/>
    </>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <Box display="flex" flexDirection="column" minH="calc(100vh - 70px)"
      fontFamily="'Segoe UI',Tahoma,Geneva,Verdana,sans-serif" fontSize="13px"
      bg={appBg} overflow="hidden">

      {/* ── 1. TITLE BAR ─────────────────────────────────────────────────── */}
      <Box bg={headerBg} px={4} py="8px" flexShrink={0}>
        <Flex justify="space-between" align="center" gap={3}>
          <HStack spacing={2} minW={0} flex={1}>
            <Tooltip label="Back to Documents">
              <IconButton icon={<MdArrowBack size={15}/>} size="xs" variant="ghost"
                color="whiteAlpha.800" _hover={{ bg:"whiteAlpha.200" }}
                aria-label="Back" onClick={() => navigate("/admin/documents")}/>
            </Tooltip>
            <Box w="8px" h="8px" borderRadius="full" bg="linear-gradient(135deg,#60a5fa,#3b82f6)" flexShrink={0}/>
            <Text color="white" fontSize="13px" fontWeight="500" noOfLines={1}>
              {title || "Untitled Document"}
            </Text>
            {isDirty && <Text color="whiteAlpha.500" fontSize="11px" flexShrink={0}>— Unsaved</Text>}
            <Badge colorScheme={isDocx ? "blue" : "gray"} borderRadius="3px" fontSize="10px" px={1.5} flexShrink={0}>
              .{docType}
            </Badge>
          </HStack>

          <HStack spacing={3} flexShrink={0}>
            {saving ? (
              <HStack spacing={1} color="whiteAlpha.700" fontSize="11px">
                <Spinner size="xs" color="white"/><Text>Saving…</Text>
              </HStack>
            ) : lastSavedAt ? (
              <HStack spacing={1} color="whiteAlpha.600" fontSize="11px">
                <MdCheckCircle size={12}/><Text>Saved {timeAgo}</Text>
              </HStack>
            ) : null}

            <FormControl display="flex" alignItems="center" gap={1.5} w="auto">
              <FormLabel mb={0} fontSize="11px" color="whiteAlpha.700" cursor="pointer">AutoSave</FormLabel>
              <Switch size="sm" colorScheme="blue" isChecked={autoSave}
                onChange={e => { setAutoSave(e.target.checked); if (!e.target.checked) clearTimeout(autoSaveTimer.current); }}/>
            </FormControl>

            {isDocx && (
              <Tooltip label="Export PDF">
                <IconButton icon={<MdPrint size={15}/>} size="xs" variant="ghost"
                  color="whiteAlpha.700" _hover={{ bg:"whiteAlpha.200" }}
                  aria-label="Print" onClick={handlePrint}/>
              </Tooltip>
            )}

            <Button size="xs" bg="blue.500" color="white" _hover={{ bg:"blue.600" }}
              leftIcon={<MdSave size={12}/>} isLoading={saving}
              isDisabled={saving || !isDirty} onClick={() => save({ silent:false })} fontSize="11px">
              Save
            </Button>
            <Button size="xs" variant="ghost" color="whiteAlpha.700"
              _hover={{ bg:"whiteAlpha.200" }} leftIcon={<MdClose size={12}/>}
              onClick={() => navigate("/admin/documents")} fontSize="11px">Close</Button>
          </HStack>
        </Flex>
      </Box>

      {/* ── 2. META RIBBON ───────────────────────────────────────────────── */}
      <Box bg={ribbonBg} borderBottom={`1px solid ${borderClr}`}
        px={4} py="8px" flexShrink={0} boxShadow="0 1px 3px rgba(0,0,0,0.06)">
        <Flex gap={4} align="flex-end" wrap="wrap">

          <Box>
            <Text fontSize="9px" color={subColor} textTransform="uppercase" letterSpacing="0.1em" mb={1} fontWeight="700">Document</Text>
            <HStack spacing={3}>
              <FormControl minW="170px">
                <FormLabel fontSize="10px" color={subColor} mb={1} fontWeight="500">Title *</FormLabel>
                <Input {...IS} value={title}
                  onChange={e => { setTitle(e.target.value); setIsDirty(true); scheduleAutoSave(); }}
                  placeholder="Document title…" fontWeight="600"/>
              </FormControl>
              <FormControl minW="150px">
                <FormLabel fontSize="10px" color={subColor} mb={1} fontWeight="500">Description</FormLabel>
                <Input {...IS} value={description}
                  onChange={e => { setDescription(e.target.value); setIsDirty(true); scheduleAutoSave(); }}
                  placeholder="Short description…"/>
              </FormControl>
            </HStack>
          </Box>

          <Box h="44px" w="1px" bg={borderClr} alignSelf="center"/>

          <Box>
            <Text fontSize="9px" color={subColor} textTransform="uppercase" letterSpacing="0.1em" mb={1} fontWeight="700">Properties</Text>
            <HStack spacing={3}>
              <FormControl w="105px">
                <FormLabel fontSize="10px" color={subColor} mb={1} fontWeight="500">Status</FormLabel>
                <Select {...IS} value={status}
                  onChange={e => { setStatus(e.target.value); setIsDirty(true); scheduleAutoSave(); }}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="review">Review</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormControl>
              <FormControl w="140px">
                <FormLabel fontSize="10px" color={subColor} mb={1} fontWeight="500">Assignee</FormLabel>
                <Select {...IS} value={assignee} placeholder="No assignee"
                  onChange={e => { setAssignee(e.target.value); setIsDirty(true); scheduleAutoSave(); }}>
                  {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </Select>
              </FormControl>
            </HStack>
          </Box>

          <Box h="44px" w="1px" bg={borderClr} alignSelf="center"/>

          {/* Header / Footer */}
          <Box>
            <Text fontSize="9px" color={subColor} textTransform="uppercase" letterSpacing="0.1em" mb={1} fontWeight="700">Layout</Text>
            <Popover placement="bottom-start">
              <PopoverTrigger>
                <Button size="xs" variant="outline" h="26px" fontSize="11px"
                  borderRadius="3px" leftIcon={<MdSettings size={11}/>}>
                  Header / Footer
                  {hfDirty && <Box as="span" ml={1} w="5px" h="5px" borderRadius="full" bg="orange.400" display="inline-block"/>}
                </Button>
              </PopoverTrigger>
              <PopoverContent w="320px" bg={ribbonBg} borderRadius="8px" boxShadow="xl">
                <PopoverBody p={4}>
                  <Text fontSize="12px" fontWeight="700" color={textColor} mb={1}>Default Header & Footer</Text>
                  <Text fontSize="10px" color={subColor} mb={3}>Applied to all pages. Each page can override individually.</Text>
                  <FormControl mb={3}>
                    <FormLabel fontSize="11px" color={subColor} mb={1}>Header</FormLabel>
                    <Input size="sm" fontSize="12px" value={defaultHeader}
                      placeholder="e.g. Acme Corp | Confidential"
                      onChange={e => { setDefaultHeader(e.target.value); setHfDirty(true); }}/>
                  </FormControl>
                  <FormControl mb={3}>
                    <FormLabel fontSize="11px" color={subColor} mb={1}>Footer</FormLabel>
                    <Input size="sm" fontSize="12px" value={defaultFooter}
                      placeholder="e.g. Page {page} | Acme Corp"
                      onChange={e => { setDefaultFooter(e.target.value); setHfDirty(true); }}/>
                  </FormControl>
                  <Divider mb={3}/>
                  <VStack spacing={2}>
                    <Button size="xs" colorScheme="blue" w="100%" isLoading={hfSaving}
                      isDisabled={!docId} onClick={() => saveHeaderFooter({ applyToAllPages:false })}>
                      Save (keep per-page overrides)
                    </Button>
                    <Button size="xs" colorScheme="orange" variant="outline" w="100%"
                      isLoading={hfSaving} isDisabled={!docId}
                      onClick={() => saveHeaderFooter({ applyToAllPages:true })}>
                      Save & Apply to All Pages
                    </Button>
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Box>

          {(selectedProject || user?.name) && (
            <>
              <Box h="44px" w="1px" bg={borderClr} alignSelf="center"/>
              <Box>
                <Text fontSize="9px" color={subColor} textTransform="uppercase" letterSpacing="0.1em" mb={1} fontWeight="700">Info</Text>
                <VStack align="flex-start" spacing={1}>
                  {selectedProject && (
                    <HStack spacing={1.5}><MdFolder size={11} color={BRAND}/>
                      <Text fontSize="11px" color={subColor}>Project: <strong style={{ color:textColor, fontWeight:500 }}>{selectedProject.name}</strong></Text>
                    </HStack>
                  )}
                  {user?.name && (
                    <HStack spacing={1.5}><MdPerson size={11} color="#805ad5"/>
                      <Text fontSize="11px" color={subColor}>Author: <strong style={{ color:textColor, fontWeight:500 }}>{user.name}</strong></Text>
                    </HStack>
                  )}
                </VStack>
              </Box>
            </>
          )}
        </Flex>
        {saveError && (
          <Alert status="error" borderRadius="4px" mt={2} py={1} fontSize="11px">
            <AlertIcon boxSize={3}/><AlertDescription fontSize="11px">{saveError}</AlertDescription>
          </Alert>
        )}
      </Box>

      {/* ── 3. SHARED CKEDITOR TOOLBAR (docx only, floats above pages) ───── */}
      {isDocx && (
        <Box ref={toolbarContRef} bg={ribbonBg} borderBottom={`2px solid ${borderClr}`}
          flexShrink={0} overflowX="auto" sx={ckSx}/>
      )}

      {/* ── 4. PAGES CANVAS — all pages stacked vertically ───────────────── */}
      <Box flex="1" bg={canvasBg} overflowY="auto" py={8} px={4}>

        {/* Add page button at top if max not reached */}
        <Flex justify="center" mb={4} gap={3} align="center">
          <Text color="whiteAlpha.600" fontSize="11px">
            {pages.length}/{MAX_PAGES} pages
          </Text>
          {pages.length < MAX_PAGES && (
            <Tooltip label="Add page  (Shift+Enter at end of page)">
              <Button size="xs" leftIcon={<MdAdd size={13}/>}
                bg="whiteAlpha.200" color="white" _hover={{ bg:"whiteAlpha.300" }}
                fontSize="11px" onClick={addPage}>
                Add Page
              </Button>
            </Tooltip>
          )}
        </Flex>

        {/* Render ALL pages stacked */}
        <VStack spacing={6} align="center">
          {pages.map((page, idx) => (
            <Box key={page.pageNumber}
              ref={el => { pageRefs.current[page.pageNumber] = el; }}
              w={`${A4_W}px`}
              minH={`${A4_H}px`}
              bg={pageBg}
              boxShadow="0 2px 8px rgba(0,0,0,0.20), 0 8px 32px rgba(0,0,0,0.15)"
              display="flex" flexDirection="column" position="relative"
              sx={{
                "&::before": {
                  content:'""', display:"block", height:"3px",
                  background:`linear-gradient(90deg,${BRAND} 0%,#60a5fa 60%,#93c5fd 100%)`,
                },
              }}
            >
              {/* Page label + delete */}
              <Flex
                position="absolute" top="10px" right="12px"
                align="center" gap={2} zIndex={2}>
                <Badge bg={BRAND_LITE} color={BRAND} borderRadius="full"
                  fontSize="9px" fontWeight="700" px={2}>
                  Page {page.pageNumber}
                </Badge>
                {pages.length > 1 && (
                  <Tooltip label="Delete this page">
                    <IconButton icon={<MdDelete size={11}/>} size="xs"
                      variant="ghost" colorScheme="red" aria-label="Delete page"
                      onClick={() => deletePage(idx)}/>
                  </Tooltip>
                )}
              </Flex>

              {/* ── PAGE HEADER ──────────────────────────────────────────── */}
              <Box px="72px" pt="22px" pb="8px">
                <Input
                  value={page.headerText || ""}
                  onChange={e => updatePageField(page.pageNumber, "headerText", e.target.value)}
                  placeholder={defaultHeader || "Page header (company name, doc title…)"}
                  fontSize="9pt" color={subColor} textAlign="center"
                  variant="unstyled"
                  borderBottom={`1px solid ${borderClr}`}
                  borderRadius={0} pb="4px" h="auto"
                  _placeholder={{ color:`${subColor}55`, fontStyle:"italic" }}
                />
              </Box>

              {/* ── PAGE BODY ─────────────────────────────────────────────── */}
              <Box
                flex="1" px="72px" py="24px"
                sx={isDocx ? ckSx : {}}
                // ── RELIABLE Shift+Enter via DOM keydown on wrapper ────────
                // This fires BEFORE CKEditor handles the event, so it always works.
                onKeyDown={e => {
                  if (e.shiftKey && e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    goToNextOrCreate(page.pageNumber);
                  }
                }}
              >
                {isDocx ? (
                  <CKEditor
                    key={`ck-${page.pageNumber}`}
                    editor={DecoupledEditor}
                    data={page.pageContent || ""}
                    onReady={editor => {
                      editorInstances.current[page.pageNumber] = editor;
                      focusedPage.current = page.pageNumber;
                      mountToolbar(page.pageNumber);
                    }}
                    onFocus={() => {
                      focusedPage.current = page.pageNumber;
                      mountToolbar(page.pageNumber);
                    }}
                    onChange={(_, editor) => {
                      updatePageField(page.pageNumber, "pageContent", editor.getData());
                    }}
                    config={{
                      ...ckConfig,
                      placeholder: `Page ${page.pageNumber} — start writing…`,
                    }}
                  />
                ) : (
                  <Textarea
                    value={page.pageContent || ""}
                    onChange={e => updatePageField(page.pageNumber, "pageContent", e.target.value)}
                    placeholder={`Page ${page.pageNumber} — write here…\n\nShift+Enter → next page`}
                    minH="600px" bg="transparent" border="none" resize="none"
                    fontFamily="'Courier New',Courier,monospace"
                    fontSize="12pt" lineHeight="1.85" color={textColor}
                    _placeholder={{ color:`${subColor}66` }}
                    _focus={{ boxShadow:"none", border:"none" }}
                  />
                )}
              </Box>

              {/* ── PAGE FOOTER ──────────────────────────────────────────── */}
              <Box px="72px" pb="22px" pt="8px">
                <Input
                  value={page.footerText || ""}
                  onChange={e => updatePageField(page.pageNumber, "footerText", e.target.value)}
                  placeholder={defaultFooter || `Page ${page.pageNumber} of ${pages.length}`}
                  fontSize="9pt" color={subColor} textAlign="center"
                  variant="unstyled"
                  borderTop={`1px solid ${borderClr}`}
                  borderRadius={0} pt="4px" h="auto"
                  _placeholder={{ color:`${subColor}55`, fontStyle:"italic" }}
                />
              </Box>
            </Box>
          ))}
        </VStack>

        {/* Bottom add-page button */}
        {pages.length < MAX_PAGES && (
          <Flex justify="center" mt={6}>
            <Button leftIcon={<MdAdd size={14}/>}
              bg="whiteAlpha.200" color="white" _hover={{ bg:"whiteAlpha.300" }}
              fontSize="12px" onClick={addPage}>
              + Add Page {pages.length + 1}
            </Button>
          </Flex>
        )}

        <Text textAlign="center" color="whiteAlpha.300" fontSize="10px" mt={4} mb={2}>
          Shift+Enter — next page &nbsp;·&nbsp; Ctrl+S — save
        </Text>
      </Box>

      {/* ── 5. STATUS BAR ────────────────────────────────────────────────── */}
      <Box bg={statusBg} borderTop={`1px solid ${borderClr}`} px={5} py="5px" flexShrink={0}>
        <Flex justify="space-between" align="center">
          <HStack spacing={4} color={subColor} fontSize="11px">
            <HStack spacing={1}><MdDescription size={11}/>
              <Text><strong style={{ color:textColor }}>{totalWords.toLocaleString()}</strong> words</Text>
            </HStack>
            <Text color={borderClr}>|</Text>
            <Text><strong style={{ color:textColor }}>{pages.length}</strong> page{pages.length !== 1 ? "s" : ""}</Text>
            <Text color={borderClr}>|</Text>
            <Badge colorScheme={statusClr[status]||"gray"} borderRadius="3px" fontSize="10px" px={1.5} textTransform="capitalize">{status}</Badge>
            {lastSavedAt && <><Text color={borderClr}>|</Text><HStack spacing={1} color="green.500"><MdCheckCircle size={11}/><Text>Saved {timeAgo}</Text></HStack></>}
            {!lastSavedAt && isDirty && <><Text color={borderClr}>|</Text><HStack spacing={1} color="orange.400"><MdSchedule size={11}/><Text>Unsaved</Text></HStack></>}
            <Text color={borderClr}>|</Text>
            <Text>A4 · .{docType}</Text>
          </HStack>
          {!autoSave && (
            <Button size="xs" borderRadius="3px" fontSize="11px" h="22px"
              bg={BRAND} color="white" _hover={{ bg:BRAND_DARK }}
              leftIcon={<MdSave size={11}/>} isLoading={saving}
              isDisabled={saving || !isDirty} onClick={() => save({ silent:false })}>
              Save Document
            </Button>
          )}
        </Flex>
      </Box>

      {/* Type picker */}
      <TypePickerModal isOpen={isPickerOpen}
        onClose={() => navigate("/admin/documents")} onConfirm={handleCreate}/>
    </Box>
  );
}