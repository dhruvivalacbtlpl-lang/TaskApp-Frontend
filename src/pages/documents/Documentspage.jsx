import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box, Flex, Heading, Text, Badge, Avatar, Spinner, Button,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, useDisclosure, Input, Textarea, Select,
  useToast, IconButton, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Tooltip, useColorModeValue, FormControl,
  FormErrorMessage, FormLabel, HStack, VStack, Grid, Switch,
  Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import {
  MdAdd, MdDelete, MdEdit, MdDescription, MdLock, MdLockOpen,
  MdMail, MdCheck, MdClose, MdAttachFile, MdDownload, MdClear,
  MdPerson, MdSave, MdUploadFile, MdNoteAdd, MdVisibility,
  MdPictureAsPdf, MdTableChart, MdSlideshow, MdImage, MdCode,
  MdTextFields, MdCloudUpload, MdFolder,
} from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

// ── Constants ──────────────────────────────────────────────────────────────────
const statusColors = { draft:"gray", active:"green", archived:"orange", review:"purple" };
const SAFE_TEXT    = /^[a-zA-Z0-9 .,\-_:!?()\n\r@#/]*$/;
const emptyUpload  = { title:"", description:"", status:"draft", assignee:"" };
const PAGE_SIZES   = [5, 10, 20, 50];

const fmtSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
};

// ── Check if doc should open in the page editor ────────────────────────────────
// ✅ FIX: now checks documentType field (new docs) AND legacy content field (old docs)
const isEditorDoc = (doc) => {
  if (doc.documentType === "docx" || doc.documentType === "txt") return true;
  if (!doc.file?.url && !!doc.content) return true;  // legacy text docs
  return false;
};

// Returns icon + color + label for a document
const docTypeMeta = (doc) => {
  // New docs with documentType
  if (doc.documentType === "docx") return { icon: MdDescription, color: "#3182ce", label: "DOCX", scheme: "blue" };
  if (doc.documentType === "txt")  return { icon: MdTextFields,  color: "#718096", label: "TXT",  scheme: "gray" };
  // Legacy: content-only docs
  if (!doc.file?.mimetype && doc.content) return { icon: MdTextFields, color: "purple", label: "TEXT", scheme: "purple" };
  // File-based docs
  const m = doc.file?.mimetype || "";
  if (m.includes("pdf"))                                       return { icon: MdPictureAsPdf, color: "#e53e3e", label: "PDF",   scheme: "red"    };
  if (m.includes("word") || m.includes("document"))           return { icon: MdDescription,  color: "#3182ce", label: "DOCX",  scheme: "blue"   };
  if (m.includes("excel") || m.includes("sheet"))             return { icon: MdTableChart,   color: "#38a169", label: "XLSX",  scheme: "green"  };
  if (m.includes("presentation") || m.includes("powerpoint")) return { icon: MdSlideshow,   color: "#dd6b20", label: "PPTX",  scheme: "orange" };
  if (m.includes("image"))                                     return { icon: MdImage,        color: "#805ad5", label: "IMG",   scheme: "purple" };
  if (m.includes("text"))                                      return { icon: MdTextFields,   color: "#718096", label: "TXT",   scheme: "gray"   };
  return { icon: MdAttachFile, color: "#718096", label: "FILE", scheme: "gray" };
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const navigate       = useNavigate();
  const toast          = useToast();
  const { user, hasPermission, selectedProject } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [docs,            setDocs]            = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [staff,           setStaff]           = useState([]);
  const [uploadForm,      setUploadForm]      = useState(emptyUpload);
  const [uploadErrors,    setUploadErrors]    = useState({});
  const [uploadSaving,    setUploadSaving]    = useState(false);
  const [editingId,       setEditingId]       = useState(null);
  const [dragOver,        setDragOver]        = useState(false);
  const [selectedFile,    setSelectedFile]    = useState(null);
  const [removeFile,      setRemoveFile]      = useState(false);
  const [existingFile,    setExistingFile]    = useState(null);
  const fileInputRef = useRef(null);
  const [deleteId,        setDeleteId]        = useState(null);
  const [deleting,        setDeleting]        = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [pageSize,        setPageSize]        = useState(10);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [accessDoc,             setAccessDoc]             = useState(null);
  const [accessMessage,         setAccessMessage]         = useState("");
  const [accessSending,         setAccessSending]         = useState(false);
  const [moduleAccessMessage,   setModuleAccessMessage]   = useState("");
  const [moduleAccessSending,   setModuleAccessSending]   = useState(false);
  const [pendingRequests,       setPendingRequests]       = useState([]);
  const [highlightedDocId,      setHighlightedDocId]      = useState(null);
  const [focusedRequest,        setFocusedRequest]        = useState(null);

  const { isOpen: isUploadOpen,   onOpen: onUploadOpen,   onClose: onUploadClose   } = useDisclosure();
  const { isOpen: isDeleteOpen,   onOpen: onDeleteOpen,   onClose: onDeleteClose   } = useDisclosure();
  const { isOpen: isAccessOpen,   onOpen: onAccessOpen,   onClose: onAccessClose   } = useDisclosure();
  const { isOpen: isRequestsOpen, onOpen: onRequestsOpen, onClose: onRequestsClose } = useDisclosure();
  const { isOpen: isModuleOpen,   onOpen: onModuleOpen,   onClose: onModuleClose   } = useDisclosure();
  const { isOpen: isFocusOpen,    onOpen: onFocusOpen,    onClose: onFocusClose    } = useDisclosure();

  const isAdmin   = user?.role?.name?.toLowerCase() === "admin";
  const canRead   = isAdmin || hasPermission("document_read");
  const canUpdate = isAdmin || hasPermission("document_update");
  const canDelete = isAdmin || hasPermission("document_delete");

  const cardBg       = useColorModeValue("white",      "gray.800");
  const theadBg      = useColorModeValue("#bee3f8",    "#2a4365");
  const theadColor   = useColorModeValue("gray.600",   "white");
  const textColor    = useColorModeValue("gray.800",   "white");
  const subColor     = useColorModeValue("gray.400",   "gray.400");
  const rowEven      = useColorModeValue("white",      "gray.800");
  const rowOdd       = useColorModeValue("gray.50",    "gray.750");
  const rowHover     = useColorModeValue("blue.50",    "gray.700");
  const borderColor  = useColorModeValue("#e2e8f0",    "#4a5568");
  const iconBg       = useColorModeValue("blue.100",   "blue.900");
  const reqBg        = useColorModeValue("orange.50",  "orange.900");
  const reqBdr       = useColorModeValue("orange.200", "orange.600");
  const lockedBg     = useColorModeValue("gray.50",    "gray.700");
  const fileBg       = useColorModeValue("green.50",   "green.900");
  const fileBdr      = useColorModeValue("green.200",  "green.600");
  const fileClr      = useColorModeValue("green.700",  "green.200");
  const warnBg       = useColorModeValue("yellow.50",  "yellow.900");
  const warnBdr      = useColorModeValue("yellow.300", "yellow.600");
  const highlightBg  = useColorModeValue("green.50",   "green.900");
  const highlightBdr = useColorModeValue("green.300",  "green.600");
  const dragBg       = useColorModeValue("blue.50",    "blue.900");
  const dropzoneBg   = useColorModeValue("gray.50",    "gray.700");
  const dropzoneBdr  = useColorModeValue("gray.200",   "gray.600");

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  useEffect(() => {
    const requestId = searchParams.get("requestId");
    if (!requestId || !isAdmin) return;
    const openFocused = async () => {
      try {
        await new Promise(r => setTimeout(r, 1000));
        const found = pendingRequests.find(r => r._id === requestId);
        if (found) { setFocusedRequest(found); onFocusOpen(); }
        else {
          const res = await api.get("/documents/access-requests");
          const fresh = (res.data || []).find(r => r._id === requestId);
          if (fresh) { setFocusedRequest(fresh); onFocusOpen(); }
        }
      } catch { /* silent */ }
      setSearchParams({}, { replace: true });
    };
    openFocused();
  }, [isAdmin, pendingRequests]); // eslint-disable-line

  useEffect(() => {
    const token = searchParams.get("token");
    const docId = searchParams.get("docId");
    if (!token || !docId) return;
    const verify = async () => {
      try {
        const res = await api.get(`/documents/verify-token?token=${token}&docId=${docId}`);
        if (res.data.valid) {
          setHighlightedDocId(docId);
          toast({ title:"✅ Access verified", description:"Your document is highlighted below.",
            status:"success", duration:5000, isClosable:true });
          setTimeout(() => {
            document.getElementById(`doc-row-${docId}`)
              ?.scrollIntoView({ behavior:"smooth", block:"center" });
          }, 1000);
        }
      } catch {
        toast({ title:"Link expired or invalid", status:"error", duration:5000, isClosable:true });
      } finally {
        setSearchParams({}, { replace: true });
      }
    };
    verify();
  }, []); // eslint-disable-line

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [docsRes, staffRes, reqRes] = await Promise.all([
        api.get("/documents"),
        api.get("/staff"),
        isAdmin ? api.get("/documents/access-requests") : Promise.resolve({ data:[] }),
      ]);
      setDocs(docsRes.data || []);
      setStaff(staffRes.data || []);
      setPendingRequests(reqRes.data || []);
    } catch {
      toast({ title:"Failed to load documents", status:"error", duration:2000 });
    } finally {
      setLoading(false);
    }
  };

  const isAssignedToDoc  = (doc) => doc.assignee?._id === user?._id || doc.assignee === user?._id;
  const isCreatorOfDoc   = (doc) => doc.createdBy?._id === user?._id || doc.createdBy === user?._id;
  const isAllowedUser    = (doc) => doc.allowedUsers?.some(u => (u?._id||u)?.toString() === user?._id?.toString());
  const canReadDoc       = (doc) => isAdmin || isAssignedToDoc(doc) || isCreatorOfDoc(doc) || isAllowedUser(doc);

  const projectFiltered = selectedProject
    ? docs.filter(d => d.project?._id === selectedProject._id)
    : docs;

  const filtered = projectFiltered.filter(d => {
    const matchSearch = !searchQuery || d.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const visibleDocs    = filtered.filter(d => canReadDoc(d));
  const lockedDocs     = canRead && !isAdmin ? filtered.filter(d => !canReadDoc(d)) : [];
  const allDisplayDocs = [...visibleDocs, ...lockedDocs];
  const totalPages     = Math.max(1, Math.ceil(allDisplayDocs.length / pageSize));
  const startIndex     = (currentPage - 1) * pageSize;
  const paginated      = allDisplayDocs.slice(startIndex, startIndex + pageSize);
  const pendingCount   = pendingRequests.length;

  const validateUpload = () => {
    const e = {};
    if (!uploadForm.title.trim())                        e.title       = "Title is required.";
    else if (!SAFE_TEXT.test(uploadForm.title))          e.title       = "No special characters.";
    if (!uploadForm.description.trim())                  e.description = "Description is required.";
    else if (!SAFE_TEXT.test(uploadForm.description))    e.description = "No special characters.";
    return e;
  };

  const resetUploadModal = () => {
    setUploadForm(emptyUpload);
    setEditingId(null);
    setUploadErrors({});
    setSelectedFile(null);
    setRemoveFile(false);
    setExistingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openUploadEdit = (doc) => {
    setUploadForm({
      title:       doc.title,
      description: doc.description,
      status:      doc.status || "draft",
      assignee:    doc.assignee?._id || "",
    });
    setEditingId(doc._id);
    setExistingFile(doc.file?.url ? doc.file : null);
    setSelectedFile(null);
    setRemoveFile(false);
    setUploadErrors({});
    onUploadOpen();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title:"File too large. Max 10MB.", status:"error", duration:3000 });
      return;
    }
    setSelectedFile(file);
    setRemoveFile(false);
    setExistingFile(null);
  };

  const handleUploadSave = async () => {
    const e = validateUpload();
    if (Object.keys(e).length) { setUploadErrors(e); return; }
    if (!editingId && !selectedProject) {
      toast({ title:"Select a project first", status:"warning", duration:3000 });
      return;
    }
    setUploadSaving(true);
    try {
      const fd = new FormData();
      fd.append("title",       uploadForm.title);
      fd.append("description", uploadForm.description);
      fd.append("status",      uploadForm.status);
      fd.append("content",     "");
      if (uploadForm.assignee)  fd.append("assignee",  uploadForm.assignee);
      if (selectedProject)      fd.append("project",   selectedProject._id);
      if (selectedFile)         fd.append("file",      selectedFile);
      if (removeFile)           fd.append("removeFile","true");

      const headers = { "Content-Type":"multipart/form-data" };
      if (editingId) {
        const res = await api.put(`/documents/${editingId}`, fd, { headers });
        setDocs(prev => prev.map(d => d._id === editingId ? res.data : d));
        toast({ title:"Document updated!", status:"success", duration:2000 });
      } else {
        const res = await api.post("/documents", fd, { headers });
        setDocs(prev => [res.data, ...prev]);
        toast({ title:"Document uploaded!", status:"success", duration:2000 });
      }
      onUploadClose();
      resetUploadModal();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to save";
      toast({ title:msg, status:"error", duration:3000 });
    } finally {
      setUploadSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteId}`);
      setDocs(prev => prev.filter(d => d._id !== deleteId));
      toast({ title:"Deleted", status:"info", duration:2000 });
      onDeleteClose();
      setDeleteId(null);
    } catch {
      toast({ title:"Failed to delete", status:"error", duration:2000 });
    } finally {
      setDeleting(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!accessDoc) return;
    setAccessSending(true);
    try {
      await api.post(`/documents/${accessDoc._id}/request-access`, { message: accessMessage });
      toast({ title:"Access request sent!", status:"success", duration:3000 });
      setAccessMessage(""); onAccessClose(); setAccessDoc(null);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to send";
      if (msg.includes("already have a pending")) {
        toast({ title:"You already have a pending request", status:"warning", duration:3000 });
        onAccessClose();
      } else {
        toast({ title:msg, status:"error", duration:3000 });
      }
    } finally {
      setAccessSending(false);
    }
  };

  const handleModuleAccess = async () => {
    setModuleAccessSending(true);
    try {
      await api.post("/documents/request-module-access", { message: moduleAccessMessage });
      toast({ title:"Request sent!", status:"success", duration:3000 });
      setModuleAccessMessage(""); onModuleClose();
    } catch {
      toast({ title:"Failed to send", status:"error", duration:2000 });
    } finally {
      setModuleAccessSending(false);
    }
  };

  const handleGrantAccess = async (requestId, approve) => {
    try {
      await api.put(`/documents/access-requests/${requestId}`, {
        status: approve ? "approved" : "denied",
      });
      const docsRes = await api.get("/documents");
      setDocs(docsRes.data || []);
      setPendingRequests(prev => prev.filter(r => r._id !== requestId));
      toast({
        title: approve ? "Access granted & email sent!" : "Request denied",
        status: approve ? "success" : "info", duration:2000,
      });
    } catch {
      toast({ title:"Failed to update request", status:"error", duration:2000 });
    }
  };

  if (loading) return (
    <Flex justify="center" py={20}><Spinner size="xl" color="brand.500" /></Flex>
  );

  return (
    <Box>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" mb={4}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Flex align="center" gap={3}>
            <Box bg={iconBg} p={3} borderRadius="lg">
              <MdDescription size={26} color="#2b6cb0" />
            </Box>
            <Box>
              <Heading size="md" color={textColor}>Documents</Heading>
              <Text fontSize="sm" color={subColor}>
                {selectedProject
                  ? `${selectedProject.name} · ${allDisplayDocs.length} documents`
                  : `All projects · ${allDisplayDocs.length} documents`}
              </Text>
            </Box>
          </Flex>

          <HStack spacing={2} flexWrap="wrap">
            {isAdmin && (
              <Button leftIcon={<MdLockOpen size={16}/>} colorScheme="orange"
                size="sm" variant="outline" onClick={onRequestsOpen} position="relative">
                Access Requests
                {pendingCount > 0 && (
                  <Badge colorScheme="red" borderRadius="full" position="absolute"
                    top="-8px" right="-8px" fontSize="10px" px={1.5}>
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            )}
            <Tooltip label={!selectedProject ? "Select a project first" : ""} isDisabled={!!selectedProject}>
              <Button leftIcon={<MdUploadFile size={16}/>} colorScheme="green" size="sm" variant="outline"
                isDisabled={!selectedProject}
                onClick={() => { resetUploadModal(); onUploadOpen(); }}>
                Upload
              </Button>
            </Tooltip>
            <Tooltip label={!selectedProject ? "Select a project first" : ""} isDisabled={!!selectedProject}>
              <Button leftIcon={<MdNoteAdd size={16}/>} colorScheme="brand" size="sm"
                isDisabled={!selectedProject}
                onClick={() => navigate("/admin/documents/editor")}>
                Create
              </Button>
            </Tooltip>
          </HStack>
        </Flex>
      </Box>

      {/* ── NO PROJECT BANNER ─────────────────────────────────────────────── */}
      {!selectedProject && (
        <Box mb={4} p={4} bg={warnBg} borderRadius="xl" border="1px solid" borderColor={warnBdr}>
          <Flex align="center" gap={3}>
            <MdFolder size={20} color="#d69e2e" />
            <Box>
              <Text fontWeight="600" fontSize="sm" color={textColor}>Select a project to create documents</Text>
              <Text fontSize="xs" color={subColor}>Use the project dropdown in the top navbar.</Text>
            </Box>
          </Flex>
        </Box>
      )}

      {/* ── FILTERS ───────────────────────────────────────────────────────── */}
      {allDisplayDocs.length > 0 && (
        <Box bg={cardBg} px={4} py={3} borderRadius="xl" mb={4}
          border={`1px solid ${borderColor}`} boxShadow="sm">
          <Flex gap={3} align="center" wrap="wrap">
            <HStack spacing={2}>
              <Text fontSize="sm" color={subColor}>Show</Text>
              <Select size="sm" w="72px" value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
              </Select>
            </HStack>
            <HStack spacing={2}>
              <Text fontSize="sm" color={subColor}>Status</Text>
              <Select size="sm" w="120px" value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="review">Review</option>
                <option value="archived">Archived</option>
              </Select>
            </HStack>
            <Box flex={1} minW="160px">
              <Input size="sm" placeholder="Search by name…" value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                borderRadius="md" />
            </Box>
          </Flex>
        </Box>
      )}

      {/* ── EMPTY STATE ───────────────────────────────────────────────────── */}
      {allDisplayDocs.length === 0 && (
        <Flex direction="column" align="center" py={20} color={subColor}>
          <MdDescription size={48} />
          <Text fontSize="sm" mt={2}>
            {selectedProject ? `No documents for ${selectedProject.name}` : "No documents found"}
          </Text>
          {selectedProject && (
            <HStack mt={4} spacing={3}>
              <Button colorScheme="green" size="sm" variant="outline"
                leftIcon={<MdUploadFile size={14}/>}
                onClick={() => { resetUploadModal(); onUploadOpen(); }}>
                Upload File
              </Button>
              <Button colorScheme="brand" size="sm" leftIcon={<MdNoteAdd size={14}/>}
                onClick={() => navigate("/admin/documents/editor")}>
                Create Document
              </Button>
            </HStack>
          )}
        </Flex>
      )}

      {/* ── TABLE ─────────────────────────────────────────────────────────── */}
      {allDisplayDocs.length > 0 && (
        <Box bg={cardBg} borderRadius="xl" boxShadow="md"
          border={`1px solid ${borderColor}`} overflow="hidden">
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}>
                <Tr>
                  {["#","Title","Description","Type","Status","Assignee","Created By","Project","File","Date","Actions"].map(h => (
                    <Th key={h} color={theadColor} fontSize="xs" py={3}
                      textAlign={h === "Actions" ? "right" : "left"}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {paginated.map((doc, idx) => {
                  const canSee        = canReadDoc(doc);
                  const isHighlighted = doc._id === highlightedDocId;
                  const typeMeta      = docTypeMeta(doc);
                  const TypeIcon      = typeMeta.icon;

                  // ✅ FIX: use isEditorDoc() which checks documentType AND legacy content
                  const openInEditor  = isEditorDoc(doc);

                  // Locked row
                  if (!canSee) return (
                    <Tr key={doc._id} bg={lockedBg} opacity={0.75}>
                      <Td color={subColor} fontSize="xs">{startIndex+idx+1}</Td>
                      <Td py={3}>
                        <Flex align="center" gap={2}>
                          <MdLock size={14} color="#a0aec0"/>
                          <Text fontSize="sm" color={subColor} fontWeight="600">Restricted Document</Text>
                        </Flex>
                      </Td>
                      <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                      <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                      <Td><Badge colorScheme="gray" borderRadius="full" fontSize="xs" px={2}>restricted</Badge></Td>
                      <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                      <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                      <Td><Text fontSize="xs" color={subColor}>{doc.project?.name || "—"}</Text></Td>
                      <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                      <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                      <Td textAlign="right">
                        <Tooltip label="Request access">
                          <IconButton icon={<MdLock size={14}/>} size="xs" colorScheme="orange"
                            aria-label="Request" onClick={() => { setAccessDoc(doc); onAccessOpen(); }}/>
                        </Tooltip>
                      </Td>
                    </Tr>
                  );

                  // Visible row
                  return (
                    <Tr key={doc._id} id={`doc-row-${doc._id}`}
                      bg={isHighlighted ? highlightBg : idx%2===0 ? rowEven : rowOdd}
                      border={isHighlighted ? "2px solid" : undefined}
                      borderColor={isHighlighted ? highlightBdr : undefined}
                      _hover={{ bg: rowHover }} transition="background 0.15s">
                      <Td color={subColor} fontSize="xs">{startIndex+idx+1}</Td>

                      {/* Title */}
                      <Td py={3} maxW="150px">
                        <Flex align="center" gap={2}>
                          <MdDescription size={14} color="#3b82f6"/>
                          <Text fontWeight="600" fontSize="sm" color={textColor} noOfLines={1}>
                            {doc.title}
                          </Text>
                          {isHighlighted && (
                            <Badge colorScheme="green" fontSize="9px" borderRadius="full" px={1.5}>
                              ✓ Access
                            </Badge>
                          )}
                        </Flex>
                      </Td>

                      {/* Description */}
                      <Td maxW="160px">
                        <Text fontSize="xs" color={subColor} noOfLines={2}>{doc.description}</Text>
                      </Td>

                      {/* Type */}
                      <Td>
                        <Flex align="center" gap={1.5}>
                          <TypeIcon size={14} color={typeMeta.color}/>
                          <Badge colorScheme={typeMeta.scheme} borderRadius="full"
                            fontSize="10px" px={2} fontWeight="700">
                            {typeMeta.label}
                          </Badge>
                        </Flex>
                      </Td>

                      {/* Status */}
                      <Td>
                        <Badge colorScheme={statusColors[doc.status]||"gray"}
                          borderRadius="full" fontSize="xs" px={2} textTransform="capitalize">
                          {doc.status||"draft"}
                        </Badge>
                      </Td>

                      {/* Assignee */}
                      <Td>
                        {doc.assignee?.name ? (
                          <Flex align="center" gap={2}>
                            <Avatar name={doc.assignee.name} size="xs" bg="brand.500" color="white"/>
                            <Text fontSize="xs" color={textColor} whiteSpace="nowrap">{doc.assignee.name}</Text>
                          </Flex>
                        ) : <Text fontSize="xs" color={subColor}>—</Text>}
                      </Td>

                      {/* Created by */}
                      <Td>
                        <Flex align="center" gap={2}>
                          <Avatar name={doc.createdBy?.name} size="xs" bg="purple.400" color="white"/>
                          <Box>
                            <Text fontSize="xs" color={textColor} whiteSpace="nowrap">{doc.createdBy?.name||"—"}</Text>
                            {isCreatorOfDoc(doc) && (
                              <Badge colorScheme="purple" fontSize="9px" borderRadius="full">you</Badge>
                            )}
                          </Box>
                        </Flex>
                      </Td>

                      {/* Project */}
                      <Td>
                        <Text fontSize="xs" color={subColor} noOfLines={1}>{doc.project?.name || "—"}</Text>
                      </Td>

                      {/* File / View */}
                      <Td>
                        {openInEditor ? (
                          /* ✅ Editor docs — View button */
                          <Button size="xs" colorScheme="blue" variant="outline"
                            leftIcon={<MdVisibility size={12}/>}
                            onClick={() => navigate(`/admin/documents/editor/${doc._id}`)}>
                            Open
                          </Button>
                        ) : doc.file?.url ? (() => {
                          const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api$/, "");
                          const fileUrl = `${BASE}${doc.file.url}`;
                          return (
                            <HStack spacing={1}>
                              <Button as="a" href={fileUrl} target="_blank" rel="noopener noreferrer"
                                size="xs" colorScheme="blue" variant="outline"
                                leftIcon={<MdVisibility size={11}/>}>
                                View
                              </Button>
                              <IconButton as="a" href={fileUrl} download={doc.file.originalName}
                                size="xs" colorScheme="green" variant="ghost"
                                aria-label="Download" icon={<MdDownload size={13}/>}/>
                            </HStack>
                          );
                        })() : (
                          <Text fontSize="xs" color={subColor}>—</Text>
                        )}
                      </Td>

                      {/* Date */}
                      <Td>
                        <Text fontSize="xs" color={subColor} whiteSpace="nowrap">
                          {new Date(doc.createdAt).toLocaleDateString("en-IN",
                            { day:"numeric", month:"short", year:"numeric" })}
                        </Text>
                      </Td>

                      {/* Actions */}
                      <Td textAlign="right">
                        <Flex justify="flex-end" gap={1}>
                          {(canUpdate || isCreatorOfDoc(doc)) && (
                            // ✅ FIX: openInEditor check — always opens editor for docx/txt docs
                            <Tooltip label={openInEditor ? "Edit in editor" : "Edit"}>
                              <IconButton
                                icon={<MdEdit size={14}/>} size="xs"
                                colorScheme="brand" variant="ghost" aria-label="Edit"
                                onClick={() => openInEditor
                                  ? navigate(`/admin/documents/editor/${doc._id}`)
                                  : openUploadEdit(doc)
                                }/>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip label="Delete">
                              <IconButton icon={<MdDelete size={14}/>} size="xs"
                                colorScheme="red" variant="ghost" aria-label="Delete"
                                onClick={() => { setDeleteId(doc._id); onDeleteOpen(); }}/>
                            </Tooltip>
                          )}
                        </Flex>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Flex px={4} py={3} justify="space-between" align="center"
            borderTop={`1px solid ${borderColor}`} wrap="wrap" gap={2}>
            <Text fontSize="sm" color={subColor}>
              {`${startIndex+1}–${Math.min(startIndex+pageSize, allDisplayDocs.length)} of ${allDisplayDocs.length}`}
            </Text>
            <HStack spacing={1}>
              <Button size="sm" onClick={() => setCurrentPage(1)}          isDisabled={currentPage===1}>«</Button>
              <Button size="sm" onClick={() => setCurrentPage(p=>p-1)}     isDisabled={currentPage===1}>‹</Button>
              <Text fontSize="sm" color={textColor} px={2}>{currentPage} / {totalPages}</Text>
              <Button size="sm" onClick={() => setCurrentPage(p=>p+1)}     isDisabled={currentPage===totalPages}>›</Button>
              <Button size="sm" onClick={() => setCurrentPage(totalPages)} isDisabled={currentPage===totalPages}>»</Button>
            </HStack>
          </Flex>
        </Box>
      )}

      {/* ── MODAL: Upload File ─────────────────────────────────────────────── */}
      <Modal isOpen={isUploadOpen} onClose={() => { onUploadClose(); resetUploadModal(); }}
        isCentered size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor} borderBottom={`1px solid ${borderColor}`} pb={3}>
            <Flex align="center" gap={2}>
              <MdUploadFile size={18} color="#38a169"/>
              <Text>{editingId ? "Edit Upload" : "Upload Document"}</Text>
            </Flex>
          </ModalHeader>
          <ModalCloseButton top={3}/>
          <ModalBody py={5}>
            <VStack spacing={4}>
              {selectedProject && (
                <Box w="100%" p={3} bg="blue.50" borderRadius="lg"
                  border="1px solid" borderColor="blue.200" _dark={{ bg:"blue.900", borderColor:"blue.700" }}>
                  <Flex align="center" gap={2}>
                    <MdFolder size={14} color="#2b6cb0"/>
                    <Text fontSize="xs" color="blue.700" fontWeight="600" _dark={{ color:"blue.200" }}>
                      Project: {selectedProject.name}
                    </Text>
                  </Flex>
                </Box>
              )}
              <FormControl isInvalid={!!uploadErrors.title}>
                <FormLabel fontSize="sm" color={textColor}>Title *</FormLabel>
                <Input placeholder="Document title" value={uploadForm.title}
                  onChange={e => {
                    if (e.target.value && !SAFE_TEXT.test(e.target.value)) return;
                    setUploadForm(p => ({...p, title: e.target.value}));
                    setUploadErrors(p => ({...p, title: undefined}));
                  }}/>
                <FormErrorMessage>{uploadErrors.title}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!uploadErrors.description}>
                <FormLabel fontSize="sm" color={textColor}>Description *</FormLabel>
                <Textarea placeholder="Describe the document…" rows={2}
                  value={uploadForm.description}
                  onChange={e => {
                    if (e.target.value && !SAFE_TEXT.test(e.target.value)) return;
                    setUploadForm(p => ({...p, description: e.target.value}));
                    setUploadErrors(p => ({...p, description: undefined}));
                  }}/>
                <FormErrorMessage>{uploadErrors.description}</FormErrorMessage>
              </FormControl>
              <Grid templateColumns="repeat(2,1fr)" gap={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm" color={textColor}>Status</FormLabel>
                  <Select value={uploadForm.status}
                    onChange={e => setUploadForm(p => ({...p, status: e.target.value}))}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="review">In Review</option>
                    <option value="archived">Archived</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" color={textColor}>Assignee</FormLabel>
                  <Select placeholder="Select assignee" value={uploadForm.assignee}
                    onChange={e => setUploadForm(p => ({...p, assignee: e.target.value}))}>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Select>
                </FormControl>
              </Grid>
              <FormControl>
                <FormLabel fontSize="sm" color={textColor}>
                  <Flex align="center" gap={1}>
                    <MdAttachFile size={14}/>
                    File <Text as="span" color={subColor}>(optional, max 10MB)</Text>
                  </Flex>
                </FormLabel>
                {existingFile && !removeFile && !selectedFile && (
                  <Box p={3} bg={fileBg} borderRadius="lg" border="1px solid" borderColor={fileBdr} mb={2}>
                    <Flex align="center" justify="space-between">
                      <Flex align="center" gap={2}>
                        <MdAttachFile size={16} color={fileClr}/>
                        <Box>
                          <Text fontSize="xs" fontWeight="600" color={fileClr} noOfLines={1}>{existingFile.originalName}</Text>
                          <Text fontSize="xs" color={subColor}>{fmtSize(existingFile.size)}</Text>
                        </Box>
                      </Flex>
                      <IconButton icon={<MdClear size={14}/>} size="xs" colorScheme="red"
                        variant="ghost" aria-label="Remove" onClick={() => setRemoveFile(true)}/>
                    </Flex>
                  </Box>
                )}
                {selectedFile && (
                  <Box p={3} bg={fileBg} borderRadius="lg" border="1px solid" borderColor={fileBdr} mb={2}>
                    <Flex align="center" justify="space-between">
                      <Flex align="center" gap={2}>
                        <MdAttachFile size={16} color={fileClr}/>
                        <Box>
                          <Text fontSize="xs" fontWeight="600" color={fileClr} noOfLines={1}>{selectedFile.name}</Text>
                          <Text fontSize="xs" color={subColor}>{fmtSize(selectedFile.size)}</Text>
                        </Box>
                      </Flex>
                      <IconButton icon={<MdClear size={14}/>} size="xs" colorScheme="red"
                        variant="ghost" aria-label="Remove"
                        onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}/>
                    </Flex>
                  </Box>
                )}
                {!selectedFile && !(existingFile && !removeFile) && (
                  <Box onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    bg={dragOver ? dragBg : dropzoneBg} border="2px dashed"
                    borderColor={dragOver ? "blue.400" : dropzoneBdr}
                    borderRadius="xl" p={8} textAlign="center" cursor="pointer"
                    transition="all 0.2s" _hover={{ borderColor:"blue.300", bg: dragBg }}>
                    <MdCloudUpload size={32} color={dragOver ? "#3182ce" : "#a0aec0"}
                      style={{ margin:"0 auto 8px" }}/>
                    <Text fontSize="sm" fontWeight="600" color={dragOver ? "blue.500" : subColor}>
                      {dragOver ? "Drop it here!" : "Drag & drop or click to browse"}
                    </Text>
                    <Text fontSize="xs" color={subColor} mt={1}>
                      PDF, Word, Excel, PowerPoint, TXT, Images — max 10MB
                    </Text>
                  </Box>
                )}
                <input ref={fileInputRef} type="file" style={{ display:"none" }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}/>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter borderTop={`1px solid ${borderColor}`} gap={2}>
            <Button variant="ghost" onClick={() => { onUploadClose(); resetUploadModal(); }}>Cancel</Button>
            <Button colorScheme="green" leftIcon={<MdUploadFile size={14}/>}
              isLoading={uploadSaving} loadingText={editingId ? "Updating…" : "Uploading…"}
              onClick={handleUploadSave}>
              {editingId ? "Update" : "Upload"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── MODAL: Delete ─────────────────────────────────────────────────── */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered size="sm">
        <ModalOverlay/>
        <ModalContent bg={cardBg} borderRadius="xl">
          <ModalHeader fontSize="md" color={textColor}>Delete Document</ModalHeader>
          <ModalBody fontSize="sm" color={subColor}>Are you sure? This cannot be undone.</ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={onDeleteClose}>Cancel</Button>
            <Button size="sm" colorScheme="red" isLoading={deleting}
              loadingText="Deleting…" onClick={handleDelete}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── MODAL: Request Document Access ────────────────────────────────── */}
      <Modal isOpen={isAccessOpen}
        onClose={() => { onAccessClose(); setAccessDoc(null); setAccessMessage(""); }}
        isCentered size="md">
        <ModalOverlay/>
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}><MdLock size={18}/> Request Access</Flex>
          </ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%" p={4} bg={reqBg} borderRadius="lg" border="1px solid" borderColor={reqBdr}>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={1}>Restricted Document</Text>
                <Text fontSize="xs" color={subColor}>You are not assigned to this document. The admin will be notified via email.</Text>
              </Box>
              <FormControl>
                <FormLabel fontSize="sm" color={textColor}>
                  Reason <Text as="span" color={subColor}>(optional)</Text>
                </FormLabel>
                <Textarea placeholder="Explain why you need access…" rows={3}
                  value={accessMessage} onChange={e => setAccessMessage(e.target.value)}/>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={() => { onAccessClose(); setAccessDoc(null); setAccessMessage(""); }}>Cancel</Button>
            <Button colorScheme="orange" leftIcon={<MdMail size={14}/>}
              isLoading={accessSending} onClick={handleRequestAccess}>Send Request</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── MODAL: Pending Access Requests ────────────────────────────────── */}
      <Modal isOpen={isRequestsOpen} onClose={onRequestsClose} isCentered size="xl">
        <ModalOverlay/>
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}>
              <MdLockOpen size={18}/> Pending Access Requests
              {pendingCount > 0 && <Badge colorScheme="red" borderRadius="full" px={2}>{pendingCount}</Badge>}
            </Flex>
          </ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            {pendingRequests.length === 0 ? (
              <Flex direction="column" align="center" py={10} color={subColor}>
                <MdCheck size={40}/><Text fontSize="sm" mt={2}>No pending requests</Text>
              </Flex>
            ) : (
              <VStack spacing={3} align="stretch">
                {pendingRequests.map(req => (
                  <Box key={req._id} p={4} borderRadius="lg" border="1px solid" borderColor={reqBdr} bg={reqBg}>
                    <Flex justify="space-between" align="flex-start">
                      <Box flex={1}>
                        <Flex align="center" gap={2} mb={1}>
                          <Avatar name={req.user?.name} size="xs" bg="brand.500" color="white"/>
                          <Text fontWeight="600" fontSize="sm" color={textColor}>{req.user?.name}</Text>
                          <Badge colorScheme="gray" fontSize="xs">{req.user?.email}</Badge>
                        </Flex>
                        <Text fontSize="xs" color={subColor} mb={1}>
                          wants access to: <strong>{req.document?.title}</strong>
                        </Text>
                        {req.message && (
                          <Text fontSize="xs" color={textColor} mt={1} p={2}
                            bg={cardBg} borderRadius="md" border={`1px solid ${borderColor}`}>
                            "{req.message}"
                          </Text>
                        )}
                      </Box>
                      <HStack ml={4}>
                        <Tooltip label="Approve — emails user">
                          <IconButton icon={<MdCheck size={14}/>} size="sm" colorScheme="green"
                            aria-label="Approve" onClick={() => handleGrantAccess(req._id, true)}/>
                        </Tooltip>
                        <Tooltip label="Deny — emails user">
                          <IconButton icon={<MdClose size={14}/>} size="sm" colorScheme="red"
                            variant="outline" aria-label="Deny" onClick={() => handleGrantAccess(req._id, false)}/>
                        </Tooltip>
                      </HStack>
                    </Flex>
                  </Box>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter><Button variant="ghost" onClick={onRequestsClose}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── MODAL: Single Request (email link) ───────────────────────────── */}
      <Modal isOpen={isFocusOpen} onClose={onFocusClose} isCentered size="md">
        <ModalOverlay/>
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}><MdLockOpen size={18}/> Access Request</Flex>
          </ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            {focusedRequest ? (
              <Box p={4} borderRadius="lg" border="1px solid" borderColor={reqBdr} bg={reqBg}>
                <Flex align="center" gap={2} mb={2}>
                  <Avatar name={focusedRequest.user?.name} size="sm" bg="brand.500" color="white"/>
                  <Box>
                    <Text fontWeight="700" fontSize="sm" color={textColor}>{focusedRequest.user?.name}</Text>
                    <Badge colorScheme="gray" fontSize="xs">{focusedRequest.user?.email}</Badge>
                  </Box>
                </Flex>
                <Text fontSize="sm" color={subColor} mb={1}>
                  Wants access to: <strong style={{ color:textColor }}>{focusedRequest.document?.title}</strong>
                </Text>
                {focusedRequest.message && (
                  <Box mt={2} p={3} bg={cardBg} borderRadius="md" border={`1px solid ${borderColor}`}>
                    <Text fontSize="xs" color={subColor} fontWeight="600" mb={1}>Reason:</Text>
                    <Text fontSize="sm" color={textColor}>"{focusedRequest.message}"</Text>
                  </Box>
                )}
              </Box>
            ) : (
              <Flex justify="center" py={6}><Spinner color="brand.500"/></Flex>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onFocusClose}>Cancel</Button>
            <Button colorScheme="red" variant="outline" leftIcon={<MdClose size={14}/>}
              onClick={async () => { await handleGrantAccess(focusedRequest._id, false); onFocusClose(); }}>
              Deny
            </Button>
            <Button colorScheme="green" leftIcon={<MdCheck size={14}/>}
              onClick={async () => { await handleGrantAccess(focusedRequest._id, true); onFocusClose(); }}>
              Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}