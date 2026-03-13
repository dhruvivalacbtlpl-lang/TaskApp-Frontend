/**
 * DocumentEditor.jsx
 * Full-featured A4 document editor — clean, professional, no "Word" branding.
 * Toolbar: font family, size, color, highlight, margins, table, image, alignment, lists, etc.
 *
 * ─── INSTALL (if not already) ─────────────────────────────────────────────
 *  npm install @ckeditor/ckeditor5-react
 *  npm install @ckeditor/ckeditor5-build-decoupled-document
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Routes:
 *   /documents/editor          → create new
 *   /documents/editor/:id      → edit existing
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CKEditor }         from "@ckeditor/ckeditor5-react";
import DecoupledEditor      from "@ckeditor/ckeditor5-build-decoupled-document";
import {
  Box, Flex, HStack, VStack, Input, Select, Text, Badge,
  Button, Switch, FormControl, FormLabel, Tooltip, Spinner,
  useColorModeValue, useToast, Alert, AlertIcon, AlertDescription,
  IconButton, Popover, PopoverTrigger, PopoverContent, PopoverBody,
  Slider, SliderTrack, SliderFilledTrack, SliderThumb, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Divider, Grid, GridItem,
} from "@chakra-ui/react";
import {
  MdSave, MdClose, MdCheckCircle, MdSchedule, MdArrowBack,
  MdDescription, MdPerson, MdFolder, MdSettings, MdPrint,
  MdFileDownload, MdZoomIn, MdZoomOut,
} from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

// ─── Constants ──────────────────────────────────────────────────────────────
const AUTO_SAVE_DELAY = 3000;

// A4 at 96dpi: 794px wide, 1123px tall
const A4_W = 794;
const A4_H = 1123;

const countWords = (html) => {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
};
const countChars = (html) => {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, "").length;
};

// Brand colour
const BRAND      = "#1a56db";
const BRAND_DARK = "#1040b0";
const BRAND_LITE = "#e8f0fd";

// ─── Margin presets ─────────────────────────────────────────────────────────
const MARGIN_PRESETS = {
  Normal:   { top:96, right:96, bottom:96, left:96 },
  Narrow:   { top:48, right:48, bottom:48, left:48 },
  Wide:     { top:96, right:144, bottom:96, left:144 },
  Moderate: { top:96, right:72, bottom:96, left:72 },
};

export default function DocumentEditor() {
  const { id: paramId } = useParams();
  const docId            = paramId || null;
  const isEditMode       = !!docId;
  const navigate         = useNavigate();
  const toast            = useToast();
  const { user, selectedProject, staff } = useAuth();

  // ── Form ────────────────────────────────────────────────────────────────
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [status,       setStatus]       = useState("draft");
  const [assignee,     setAssignee]     = useState("");
  const [content,      setContent]      = useState("");
  const [staffList,    setStaffList]    = useState([]);

  // ── Editor meta ──────────────────────────────────────────────────────────
  const [autoSave,      setAutoSave]      = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [lastSavedAt,   setLastSavedAt]   = useState(null);
  const [isDirty,       setIsDirty]       = useState(false);
  const [loading,       setLoading]       = useState(isEditMode);
  const [currentDocId,  setCurrentDocId]  = useState(docId);
  const [saveError,     setSaveError]     = useState("");
  const [timeAgo,       setTimeAgo]       = useState("");
  const [zoom,          setZoom]          = useState(100);
  const [editorRef,     setEditorRef]     = useState(null);
  const [toolbarRef,    setToolbarRef]    = useState(null);

  // ── Page margins (px) ────────────────────────────────────────────────────
  const [margins, setMargins] = useState(MARGIN_PRESETS.Normal);

  const savedSnapshot     = useRef({ title:"", description:"", status:"draft", assignee:"", content:"" });
  const autoSaveTimer     = useRef(null);
  const autoSaveRef       = useRef(autoSave);
  const saveControllerRef = useRef(null);
  const toolbarContRef    = useRef(null);
  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);

  // ── Colours ──────────────────────────────────────────────────────────────
  const appBg      = useColorModeValue("#f0f0f0", "#0f172a");
  const canvasBg   = useColorModeValue("#d8d8d8", "#111827");
  const pageBg     = useColorModeValue("#ffffff", "#1f2937");
  const borderClr  = useColorModeValue("#c0c0c0", "#374151");
  const subColor   = useColorModeValue("#5a5a5a", "#9ca3af");
  const textColor  = useColorModeValue("#111111", "#f3f4f6");
  const headerBg   = useColorModeValue("#1e3a5f", "#0f2040");
  const ribbonBg   = useColorModeValue("#f7f7f7", "#1a2535");
  const statusBg   = useColorModeValue("#ececec", "#0c1624");

  // ── Load doc ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;
    api.get(`/documents/${docId}`)
      .then(res => {
        const d    = res.data;
        const snap = {
          title:       d.title        || "",
          description: d.description  || "",
          status:      d.status       || "draft",
          assignee:    d.assignee?._id || "",
          content:     d.content      || "",
        };
        Object.entries(snap).forEach(([k, v]) => {
          ({ title:setTitle, description:setDescription, status:setStatus,
             assignee:setAssignee, content:setContent })[k]?.(v);
        });
        if (d.updatedAt) setLastSavedAt(new Date(d.updatedAt));
        savedSnapshot.current = snap;
      })
      .catch(() => toast({ title:"Failed to load document", status:"error", duration:3000 }))
      .finally(() => setLoading(false));
  }, [docId, isEditMode]); // eslint-disable-line

  useEffect(() => {
    if (staff?.length) { setStaffList(staff); return; }
    api.get("/staff").then(r => setStaffList(r.data || [])).catch(() => {});
  }, [staff]);

  // ── Ctrl+S ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!autoSaveRef.current) save({ silent:false });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []); // eslint-disable-line

  // ── "X ago" ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!lastSavedAt) return;
    const upd = () => {
      const s = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
      setTimeAgo(s < 5 ? "just now" : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s/60)}m ago`
        : lastSavedAt.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }));
    };
    upd(); const iv = setInterval(upd, 5000); return () => clearInterval(iv);
  }, [lastSavedAt]);

  useEffect(() => () => {
    clearTimeout(autoSaveTimer.current);
    saveControllerRef.current?.abort();
  }, []);

  // ── Decoupled editor ready: mount toolbar ────────────────────────────────
  const onEditorReady = useCallback((editor) => {
    setEditorRef(editor);
    if (toolbarContRef.current) {
      toolbarContRef.current.innerHTML = "";
      toolbarContRef.current.appendChild(editor.ui.view.toolbar.element);
    }
    setToolbarRef(editor.ui.view.toolbar.element);
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = useCallback(async ({ silent = false } = {}) => {
    if (!title.trim()) {
      if (!silent) toast({ title:"Title is required", status:"warning", duration:2000 });
      return;
    }
    saveControllerRef.current?.abort();
    saveControllerRef.current = new AbortController();
    const { signal } = saveControllerRef.current;
    setSaving(true); setSaveError("");

    const fd = new FormData();
    fd.append("title",       title);
    fd.append("description", description);
    fd.append("status",      status);
    fd.append("content",     content);
    if (assignee)        fd.append("assignee", assignee);
    if (selectedProject) fd.append("project",  selectedProject._id);

    try {
      const cfg = { headers:{ "Content-Type":"multipart/form-data" }, signal };
      let res;
      if (currentDocId) {
        res = await api.put(`/documents/${currentDocId}`, fd, cfg);
      } else {
        res = await api.post("/documents", fd, cfg);
        setCurrentDocId(res.data._id);
      }
      setLastSavedAt(new Date()); setIsDirty(false);
      savedSnapshot.current = { title, description, status, assignee, content };
      if (!silent) toast({ title:"Saved!", status:"success", duration:1500, position:"top-right" });
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      const msg = err.response?.data?.error || "Save failed";
      setSaveError(msg);
      if (!silent) toast({ title:msg, status:"error", duration:3000 });
    } finally { setSaving(false); }
  }, [title, description, content, status, assignee, selectedProject, currentDocId]); // eslint-disable-line

  const scheduleAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (autoSaveRef.current) save({ silent:true });
    }, AUTO_SAVE_DELAY);
  }, [save]);

  const onField = (setter) => (e) => {
    setter(e.target.value); setIsDirty(true); scheduleAutoSave();
  };

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

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html><html><head>
      <style>
        @page { size: A4; margin: ${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px; }
        body { font-family: 'Georgia', serif; font-size: 12pt; line-height: 1.8; color:#111; margin:0; }
        h1,h2,h3 { font-family: 'Trebuchet MS', sans-serif; }
        table { border-collapse:collapse; width:100%; }
        td,th { border:1px solid #ccc; padding:6px 10px; }
      </style></head><body>${content}</body></html>`);
    win.document.close(); win.print();
  };

  const wordCount = countWords(content);
  const charCount = countChars(content);
  const statusColors = { draft:"gray", active:"green", review:"yellow", archived:"red" };
  const manualSaveDisabled = saving || (!isDirty && !!currentDocId);

  // tiny input style
  const IS = {
    h:"26px", fontSize:"12px", borderRadius:"3px",
    borderColor: borderClr, bg: pageBg, color: textColor,
    _focus:{ borderColor:BRAND, boxShadow:`0 0 0 1px ${BRAND}` },
    _placeholder:{ color:"gray.400", fontSize:"11px" },
  };

  if (loading) return (
    <Flex justify="center" align="center" h="60vh">
      <VStack spacing={4}>
        <Spinner size="xl" color={BRAND} thickness="3px"/>
        <Text color={subColor} fontSize="sm">Loading document…</Text>
      </VStack>
    </Flex>
  );

  return (
    <Box
      display="flex"
      flexDirection="column"
      minH="calc(100vh - 70px)"
      fontFamily="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      fontSize="13px"
      overflow="hidden"
      bg={appBg}
    >

      {/* ════════════════════════════════════════════════════════
          1 ▸ TITLE BAR
      ════════════════════════════════════════════════════════ */}
      <Box bg={headerBg} px={4} py="8px" flexShrink={0}>
        <Flex justify="space-between" align="center" gap={3}>

          {/* Back + title */}
          <HStack spacing={2} minW={0} flex={1}>
            <Tooltip label="Back to Documents">
              <IconButton icon={<MdArrowBack size={15}/>} size="xs" variant="ghost"
                color="whiteAlpha.800" _hover={{ bg:"whiteAlpha.200" }}
                aria-label="Back" onClick={() => navigate("/admin/documents")}/>
            </Tooltip>
            {/* Brand dot */}
            <Box w="8px" h="8px" borderRadius="full"
              bg="linear-gradient(135deg,#60a5fa,#3b82f6)" flexShrink={0}/>
            <Text color="white" fontSize="13px" fontWeight="500" noOfLines={1}>
              {title || "Untitled Document"}
            </Text>
            {isDirty && <Text color="whiteAlpha.500" fontSize="11px" flexShrink={0}>— Unsaved</Text>}
          </HStack>

          {/* Right: indicators + controls */}
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
                onChange={e => {
                  setAutoSave(e.target.checked);
                  if (!e.target.checked) clearTimeout(autoSaveTimer.current);
                }}/>
            </FormControl>

            <Tooltip label="Print / Export PDF">
              <IconButton icon={<MdPrint size={15}/>} size="xs" variant="ghost"
                color="whiteAlpha.700" _hover={{ bg:"whiteAlpha.200" }}
                aria-label="Print" onClick={handlePrint}/>
            </Tooltip>

            {!autoSave && (
              <Tooltip label="Ctrl+S">
                <Button size="xs" bg="blue.500" color="white" _hover={{ bg:"blue.600" }}
                  leftIcon={<MdSave size={12}/>} isLoading={saving}
                  isDisabled={manualSaveDisabled} onClick={() => save({ silent:false })}
                  fontSize="11px">Save</Button>
              </Tooltip>
            )}

            <Button size="xs" variant="ghost" color="whiteAlpha.700"
              _hover={{ bg:"whiteAlpha.200" }} leftIcon={<MdClose size={12}/>}
              onClick={handleCancel} fontSize="11px">
              {isDirty ? "Revert" : "Close"}
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* ════════════════════════════════════════════════════════
          2 ▸ META RIBBON (Document properties)
      ════════════════════════════════════════════════════════ */}
      <Box bg={ribbonBg} borderBottom={`1px solid ${borderClr}`}
        px={4} py="8px" flexShrink={0} boxShadow="0 1px 3px rgba(0,0,0,0.08)">
        <Flex gap={4} align="flex-end" wrap="wrap">

          {/* Document group */}
          <Box>
            <Text fontSize="9px" color={subColor} textTransform="uppercase"
              letterSpacing="0.1em" mb={1} fontWeight="700">Document</Text>
            <HStack spacing={3}>
              <FormControl minW="170px">
                <FormLabel fontSize="10px" color={subColor} mb={1} fontWeight="500">Title *</FormLabel>
                <Input {...IS} value={title} onChange={onField(setTitle)}
                  placeholder="Document title…" fontWeight="600"/>
              </FormControl>
              <FormControl minW="150px">
                <FormLabel fontSize="10px" color={subColor} mb={1} fontWeight="500">Description</FormLabel>
                <Input {...IS} value={description} onChange={onField(setDescription)}
                  placeholder="Short description…"/>
              </FormControl>
            </HStack>
          </Box>

          <Box h="44px" w="1px" bg={borderClr} alignSelf="center"/>

          {/* Properties group */}
          <Box>
            <Text fontSize="9px" color={subColor} textTransform="uppercase"
              letterSpacing="0.1em" mb={1} fontWeight="700">Properties</Text>
            <HStack spacing={3}>
              <FormControl w="105px">
                <FormLabel fontSize="10px" color={subColor} mb={1} fontWeight="500">Status</FormLabel>
                <Select {...IS} value={status} onChange={onField(setStatus)}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="review">Review</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormControl>
              <FormControl w="140px">
                <FormLabel fontSize="10px" color={subColor} mb={1} fontWeight="500">Assignee</FormLabel>
                <Select {...IS} value={assignee} placeholder="No assignee"
                  onChange={onField(setAssignee)}>
                  {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </Select>
              </FormControl>
            </HStack>
          </Box>

          <Box h="44px" w="1px" bg={borderClr} alignSelf="center"/>

          {/* Page Setup group */}
          <Box>
            <Text fontSize="9px" color={subColor} textTransform="uppercase"
              letterSpacing="0.1em" mb={1} fontWeight="700">Page Setup</Text>
            <HStack spacing={2}>

              {/* Margin preset popover */}
              <Popover placement="bottom-start">
                <PopoverTrigger>
                  <Button size="xs" variant="outline" colorScheme="gray"
                    borderRadius="3px" fontSize="11px" h="26px"
                    leftIcon={<MdSettings size={11}/>}>
                    Margins
                  </Button>
                </PopoverTrigger>
                <PopoverContent w="260px" borderRadius="6px" boxShadow="xl" bg={ribbonBg}>
                  <PopoverBody p={3}>
                    <Text fontSize="11px" fontWeight="700" color={textColor} mb={2}>
                      Margin Presets
                    </Text>
                    <Grid templateColumns="1fr 1fr" gap={2} mb={3}>
                      {Object.entries(MARGIN_PRESETS).map(([name, vals]) => (
                        <Button key={name} size="xs" variant="outline"
                          colorScheme={JSON.stringify(margins) === JSON.stringify(vals) ? "blue" : "gray"}
                          borderRadius="3px" fontSize="11px" h="26px"
                          onClick={() => setMargins(vals)}>
                          {name}
                        </Button>
                      ))}
                    </Grid>
                    <Divider mb={3}/>
                    <Text fontSize="10px" fontWeight="700" color={subColor} mb={2}>
                      CUSTOM (px)
                    </Text>
                    {["top","right","bottom","left"].map(side => (
                      <Flex key={side} align="center" justify="space-between" mb={1.5}>
                        <Text fontSize="11px" color={textColor} textTransform="capitalize" w="40px">
                          {side}
                        </Text>
                        <Slider flex={1} mx={3} min={0} max={200} value={margins[side]}
                          onChange={v => setMargins(m => ({ ...m, [side]:v }))}>
                          <SliderTrack h="3px" bg={borderClr}>
                            <SliderFilledTrack bg={BRAND}/>
                          </SliderTrack>
                          <SliderThumb boxSize={3}/>
                        </Slider>
                        <NumberInput size="xs" w="54px" min={0} max={200}
                          value={margins[side]}
                          onChange={v => setMargins(m => ({ ...m, [side]:Number(v) }))}>
                          <NumberInputField borderRadius="3px" fontSize="11px" h="22px" px={1}/>
                          <NumberInputStepper>
                            <NumberIncrementStepper fontSize="8px"/>
                            <NumberDecrementStepper fontSize="8px"/>
                          </NumberInputStepper>
                        </NumberInput>
                      </Flex>
                    ))}
                  </PopoverBody>
                </PopoverContent>
              </Popover>

              {/* Zoom controls */}
              <HStack spacing={1}>
                <IconButton icon={<MdZoomOut size={13}/>} size="xs" variant="ghost"
                  aria-label="Zoom out"
                  onClick={() => setZoom(z => Math.max(50, z - 10))}/>
                <Text fontSize="11px" color={textColor} w="36px" textAlign="center">
                  {zoom}%
                </Text>
                <IconButton icon={<MdZoomIn size={13}/>} size="xs" variant="ghost"
                  aria-label="Zoom in"
                  onClick={() => setZoom(z => Math.min(200, z + 10))}/>
              </HStack>
            </HStack>
          </Box>

          {/* Info group */}
          {(selectedProject || user?.name) && (
            <>
              <Box h="44px" w="1px" bg={borderClr} alignSelf="center"/>
              <Box>
                <Text fontSize="9px" color={subColor} textTransform="uppercase"
                  letterSpacing="0.1em" mb={1} fontWeight="700">Info</Text>
                <VStack align="flex-start" spacing={1}>
                  {selectedProject && (
                    <HStack spacing={1.5}>
                      <MdFolder size={11} color={BRAND}/>
                      <Text fontSize="11px" color={subColor}>
                        Project: <strong style={{ color:textColor, fontWeight:500 }}>
                          {selectedProject.name}
                        </strong>
                      </Text>
                    </HStack>
                  )}
                  {user?.name && (
                    <HStack spacing={1.5}>
                      <MdPerson size={11} color="#805ad5"/>
                      <Text fontSize="11px" color={subColor}>
                        Author: <strong style={{ color:textColor, fontWeight:500 }}>
                          {user.name}
                        </strong>
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </Box>
            </>
          )}
        </Flex>

        {saveError && (
          <Alert status="error" borderRadius="4px" mt={2} py={1} fontSize="11px">
            <AlertIcon boxSize={3}/>
            <AlertDescription fontSize="11px">{saveError}</AlertDescription>
          </Alert>
        )}
      </Box>

      {/* ════════════════════════════════════════════════════════
          3 ▸ EDITOR TOOLBAR (decoupled – mounted here)
      ════════════════════════════════════════════════════════ */}
      <Box
        ref={toolbarContRef}
        bg={ribbonBg}
        borderBottom={`2px solid ${borderClr}`}
        flexShrink={0}
        overflowX="auto"
        sx={{
          /* Toolbar container */
          ".ck-toolbar": {
            background:   `${ribbonBg} !important`,
            border:       "none !important",
            borderRadius: "0 !important",
            padding:      "4px 8px !important",
            flexWrap:     "wrap !important",
          },
          ".ck-toolbar__separator": {
            background: `${borderClr} !important`,
            margin:     "2px 6px !important",
            height:     "20px !important",
            alignSelf:  "center !important",
          },
          ".ck-toolbar-dropdown .ck-list":             { minWidth:"120px" },
          ".ck.ck-button, .ck.ck-button.ck-off":      {
            borderRadius: "3px !important",
            padding:      "5px 6px !important",
            color:        `${textColor} !important`,
            minWidth:     "28px !important",
            height:       "28px !important",
            cursor:       "pointer !important",
            transition:   "background 0.12s !important",
            border:       "1px solid transparent !important",
          },
          ".ck.ck-button:hover:not(.ck-disabled)":    {
            background:   `${BRAND_LITE} !important`,
            color:        `${BRAND_DARK} !important`,
            borderColor:  `${BRAND} !important`,
          },
          ".ck.ck-button.ck-on":                      {
            background:   `${BRAND_LITE} !important`,
            color:        `${BRAND} !important`,
            borderColor:  `${BRAND} !important`,
          },
          /* Dropdowns */
          ".ck-dropdown__button":                      { borderRadius:"3px !important" },
          ".ck-dropdown__panel":                       {
            borderRadius:   "4px !important",
            boxShadow:      "0 4px 16px rgba(0,0,0,0.15) !important",
            border:         `1px solid ${borderClr} !important`,
            background:     `${pageBg} !important`,
          },
          ".ck-list__item .ck-button":                 {
            borderRadius: "2px !important",
            padding:      "4px 8px !important",
            width:        "100% !important",
          },
          ".ck-list__item .ck-button:hover":           { background:`${BRAND_LITE} !important` },
          /* Color picker */
          ".ck-color-picker__hash-view":               { fontSize:"12px" },
          ".ck-color-grid__tile":                      { borderRadius:"3px !important" },
          /* Font size dropdown */
          ".ck-font-size-dropdown .ck-list":           { maxHeight:"200px", overflowY:"auto" },
          /* Focus ring inside editor */
          ".ck.ck-editor__editable.ck-focused":        {
            boxShadow: "none !important",
            border:    "none !important",
          },
        }}
      />

      {/* ════════════════════════════════════════════════════════
          4 ▸ CANVAS  (grey bg + A4 white page)
      ════════════════════════════════════════════════════════ */}
      <Box
        flex="1"
        bg={canvasBg}
        overflowY="auto"
        py={8}
        px={4}
        sx={{
          /* A4 page sheet */
          ".a4-page": {
            width:     `${A4_W}px`,
            minHeight: `${A4_H}px`,
            mx:        "auto",
            bg:        pageBg,
            boxShadow: "0 2px 8px rgba(0,0,0,0.18), 0 8px 32px rgba(0,0,0,0.14)",
            position:  "relative",
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            marginBottom: zoom < 100 ? `${-(A4_H * (1 - zoom/100) * 0.5)}px` : "0",
            /* Top accent bar */
            "&::before": {
              content:    '""',
              display:    "block",
              height:     "3px",
              background: `linear-gradient(90deg, ${BRAND} 0%, #60a5fa 60%, #93c5fd 100%)`,
            },
          },

          /* CKEditor editable */
          ".ck-editor__editable": {
            minHeight:  `${A4_H - 40}px`,
            paddingTop:    `${margins.top}px !important`,
            paddingRight:  `${margins.right}px !important`,
            paddingBottom: `${margins.bottom}px !important`,
            paddingLeft:   `${margins.left}px !important`,
            background:    `${pageBg} !important`,
            color:         `${textColor} !important`,
            border:        "none !important",
            boxShadow:     "none !important",
            outline:       "none !important",
            fontFamily:    "'Georgia', 'Times New Roman', serif !important",
            fontSize:      "12pt !important",
            lineHeight:    "1.85 !important",
          },
          ".ck.ck-editor":                      { border:"none !important" },

          /* ── Typography inside doc ── */
          ".ck-editor__editable h1": {
            fontSize:"24pt", fontWeight:"700", marginTop:"24px", marginBottom:"10px",
            fontFamily:"'Trebuchet MS', 'Segoe UI', sans-serif",
            color:`${BRAND_DARK}`, borderBottom:`2px solid ${BRAND_LITE}`, paddingBottom:"6px",
          },
          ".ck-editor__editable h2": {
            fontSize:"18pt", fontWeight:"700", marginTop:"20px", marginBottom:"8px",
            fontFamily:"'Trebuchet MS', 'Segoe UI', sans-serif", color:`${BRAND}`,
          },
          ".ck-editor__editable h3": {
            fontSize:"14pt", fontWeight:"600", marginTop:"16px", marginBottom:"6px",
            fontFamily:"'Trebuchet MS', 'Segoe UI', sans-serif",
          },
          ".ck-editor__editable h4": {
            fontSize:"12pt", fontWeight:"700", marginTop:"12px", marginBottom:"4px",
          },

          /* ── Paragraph ── */
          ".ck-editor__editable p": { marginBottom:"8px" },

          /* ── Lists ── */
          ".ck-editor__editable ul, .ck-editor__editable ol": {
            paddingLeft:"28px", marginBottom:"8px",
          },
          ".ck-editor__editable li": { marginBottom:"3px" },

          /* ── Blockquote ── */
          ".ck-editor__editable blockquote": {
            borderLeft:`4px solid ${BRAND}`,
            padding:"10px 18px",
            color: subColor,
            fontStyle:"italic",
            background: BRAND_LITE,
            borderRadius:"0 4px 4px 0",
            margin:"14px 0",
          },

          /* ── Code ── */
          ".ck-editor__editable pre": {
            background:"#1e293b",
            color:"#e2e8f0",
            padding:"14px 18px",
            borderRadius:"6px",
            fontSize:"10.5pt",
            fontFamily:"'Fira Code','Cascadia Code','Consolas',monospace",
            overflowX:"auto",
            margin:"14px 0",
          },
          ".ck-editor__editable code": {
            background:"#f1f5f9",
            color:"#0f172a",
            padding:"1px 5px",
            borderRadius:"3px",
            fontSize:"10pt",
            fontFamily:"'Fira Code','Consolas',monospace",
          },

          /* ── Table ── */
          ".ck-editor__editable .ck-table-bogus-paragraph": { display:"none" },
          ".ck-editor__editable figure.table": { margin:"14px 0", overflowX:"auto" },
          ".ck-editor__editable table": {
            borderCollapse:"collapse",
            width:"100%",
            fontSize:"11pt",
          },
          ".ck-editor__editable table td, .ck-editor__editable table th": {
            border:`1px solid ${borderClr}`,
            padding:"7px 12px",
            verticalAlign:"top",
          },
          ".ck-editor__editable table th": {
            background:BRAND_LITE,
            fontWeight:"700",
            color:BRAND_DARK,
            fontSize:"10.5pt",
          },
          ".ck-editor__editable table tr:nth-of-type(even) td": {
            background:`${BRAND_LITE}55`,
          },

          /* ── Image ── */
          ".ck-editor__editable img": {
            maxWidth:"100%",
            borderRadius:"4px",
            boxShadow:"0 2px 8px rgba(0,0,0,0.1)",
          },
          ".ck-editor__editable figure.image":        { margin:"14px auto", textAlign:"center" },
          ".ck-editor__editable figure.image figcaption": {
            fontSize:"10pt", color:subColor, fontStyle:"italic", marginTop:"4px",
          },

          /* ── HR ── */
          ".ck-editor__editable hr": {
            border:"none",
            borderTop:`2px solid ${BRAND_LITE}`,
            margin:"20px 0",
          },

          /* ── Links ── */
          ".ck-editor__editable a": {
            color:BRAND,
            textDecoration:"underline",
            textUnderlineOffset:"2px",
          },

          /* ── Todo list ── */
          ".ck-editor__editable .todo-list__label__description": { cursor:"pointer" },

          /* ── Table inline toolbar ── */
          ".ck-table-column-resizer": { cursor:"col-resize" },
        }}
      >
        <Box className="a4-page">
          <CKEditor
            editor={DecoupledEditor}
            data={content}
            onReady={onEditorReady}
            onChange={(_, editor) => {
              setContent(editor.getData());
              setIsDirty(true);
              scheduleAutoSave();
            }}
            config={{
              toolbar: {
                items: [
                  "heading", "|",
                  "fontFamily", "fontSize", "|",
                  "fontColor", "fontBackgroundColor", "|",
                  "bold", "italic", "underline", "strikethrough", "subscript", "superscript", "|",
                  "alignment", "|",
                  "bulletedList", "numberedList", "todoList", "|",
                  "outdent", "indent", "|",
                  "link", "insertImage", "insertTable", "mediaEmbed", "|",
                  "blockQuote", "codeBlock", "horizontalLine", "|",
                  "specialCharacters", "|",
                  "undo", "redo", "|",
                  "findAndReplace",
                ],
                shouldNotGroupWhenFull: true,
              },
              heading: {
                options: [
                  { model:"paragraph",  title:"Normal",    class:"ck-heading_paragraph" },
                  { model:"heading1",   view:"h1", title:"Heading 1", class:"ck-heading_heading1" },
                  { model:"heading2",   view:"h2", title:"Heading 2", class:"ck-heading_heading2" },
                  { model:"heading3",   view:"h3", title:"Heading 3", class:"ck-heading_heading3" },
                  { model:"heading4",   view:"h4", title:"Heading 4", class:"ck-heading_heading4" },
                ],
              },
              fontFamily: {
                options: [
                  "default",
                  "Georgia, serif",
                  "Times New Roman, Times, serif",
                  "Arial, Helvetica, sans-serif",
                  "Trebuchet MS, Helvetica, sans-serif",
                  "Verdana, Geneva, sans-serif",
                  "Courier New, Courier, monospace",
                  "Tahoma, Geneva, sans-serif",
                  "Palatino Linotype, Book Antiqua, Palatino, serif",
                  "Garamond, Baskerville, Baskerville Old Face, Hoefler Text, Times New Roman, serif",
                ],
              },
              fontSize: {
                options: [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 60, 72],
              },
              fontColor: {
                colors: [
                  { color:"#000000", label:"Black" },
                  { color:"#374151", label:"Dark Gray" },
                  { color:"#6b7280", label:"Gray" },
                  { color:"#d1d5db", label:"Light Gray" },
                  { color:"#ffffff", label:"White" },
                  { color:"#ef4444", label:"Red" },
                  { color:"#f97316", label:"Orange" },
                  { color:"#eab308", label:"Yellow" },
                  { color:"#22c55e", label:"Green" },
                  { color:"#3b82f6", label:"Blue" },
                  { color:"#6366f1", label:"Indigo" },
                  { color:"#8b5cf6", label:"Violet" },
                  { color:"#ec4899", label:"Pink" },
                  { color:"#14b8a6", label:"Teal" },
                  { color:"#1a56db", label:"Brand" },
                ],
                columns: 5,
              },
              fontBackgroundColor: {
                colors: [
                  { color:"#fef9c3", label:"Yellow" },
                  { color:"#dcfce7", label:"Green" },
                  { color:"#dbeafe", label:"Blue" },
                  { color:"#fce7f3", label:"Pink" },
                  { color:"#f3e8ff", label:"Purple" },
                  { color:"#ffedd5", label:"Orange" },
                  { color:"#f1f5f9", label:"Light" },
                  { color:"#111827", label:"Dark" },
                ],
                columns: 4,
              },
              table: {
                contentToolbar: [
                  "tableColumn", "tableRow", "mergeTableCells",
                  "tableProperties", "tableCellProperties",
                ],
                tableProperties: {
                  borderColors: [
                    { color:"#000000", label:"Black" },
                    { color:"#6b7280", label:"Gray" },
                    { color:"#3b82f6", label:"Blue" },
                  ],
                  backgroundColors: [
                    { color:"#dbeafe", label:"Light Blue" },
                    { color:"#dcfce7", label:"Light Green" },
                    { color:"#fef9c3", label:"Light Yellow" },
                  ],
                },
                tableCellProperties: {
                  borderColors: [
                    { color:"#000000", label:"Black" },
                    { color:"#6b7280", label:"Gray" },
                    { color:"#3b82f6", label:"Blue" },
                  ],
                  backgroundColors: [
                    { color:"#dbeafe", label:"Light Blue" },
                    { color:"#dcfce7", label:"Light Green" },
                    { color:"#fef9c3", label:"Light Yellow" },
                  ],
                },
              },
              image: {
                toolbar: [
                  "imageTextAlternative",
                  "imageStyle:inline",
                  "imageStyle:block",
                  "imageStyle:side",
                  "|",
                  "toggleImageCaption",
                  "linkImage",
                ],
                resizeOptions: [
                  { name:"resizeImage:original", value:null, label:"Original" },
                  { name:"resizeImage:50",        value:"50",  label:"50%" },
                  { name:"resizeImage:75",        value:"75",  label:"75%" },
                ],
              },
              alignment: {
                options: ["left","center","right","justify"],
              },
              link: {
                addTargetToExternalLinks: true,
                defaultProtocol: "https://",
                decorators: {
                  openInNewTab: {
                    mode: "manual",
                    label: "Open in a new tab",
                    attributes: { target:"_blank", rel:"noopener noreferrer" },
                  },
                },
              },
              codeBlock: {
                languages: [
                  { language:"plaintext",  label:"Plain text" },
                  { language:"javascript", label:"JavaScript" },
                  { language:"typescript", label:"TypeScript" },
                  { language:"python",     label:"Python" },
                  { language:"html",       label:"HTML" },
                  { language:"css",        label:"CSS" },
                  { language:"sql",        label:"SQL" },
                  { language:"json",       label:"JSON" },
                  { language:"bash",       label:"Bash/Shell" },
                ],
              },
              mediaEmbed: {
                previewsInData: true,
              },
              placeholder: "Start writing…",
            }}
          />
        </Box>
      </Box>

      {/* ════════════════════════════════════════════════════════
          5 ▸ STATUS BAR
      ════════════════════════════════════════════════════════ */}
      <Box bg={statusBg} borderTop={`1px solid ${borderClr}`}
        px={5} py="5px" flexShrink={0}>
        <Flex justify="space-between" align="center">
          <HStack spacing={4} color={subColor} fontSize="11px">
            <HStack spacing={1}>
              <MdDescription size={11}/>
              <Text>
                <strong style={{ color:textColor }}>{wordCount.toLocaleString()}</strong> words
              </Text>
            </HStack>
            <Text color={borderClr}>|</Text>
            <Text>
              <strong style={{ color:textColor }}>{charCount.toLocaleString()}</strong> chars
            </Text>
            <Text color={borderClr}>|</Text>
            <Badge colorScheme={statusColors[status] || "gray"} borderRadius="3px"
              fontSize="10px" px={1.5} textTransform="capitalize">{status}</Badge>

            {lastSavedAt && <>
              <Text color={borderClr}>|</Text>
              <HStack spacing={1} color="green.500">
                <MdCheckCircle size={11}/><Text>Saved {timeAgo}</Text>
              </HStack>
            </>}
            {!lastSavedAt && isDirty && <>
              <Text color={borderClr}>|</Text>
              <HStack spacing={1} color="orange.400">
                <MdSchedule size={11}/><Text>Unsaved changes</Text>
              </HStack>
            </>}
            <Text color={borderClr}>|</Text>
            <Text>A4 · {zoom}% zoom</Text>
          </HStack>

          {!autoSave && (
            <HStack spacing={2}>
              <Button size="xs" variant="outline" colorScheme="gray" borderRadius="3px"
                fontSize="11px" h="22px" leftIcon={<MdClose size={11}/>} onClick={handleCancel}>
                {isDirty ? "Revert" : "Close"}
              </Button>
              <Button size="xs" borderRadius="3px" fontSize="11px" h="22px"
                bg={BRAND} color="white" _hover={{ bg:BRAND_DARK }}
                leftIcon={<MdSave size={11}/>} isLoading={saving}
                isDisabled={manualSaveDisabled} onClick={() => save({ silent:false })}>
                Save Document
              </Button>
            </HStack>
          )}
        </Flex>
      </Box>

    </Box>
  );
}