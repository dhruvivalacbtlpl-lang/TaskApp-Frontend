import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box, Flex, Heading, Text, Badge, Avatar, Spinner,
  Button, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, useDisclosure,
  Input, Textarea, Select, useToast, IconButton,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Tooltip, useColorModeValue, FormControl, FormErrorMessage, FormLabel,
  HStack, VStack, Grid,
} from "@chakra-ui/react";
import {
  MdAdd, MdDelete, MdEdit, MdDescription,
  MdLock, MdLockOpen, MdMail, MdCheck, MdClose,
  MdAttachFile, MdDownload, MdClear, MdPerson,
} from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

const statusColors = {
  draft:    "gray",
  active:   "green",
  archived: "orange",
  review:   "purple",
};

const SAFE_TEXT  = /^[a-zA-Z0-9 .,\-_:!?()\n\r@#/]*$/;
const empty      = { title: "", description: "", status: "draft", assignee: "" };
const PAGE_SIZES = [5, 10, 20];

const fmtSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (mimetype) => {
  if (!mimetype) return "📎";
  if (mimetype.includes("pdf"))   return "📕";
  if (mimetype.includes("word"))  return "📘";
  if (mimetype.includes("excel") || mimetype.includes("sheet")) return "📗";
  if (mimetype.includes("image")) return "🖼️";
  if (mimetype.includes("text"))  return "📄";
  return "📎";
};

export default function DocumentsPage() {
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [staff, setStaff]         = useState([]);
  const [form, setForm]           = useState(empty);
  const [errors, setErrors]       = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [removeFile, setRemoveFile]     = useState(false);
  const [existingFile, setExistingFile] = useState(null);
  const fileInputRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(5);

  const [accessDoc, setAccessDoc]         = useState(null);
  const [accessMessage, setAccessMessage] = useState("");
  const [accessSending, setAccessSending] = useState(false);

  const [moduleAccessMessage, setModuleAccessMessage] = useState("");
  const [moduleAccessSending, setModuleAccessSending] = useState(false);

  const [pendingRequests, setPendingRequests] = useState([]);

  // ✅ Highlighted doc from email link
  const [highlightedDocId, setHighlightedDocId] = useState(null);

  const { isOpen,                 onOpen,          onClose          } = useDisclosure();
  const { isOpen: isDeleteOpen,   onOpen: onDeleteOpen,   onClose: onDeleteClose   } = useDisclosure();
  const { isOpen: isAccessOpen,   onOpen: onAccessOpen,   onClose: onAccessClose   } = useDisclosure();
  const { isOpen: isRequestsOpen, onOpen: onRequestsOpen, onClose: onRequestsClose } = useDisclosure();
  const { isOpen: isModuleOpen,   onOpen: onModuleOpen,   onClose: onModuleClose   } = useDisclosure();

  const toast = useToast();
  const { user, hasPermission, selectedProject } = useAuth();

  // ✅ Read token + docId from URL query params (email link)
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin   = user?.role?.name?.toLowerCase() === "admin";
  const canRead   = isAdmin || hasPermission("document_read");
  const canUpdate = isAdmin || hasPermission("document_update");
  const canDelete = isAdmin || hasPermission("document_delete");

  // ── Colors ────────────────────────────────────────────────────────────────
  const cardBg      = useColorModeValue("white", "gray.800");
  const theadBg     = useColorModeValue("#bee3f8", "#2a4365");
  const theadColor  = useColorModeValue("gray.600", "white");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.400", "gray.400");
  const rowEven     = useColorModeValue("white", "gray.800");
  const rowOdd      = useColorModeValue("gray.50", "gray.750");
  const rowHover    = useColorModeValue("brand.50", "gray.700");
  const borderColor = useColorModeValue("#e2e8f0", "#4a5568");
  const iconBg      = useColorModeValue("blue.100", "blue.900");
  const projBlueBg  = useColorModeValue("brand.50", "brand.900");
  const projBlueBdr = useColorModeValue("#bee3f8", "#2a4365");
  const projBlueClr = useColorModeValue("brand.600", "brand.200");
  const reqBg       = useColorModeValue("orange.50", "orange.900");
  const reqBdr      = useColorModeValue("orange.200", "orange.600");
  const lockedBg    = useColorModeValue("gray.50", "gray.700");
  const fileBg      = useColorModeValue("green.50", "green.900");
  const fileBdr     = useColorModeValue("green.200", "green.600");
  const fileClr     = useColorModeValue("green.700", "green.200");
  const warnBg      = useColorModeValue("yellow.50", "yellow.900");
  const warnBdr     = useColorModeValue("yellow.300", "yellow.600");
  const highlightBg = useColorModeValue("green.50", "green.900");
  const highlightBdr= useColorModeValue("green.300", "green.600");

  useEffect(() => { fetchAll(); }, []);

  // ✅ State for single request popup (from email link)
  const [focusedRequest, setFocusedRequest] = useState(null);
  const { isOpen: isFocusOpen, onOpen: onFocusOpen, onClose: onFocusClose } = useDisclosure();

  // ✅ Auto-open single request popup if admin came from email link with requestId
  useEffect(() => {
    const requestId = searchParams.get("requestId");
    if (!requestId || !isAdmin) return;

    const openFocusedRequest = async () => {
      try {
        // Wait for pendingRequests to load
        await new Promise(r => setTimeout(r, 1000));
        const found = pendingRequests.find(r => r._id === requestId);
        if (found) {
          setFocusedRequest(found);
          onFocusOpen();
        } else {
          // Fetch fresh and try again
          const res = await api.get("/documents/access-requests");
          const fresh = (res.data || []).find(r => r._id === requestId);
          if (fresh) { setFocusedRequest(fresh); onFocusOpen(); }
        }
      } catch { /* silent */ }
      setSearchParams({}, { replace: true });
    };

    openFocusedRequest();
  }, [isAdmin, pendingRequests]);

  // ✅ Handle token from email link — verify it, highlight the doc
  useEffect(() => {
    const token = searchParams.get("token");
    const docId = searchParams.get("docId");
    if (!token || !docId) return;

    const verifyToken = async () => {
      try {
        const res = await api.get(`/documents/verify-token?token=${token}&docId=${docId}`);
        if (res.data.valid) {
          setHighlightedDocId(docId);
          toast({
            title: "✅ Access verified",
            description: "Your document is highlighted below.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });

          // Scroll to the document row after docs load
          setTimeout(() => {
            const el = document.getElementById(`doc-row-${docId}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 1000);
        }
      } catch {
        toast({
          title: "🔗 Link expired or invalid",
          description: "Please request access again if needed.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        // Clean the token from the URL so it doesn't persist on refresh
        setSearchParams({}, { replace: true });
      }
    };

    verifyToken();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [docsRes, staffRes, reqRes] = await Promise.all([
        api.get("/documents"),
        api.get("/staff"),
        isAdmin
          ? api.get("/documents/access-requests")
          : Promise.resolve({ data: [] }),
      ]);
      setDocs(docsRes.data || []);
      setStaff(staffRes.data || []);
      setPendingRequests(reqRes.data || []);
    } catch (err) {
      console.error("fetchAll error:", err);
      toast({ title: "Failed to load documents", status: "error", duration: 2000 });
    } finally {
      setLoading(false);
    }
  };

  // ── Document-level access ─────────────────────────────────────────────────
  const isAssignedToDoc = (doc) =>
    doc.assignee?._id === user?._id || doc.assignee === user?._id;

  const isCreatorOfDoc = (doc) =>
    doc.createdBy?._id === user?._id || doc.createdBy === user?._id;

  const isAllowedUser = (doc) =>
    doc.allowedUsers?.some(
      (u) => (u?._id || u)?.toString() === user?._id?.toString()
    );

  const canReadDoc = (doc) =>
    isAdmin || isAssignedToDoc(doc) || isCreatorOfDoc(doc) || isAllowedUser(doc);

  // ── Filter + paginate ─────────────────────────────────────────────────────
  const projectFiltered = selectedProject
    ? docs.filter(d => d.project?._id === selectedProject._id)
    : docs;

  const visibleDocs    = projectFiltered.filter(d => canReadDoc(d));
  const lockedDocs     = canRead && !isAdmin
    ? projectFiltered.filter(d => !canReadDoc(d))
    : [];
  const allDisplayDocs = [...visibleDocs, ...lockedDocs];
  const totalPages     = Math.max(1, Math.ceil(allDisplayDocs.length / pageSize));
  const startIndex     = (currentPage - 1) * pageSize;
  const paginated      = allDisplayDocs.slice(startIndex, startIndex + pageSize);
  const pendingCount   = pendingRequests.length;

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.title.trim())               e.title       = "Title is required.";
    else if (!SAFE_TEXT.test(form.title)) e.title       = "No special characters allowed.";
    if (!form.description.trim())         e.description = "Description is required.";
    return e;
  };

  const resetModal = () => {
    setForm(empty);
    setEditingId(null);
    setErrors({});
    setSelectedFile(null);
    setRemoveFile(false);
    setExistingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpen = (doc) => {
    setForm({
      title:       doc.title,
      description: doc.description,
      status:      doc.status || "draft",
      assignee:    doc.assignee?._id || "",
    });
    setEditingId(doc._id);
    setExistingFile(doc.file?.url ? doc.file : null);
    setSelectedFile(null);
    setRemoveFile(false);
    setErrors({});
    onOpen();
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    if (!editingId && !selectedProject) {
      toast({
        title: "Please select a project first",
        description: "Use the project dropdown in the top navbar.",
        status: "warning",
        duration: 4000,
      });
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title",       form.title);
      fd.append("description", form.description);
      fd.append("status",      form.status);
      if (form.assignee)   fd.append("assignee",   form.assignee);
      if (selectedProject) fd.append("project",    selectedProject._id);
      if (selectedFile)    fd.append("file",       selectedFile);
      if (removeFile)      fd.append("removeFile", "true");

      if (editingId) {
        const res = await api.put(`/documents/${editingId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setDocs(prev => prev.map(d => d._id === editingId ? res.data : d));
        toast({ title: "Document updated!", status: "success", duration: 2000 });
      } else {
        const res = await api.post("/documents", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setDocs(prev => [res.data, ...prev]);
        toast({ title: "Document created!", status: "success", duration: 2000 });
      }
      onClose();
      resetModal();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to save document";
      toast({ title: msg, status: "error", duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteId}`);
      setDocs(prev => prev.filter(d => d._id !== deleteId));
      toast({ title: "Document deleted", status: "info", duration: 2000 });
      onDeleteClose();
      setDeleteId(null);
    } catch {
      toast({ title: "Failed to delete", status: "error", duration: 2000 });
    } finally {
      setDeleting(false);
    }
  };

  // ── Request access to specific doc ───────────────────────────────────────
  const handleRequestAccess = async () => {
    if (!accessDoc) return;
    setAccessSending(true);
    try {
      await api.post(`/documents/${accessDoc._id}/request-access`, { message: accessMessage });
      toast({ title: "Access request sent to admin!", status: "success", duration: 3000 });
      setAccessMessage("");
      onAccessClose();
      setAccessDoc(null);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to send request";
      if (msg.includes("already have a pending")) {
        toast({ title: "You already have a pending request for this document", status: "warning", duration: 3000 });
        onAccessClose();
      } else {
        toast({ title: msg, status: "error", duration: 3000 });
      }
    } finally {
      setAccessSending(false);
    }
  };

  // ── Request module access ─────────────────────────────────────────────────
  const handleModuleAccessRequest = async () => {
    setModuleAccessSending(true);
    try {
      await api.post("/documents/request-module-access", { message: moduleAccessMessage });
      toast({ title: "Access request sent to admin!", status: "success", duration: 3000 });
      setModuleAccessMessage("");
      onModuleClose();
    } catch {
      toast({ title: "Failed to send request", status: "error", duration: 2000 });
    } finally {
      setModuleAccessSending(false);
    }
  };

  // ── Approve / Deny ────────────────────────────────────────────────────────
  const handleGrantAccess = async (requestId, approve) => {
    try {
      await api.put(`/documents/access-requests/${requestId}`, {
        status: approve ? "approved" : "denied",
      });

      const docsRes = await api.get("/documents");
      setDocs(docsRes.data || []);

      setPendingRequests(prev => prev.filter(r => r._id !== requestId));
      toast({
        title: approve ? "Access granted & email sent!" : "Request denied & user notified",
        status: approve ? "success" : "info",
        duration: 2000,
      });
    } catch {
      toast({ title: "Failed to update request", status: "error", duration: 2000 });
    }
  };

  if (loading) return (
    <Flex justify="center" py={20}>
      <Spinner size="xl" color="brand.500" />
    </Flex>
  );

  return (
    <Box>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" mb={4}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={3}>
            <Box bg={iconBg} p={3} borderRadius="lg">
              <MdDescription size={26} color="#2b6cb0" />
            </Box>
            <Box>
              <Heading size="md" color={textColor}>Documents</Heading>
              <Text fontSize="sm" color={subColor}>
                {selectedProject
                  ? `📁 ${selectedProject.name} · ${allDisplayDocs.length} documents`
                  : `All projects · ${allDisplayDocs.length} documents`}
              </Text>
            </Box>
          </Flex>

          <HStack spacing={2}>
            {isAdmin && (
              <Button
                leftIcon={<MdLockOpen />}
                colorScheme="orange"
                size="sm"
                variant="outline"
                onClick={onRequestsOpen}
                position="relative"
              >
                Access Requests
                {pendingCount > 0 && (
                  <Badge
                    colorScheme="red"
                    borderRadius="full"
                    position="absolute"
                    top="-8px"
                    right="-8px"
                    fontSize="10px"
                    px={1.5}
                  >
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            )}

            <Tooltip
              label={!selectedProject ? "Select a project from the top navbar first" : ""}
              isDisabled={!!selectedProject}
            >
              <Button
                leftIcon={<MdAdd />}
                colorScheme="brand"
                size="sm"
                isDisabled={!selectedProject}
                onClick={() => { resetModal(); onOpen(); }}
              >
                New Document
              </Button>
            </Tooltip>
          </HStack>
        </Flex>
      </Box>

      {/* ── NO PROJECT BANNER ────────────────────────────────────────────── */}
      {!selectedProject && (
        <Box mb={4} p={4} bg={warnBg} borderRadius="xl" border={`1px solid ${warnBdr}`}>
          <Flex align="center" gap={3}>
            <Text fontSize="xl">📁</Text>
            <Box>
              <Text fontWeight="600" fontSize="sm" color={textColor}>
                Select a project to create documents
              </Text>
              <Text fontSize="xs" color={subColor}>
                Use the project dropdown in the top navbar. You can still view all documents below.
              </Text>
            </Box>
          </Flex>
        </Box>
      )}

      {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
      {allDisplayDocs.length === 0 && (
        <Flex direction="column" align="center" py={20} color={subColor}>
          <MdDescription size={48} />
          <Text fontSize="sm" mt={2}>
            {selectedProject
              ? `No documents for ${selectedProject.name}`
              : "No documents found"}
          </Text>
          {selectedProject && (
            <Button mt={4} colorScheme="brand" size="sm" leftIcon={<MdAdd />}
              onClick={() => { resetModal(); onOpen(); }}>
              Create first document
            </Button>
          )}
        </Flex>
      )}

      {/* ── TABLE ────────────────────────────────────────────────────────── */}
      {allDisplayDocs.length > 0 && (
        <Box bg={cardBg} borderRadius="xl" boxShadow="md"
          border={`1px solid ${borderColor}`} overflow="hidden">
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}>
                <Tr>
                  {["#", "Title", "Description", "Status", "Assignee", "Created By",
                    "Project", "File", "Date", "Actions"].map(h => (
                    <Th key={h} color={theadColor} fontSize="xs" py={3}
                      textAlign={h === "Actions" ? "right" : "left"}>
                      {h}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {paginated.map((doc, idx) => {
                  const canSeeThisDoc  = canReadDoc(doc);
                  const isHighlighted  = doc._id === highlightedDocId;

                  // ── LOCKED ROW ──────────────────────────────────────────
                  if (!canSeeThisDoc) {
                    return (
                      <Tr key={doc._id} bg={lockedBg} opacity={0.75}>
                        <Td color={subColor} fontSize="xs">{startIndex + idx + 1}</Td>
                        <Td py={3}>
                          <Flex align="center" gap={2}>
                            <MdLock size={14} color="#a0aec0" />
                            <Text fontSize="sm" color={subColor} fontWeight="600">
                              Restricted Document
                            </Text>
                          </Flex>
                        </Td>
                        <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                        <Td>
                          <Badge colorScheme="gray" borderRadius="full" fontSize="xs" px={2}>
                            restricted
                          </Badge>
                        </Td>
                        <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                        <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                        <Td>
                          <Text fontSize="xs" color={subColor}>
                            {doc.project?.name ? `📁 ${doc.project.name}` : "—"}
                          </Text>
                        </Td>
                        <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                        <Td><Text fontSize="xs" color={subColor}>—</Text></Td>
                        <Td textAlign="right">
                          <Tooltip label="Request access">
                            <IconButton
                              icon={<MdLock />}
                              size="xs"
                              colorScheme="orange"
                              aria-label="Request Access"
                              onClick={() => { setAccessDoc(doc); onAccessOpen(); }}
                            />
                          </Tooltip>
                        </Td>
                      </Tr>
                    );
                  }

                  // ── VISIBLE ROW ─────────────────────────────────────────
                  return (
                    <Tr
                      key={doc._id}
                      id={`doc-row-${doc._id}`}
                      bg={isHighlighted ? highlightBg : idx % 2 === 0 ? rowEven : rowOdd}
                      border={isHighlighted ? `2px solid` : undefined}
                      borderColor={isHighlighted ? highlightBdr : undefined}
                      _hover={{ bg: rowHover }}
                      transition="background 0.15s"
                    >
                      <Td color={subColor} fontSize="xs">{startIndex + idx + 1}</Td>
                      <Td py={3} maxW="150px">
                        <Flex align="center" gap={2}>
                          <MdDescription size={14} color="#3b82f6" />
                          <Text fontWeight="600" fontSize="sm" color={textColor} noOfLines={1}>
                            {doc.title}
                          </Text>
                          {/* ✅ "New Access" badge for email link arrivals */}
                          {isHighlighted && (
                            <Badge colorScheme="green" fontSize="9px" borderRadius="full" px={1.5}>
                              ✓ Access Granted
                            </Badge>
                          )}
                        </Flex>
                      </Td>
                      <Td maxW="160px">
                        <Text fontSize="xs" color={subColor} noOfLines={2}>
                          {doc.description}
                        </Text>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={statusColors[doc.status] || "gray"}
                          borderRadius="full" fontSize="xs" px={2} textTransform="capitalize"
                        >
                          {doc.status || "draft"}
                        </Badge>
                      </Td>
                      <Td>
                        {doc.assignee?.name ? (
                          <Flex align="center" gap={2}>
                            <Avatar name={doc.assignee.name} size="xs" bg="brand.500" color="white" />
                            <Text fontSize="xs" color={textColor} whiteSpace="nowrap">
                              {doc.assignee.name}
                            </Text>
                          </Flex>
                        ) : (
                          <Text fontSize="xs" color={subColor}>—</Text>
                        )}
                      </Td>
                      <Td>
                        <Flex align="center" gap={2}>
                          <Avatar name={doc.createdBy?.name} size="xs" bg="purple.400" color="white" />
                          <Box>
                            <Text fontSize="xs" color={textColor} whiteSpace="nowrap">
                              {doc.createdBy?.name || "—"}
                            </Text>
                            {isCreatorOfDoc(doc) && (
                              <Badge colorScheme="purple" fontSize="9px" borderRadius="full">
                                you
                              </Badge>
                            )}
                          </Box>
                        </Flex>
                      </Td>
                      <Td>
                        <Text fontSize="xs" color={subColor} noOfLines={1}>
                          {doc.project?.name ? `📁 ${doc.project.name}` : "—"}
                        </Text>
                      </Td>
                      <Td>
                        {doc.file?.url ? (
                          <Tooltip label={`${doc.file.originalName} (${fmtSize(doc.file.size)})`}>
                            <Button
                              as="a"
                              href={`${import.meta.env.VITE_API_URL || "https://w2ml73xv-5000.inc1.devtunnels.ms"}${doc.file.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="xs"
                              colorScheme="green"
                              variant="outline"
                              leftIcon={
                                <span style={{ fontSize: "12px" }}>
                                  {fileIcon(doc.file.mimetype)}
                                </span>
                              }
                            >
                              <MdDownload size={12} />
                            </Button>
                          </Tooltip>
                        ) : (
                          <Text fontSize="xs" color={subColor}>—</Text>
                        )}
                      </Td>
                      <Td>
                        <Text fontSize="xs" color={subColor} whiteSpace="nowrap">
                          {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </Text>
                      </Td>
                      <Td textAlign="right">
                        <Flex justify="flex-end" gap={1}>
                          {(canUpdate || isCreatorOfDoc(doc)) && (
                            <Tooltip label="Edit">
                              <IconButton icon={<MdEdit />} size="xs" colorScheme="brand"
                                variant="ghost" aria-label="Edit"
                                onClick={() => handleOpen(doc)} />
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip label="Delete">
                              <IconButton icon={<MdDelete />} size="xs" colorScheme="red"
                                variant="ghost" aria-label="Delete"
                                onClick={() => { setDeleteId(doc._id); onDeleteOpen(); }} />
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

          {/* ── PAGINATION ── */}
          <Flex px={4} py={3} justify="space-between" align="center"
            borderTop={`1px solid ${borderColor}`}>
            <Text fontSize="sm" color={subColor}>
              {`${startIndex + 1}–${Math.min(startIndex + pageSize, allDisplayDocs.length)} of ${allDisplayDocs.length}`}
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

      {/* ── MODAL: Create / Edit ──────────────────────────────────────────── */}
      <Modal isOpen={isOpen} onClose={() => { onClose(); resetModal(); }} isCentered size="lg">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}>
              <MdDescription />
              {editingId ? "Edit Document" : "New Document"}
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>

              {selectedProject && (
                <Box w="100%" p={3} bg={projBlueBg} borderRadius="lg"
                  border={`1px solid ${projBlueBdr}`}>
                  <Text fontSize="xs" color={projBlueClr} fontWeight="600">
                    📁 Project: {selectedProject.name}
                  </Text>
                </Box>
              )}

              {!editingId && (
                <Box w="100%" p={3} bg={cardBg} borderRadius="lg"
                  border={`1px solid ${borderColor}`}>
                  <Flex align="center" gap={2}>
                    <MdPerson size={14} color="#805ad5" />
                    <Text fontSize="xs" color={subColor}>
                      Creating as: <strong style={{ color: "inherit" }}>{user?.name}</strong>
                    </Text>
                  </Flex>
                </Box>
              )}

              <FormControl isInvalid={!!errors.title}>
                <FormLabel fontSize="sm" color={textColor}>Title *</FormLabel>
                <Input placeholder="Document title" value={form.title}
                  onChange={e => {
                    if (e.target.value && !SAFE_TEXT.test(e.target.value)) return;
                    setForm(p => ({ ...p, title: e.target.value }));
                    setErrors(p => ({ ...p, title: undefined }));
                  }} />
                <FormErrorMessage>{errors.title}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.description}>
                <FormLabel fontSize="sm" color={textColor}>Description *</FormLabel>
                <Textarea placeholder="Describe the document..." value={form.description} rows={3}
                  onChange={e => {
                    if (e.target.value && !SAFE_TEXT.test(e.target.value)) return;
                    setForm(p => ({ ...p, description: e.target.value }));
                    setErrors(p => ({ ...p, description: undefined }));
                  }} />
                <FormErrorMessage>{errors.description}</FormErrorMessage>
              </FormControl>

              <Grid templateColumns="repeat(2, 1fr)" gap={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm" color={textColor}>Status</FormLabel>
                  <Select value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="review">In Review</option>
                    <option value="archived">Archived</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" color={textColor}>
                    Assignee <Text as="span" color={subColor}>(optional)</Text>
                  </FormLabel>
                  <Select placeholder="Select assignee" value={form.assignee}
                    onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))}>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Select>
                </FormControl>
              </Grid>

              {/* File Upload */}
              <FormControl>
                <FormLabel fontSize="sm" color={textColor}>
                  <Flex align="center" gap={2}>
                    <MdAttachFile />
                    Attachment <Text as="span" color={subColor}>(optional, max 10MB)</Text>
                  </Flex>
                </FormLabel>

                {existingFile && !removeFile && !selectedFile && (
                  <Box p={3} bg={fileBg} borderRadius="lg" border={`1px solid ${fileBdr}`} mb={2}>
                    <Flex align="center" justify="space-between">
                      <Flex align="center" gap={2}>
                        <Text fontSize="lg">{fileIcon(existingFile.mimetype)}</Text>
                        <Box>
                          <Text fontSize="xs" fontWeight="600" color={fileClr} noOfLines={1}>
                            {existingFile.originalName}
                          </Text>
                          <Text fontSize="xs" color={subColor}>{fmtSize(existingFile.size)}</Text>
                        </Box>
                      </Flex>
                      <Tooltip label="Remove file">
                        <IconButton icon={<MdClear />} size="xs" colorScheme="red" variant="ghost"
                          aria-label="Remove" onClick={() => setRemoveFile(true)} />
                      </Tooltip>
                    </Flex>
                  </Box>
                )}

                {selectedFile && (
                  <Box p={3} bg={fileBg} borderRadius="lg" border={`1px solid ${fileBdr}`} mb={2}>
                    <Flex align="center" justify="space-between">
                      <Flex align="center" gap={2}>
                        <Text fontSize="lg">{fileIcon(selectedFile.type)}</Text>
                        <Box>
                          <Text fontSize="xs" fontWeight="600" color={fileClr} noOfLines={1}>
                            {selectedFile.name}
                          </Text>
                          <Text fontSize="xs" color={subColor}>{fmtSize(selectedFile.size)}</Text>
                        </Box>
                      </Flex>
                      <Tooltip label="Remove selected file">
                        <IconButton icon={<MdClear />} size="xs" colorScheme="red" variant="ghost"
                          aria-label="Remove"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }} />
                      </Tooltip>
                    </Flex>
                  </Box>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      toast({ title: "File too large. Max 10MB.", status: "error", duration: 3000 });
                      return;
                    }
                    setSelectedFile(file);
                    setRemoveFile(false);
                    setExistingFile(null);
                  }}
                />
                <Button size="sm" variant="outline" leftIcon={<MdAttachFile />}
                  onClick={() => fileInputRef.current?.click()}
                  isDisabled={!!selectedFile}>
                  {selectedFile
                    ? "File selected"
                    : existingFile && !removeFile
                      ? "Replace file"
                      : "Choose file"}
                </Button>
                <Text fontSize="xs" color={subColor} mt={1}>
                  Supported: PDF, Word, Excel, PowerPoint, TXT, Images
                </Text>
              </FormControl>

              {form.assignee && (
                <Box w="100%" p={3} bg={projBlueBg} borderRadius="lg"
                  border={`1px solid ${projBlueBdr}`}>
                  <Flex align="center" gap={2}>
                    <MdMail size={14} color="#3b82f6" />
                    <Text fontSize="xs" color={projBlueClr}>
                      Assignee will receive an email notification automatically.
                    </Text>
                  </Flex>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onClose(); resetModal(); }}>
              Cancel
            </Button>
            <Button colorScheme="brand" isLoading={saving} onClick={handleSave}>
              {editingId ? "Update" : "Create"} Document
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── MODAL: Delete ────────────────────────────────────────────────── */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered size="sm">
        <ModalOverlay />
        <ModalContent bg={cardBg} borderRadius="xl">
          <ModalHeader fontSize="md" color={textColor}>Delete Document</ModalHeader>
          <ModalBody fontSize="sm" color={subColor}>
            Are you sure? This action cannot be undone.
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

      {/* ── MODAL: Request Access to specific doc ────────────────────────── */}
      <Modal isOpen={isAccessOpen}
        onClose={() => { onAccessClose(); setAccessDoc(null); setAccessMessage(""); }}
        isCentered size="md">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}><MdLock /> Request Document Access</Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%" p={4} bg={reqBg} borderRadius="lg" border={`1px solid ${reqBdr}`}>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={1}>
                  🔒 Restricted Document
                </Text>
                <Text fontSize="xs" color={subColor}>
                  You are not assigned to this document. The admin will be notified via email.
                </Text>
              </Box>
              <FormControl>
                <FormLabel fontSize="sm" color={textColor}>
                  Reason <Text as="span" color={subColor}>(optional)</Text>
                </FormLabel>
                <Textarea placeholder="Explain why you need access..."
                  value={accessMessage} onChange={e => setAccessMessage(e.target.value)} rows={3} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3}
              onClick={() => { onAccessClose(); setAccessDoc(null); setAccessMessage(""); }}>
              Cancel
            </Button>
            <Button colorScheme="orange" leftIcon={<MdMail />}
              isLoading={accessSending} onClick={handleRequestAccess}>
              Send Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── MODAL: Module Access Request ─────────────────────────────────── */}
      <Modal isOpen={isModuleOpen} onClose={onModuleClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}><MdLock /> Request Documents Access</Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%" p={4} bg={reqBg} borderRadius="lg" border={`1px solid ${reqBdr}`}>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={1}>
                  📄 Documents Module
                </Text>
                <Text fontSize="xs" color={subColor}>
                  Your request will be sent to the admin via email.
                </Text>
              </Box>
              <FormControl>
                <FormLabel fontSize="sm" color={textColor}>
                  Reason <Text as="span" color={subColor}>(optional)</Text>
                </FormLabel>
                <Textarea placeholder="Explain why you need access..."
                  value={moduleAccessMessage}
                  onChange={e => setModuleAccessMessage(e.target.value)} rows={3} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onModuleClose}>Cancel</Button>
            <Button colorScheme="orange" leftIcon={<MdMail />}
              isLoading={moduleAccessSending} onClick={handleModuleAccessRequest}>
              Send Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── MODAL: Pending Access Requests (admin) ───────────────────────── */}
      <Modal isOpen={isRequestsOpen} onClose={onRequestsClose} isCentered size="xl">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}>
              <MdLockOpen /> Pending Access Requests
              {pendingCount > 0 && (
                <Badge colorScheme="red" borderRadius="full" px={2}>{pendingCount}</Badge>
              )}
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {pendingRequests.length === 0 ? (
              <Flex direction="column" align="center" py={10} color={subColor}>
                <MdCheck size={40} />
                <Text fontSize="sm" mt={2}>No pending requests</Text>
              </Flex>
            ) : (
              <VStack spacing={3} align="stretch">
                {pendingRequests.map(req => (
                  <Box key={req._id} p={4} borderRadius="lg"
                    border={`1px solid ${reqBdr}`} bg={reqBg}>
                    <Flex justify="space-between" align="flex-start">
                      <Box flex={1}>
                        <Flex align="center" gap={2} mb={1}>
                          <Avatar name={req.user?.name} size="xs" bg="brand.500" color="white" />
                          <Text fontWeight="600" fontSize="sm" color={textColor}>
                            {req.user?.name}
                          </Text>
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
                          <IconButton icon={<MdCheck />} size="sm" colorScheme="green"
                            aria-label="Approve"
                            onClick={() => handleGrantAccess(req._id, true)} />
                        </Tooltip>
                        <Tooltip label="Deny — emails user">
                          <IconButton icon={<MdClose />} size="sm" colorScheme="red"
                            variant="outline" aria-label="Deny"
                            onClick={() => handleGrantAccess(req._id, false)} />
                        </Tooltip>
                      </HStack>
                    </Flex>
                  </Box>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onRequestsClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── MODAL: Single Request Popup (from email link) ─────────────────── */}
      <Modal isOpen={isFocusOpen} onClose={onFocusClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}>
              <MdLockOpen /> Access Request
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {focusedRequest ? (
              <Box p={4} borderRadius="lg" border={`1px solid ${reqBdr}`} bg={reqBg}>
                <Flex justify="space-between" align="flex-start">
                  <Box flex={1}>
                    <Flex align="center" gap={2} mb={2}>
                      <Avatar name={focusedRequest.user?.name} size="sm" bg="brand.500" color="white" />
                      <Box>
                        <Text fontWeight="700" fontSize="sm" color={textColor}>
                          {focusedRequest.user?.name}
                        </Text>
                        <Badge colorScheme="gray" fontSize="xs">{focusedRequest.user?.email}</Badge>
                      </Box>
                    </Flex>
                    <Text fontSize="sm" color={subColor} mb={1}>
                      Wants access to: <strong style={{ color: textColor }}>{focusedRequest.document?.title}</strong>
                    </Text>
                    {focusedRequest.document?.project?.name && (
                      <Text fontSize="xs" color={subColor} mb={2}>📁 {focusedRequest.document.project.name}</Text>
                    )}
                    {focusedRequest.message && (
                      <Box mt={2} p={3} bg={cardBg} borderRadius="md" border={`1px solid ${borderColor}`}>
                        <Text fontSize="xs" color={subColor} fontWeight="600" mb={1}>Reason:</Text>
                        <Text fontSize="sm" color={textColor}>"{focusedRequest.message}"</Text>
                      </Box>
                    )}
                  </Box>
                </Flex>
              </Box>
            ) : (
              <Flex justify="center" py={6}><Spinner color="brand.500" /></Flex>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onFocusClose}>Cancel</Button>
            <Button
              colorScheme="red" variant="outline" leftIcon={<MdClose />}
              onClick={async () => {
                await handleGrantAccess(focusedRequest._id, false);
                onFocusClose();
              }}
            >
              Deny
            </Button>
            <Button
              colorScheme="green" leftIcon={<MdCheck />}
              onClick={async () => {
                await handleGrantAccess(focusedRequest._id, true);
                onFocusClose();
              }}
            >
              Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}