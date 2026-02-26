import { useState, useEffect } from "react";
import {
  Box, Flex, Heading, Text, Badge, Avatar, Spinner,
  Button, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, useDisclosure,
  Input, Textarea, Select, useToast, IconButton,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Alert, AlertIcon, AlertDescription, Tooltip,
  useColorModeValue, FormControl, FormErrorMessage, FormLabel,
  HStack, VStack, Grid,
} from "@chakra-ui/react";
import {
  MdAdd, MdDelete, MdEdit, MdDescription,
  MdLock, MdLockOpen, MdMail, MdCheck, MdClose,
} from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

const statusColors = {
  draft:    "gray",
  active:   "green",
  archived: "orange",
  review:   "purple",
};

const SAFE_TEXT = /^[a-zA-Z0-9 .,\-_:!?()\n\r@#/]*$/;

const empty = {
  title: "", description: "", status: "draft", assignee: "",
};

const PAGE_SIZES = [5, 10, 20];

const buildEmailHtml = ({ type, toName, fromName, docTitle, projectName, message }) => `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px 28px;text-align:center">
      <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
        <span style="font-size:24px">${type === "assigned" ? "📄" : type === "access_request" ? "🔐" : "✅"}</span>
      </div>
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700">
        ${type === "assigned" ? "Document Assigned" : type === "access_request" ? "Access Requested" : "Access Granted"}
      </h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px">Task Manager · Document System</p>
    </div>
    <div style="padding:28px">
      <p style="color:#374151;font-size:15px;margin:0 0 18px">Hi <strong>${toName}</strong>,</p>
      <div style="background:white;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:7px 0;color:#6b7280;font-size:13px;width:110px">Document</td><td style="padding:7px 0;color:#111827;font-weight:600;font-size:13px">${docTitle}</td></tr>
          ${projectName ? `<tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Project</td><td style="padding:7px 0;color:#111827;font-size:13px">📁 ${projectName}</td></tr>` : ""}
          ${fromName ? `<tr><td style="padding:7px 0;color:#6b7280;font-size:13px">${type === "access_request" ? "Requested by" : "By"}</td><td style="padding:7px 0;color:#111827;font-size:13px">${fromName}</td></tr>` : ""}
        </table>
      </div>
      ${message ? `<div style="background:#f0f9ff;border-left:4px solid #667eea;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px"><p style="margin:0;color:#374151;font-size:13px;line-height:1.6">${message}</p></div>` : ""}
      <p style="color:#6b7280;font-size:12px;text-align:center;margin:0;padding-top:16px;border-top:1px solid #f3f4f6">
        This is an automated notification from Task Manager.
      </p>
    </div>
  </div>`;

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

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(5);

  const [accessDoc, setAccessDoc]         = useState(null);
  const [accessMessage, setAccessMessage] = useState("");
  const [accessSending, setAccessSending] = useState(false);

  // For staff with NO read permission — request access to the whole module
  const [moduleAccessMessage, setModuleAccessMessage] = useState("");
  const [moduleAccessSending, setModuleAccessSending] = useState(false);

  const [pendingRequests, setPendingRequests] = useState([]);

  const { isOpen, onOpen, onClose }                     = useDisclosure();
  const { isOpen: isDeleteOpen,    onOpen: onDeleteOpen,    onClose: onDeleteClose    } = useDisclosure();
  const { isOpen: isAccessOpen,    onOpen: onAccessOpen,    onClose: onAccessClose    } = useDisclosure();
  const { isOpen: isRequestsOpen,  onOpen: onRequestsOpen,  onClose: onRequestsClose  } = useDisclosure();
  const { isOpen: isModuleOpen,    onOpen: onModuleOpen,    onClose: onModuleClose    } = useDisclosure();

  const toast = useToast();
  const { user, hasPermission, selectedProject } = useAuth();

  const isAdmin   = user?.role?.name?.toLowerCase() === "admin";

  // ── Permission keys match what UpdateRole saves ──────────────────────────
  // permissions collection value = "document"
  // UpdateRole splits by "_" → saves "document_read", "document_create" etc
  const canRead   = isAdmin || hasPermission("document_read");
  const canCreate = isAdmin || hasPermission("document_create");
  const canUpdate = isAdmin || hasPermission("document_update");
  const canDelete = isAdmin || hasPermission("document_delete");

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

  useEffect(() => {
    // Always fetch staff so access request modal has admin list
    fetchStaff();
    if (canRead) fetchAll();
    else setLoading(false);
  }, [canRead]);

  const fetchStaff = async () => {
    try {
      const res = await api.get("/staff");
      setStaff(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAll = async () => {
    try {
      const [docsRes, staffRes, reqRes] = await Promise.all([
        api.get("/documents"),
        api.get("/staff"),
        isAdmin ? api.get("/documents/access-requests") : Promise.resolve({ data: [] }),
      ]);
      setDocs(docsRes.data || []);
      setStaff(staffRes.data || []);
      setPendingRequests(reqRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered   = selectedProject ? docs.filter(d => d.project?._id === selectedProject._id) : docs;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginated  = filtered.slice(startIndex, startIndex + pageSize);
  const pendingCount = pendingRequests.length;

  const validate = () => {
    const e = {};
    if (!form.title.trim())                    e.title = "Title is required.";
    else if (!SAFE_TEXT.test(form.title))      e.title = "No special characters allowed.";
    if (!form.description.trim())              e.description = "Description is required.";
    if (!form.assignee)                        e.assignee = "Assignee is required.";
    return e;
  };

  const resetModal = () => { setForm(empty); setEditingId(null); setErrors({}); };

  const handleOpen = (doc) => {
    setForm({
      title: doc.title,
      description: doc.description,
      status: doc.status || "draft",
      assignee: doc.assignee?._id || "",
    });
    setEditingId(doc._id);
    setErrors({});
    onOpen();
  };

  const sendEmail = async ({ to, subject, html }) => {
    try { await api.post("/email/send", { to, subject, html }); }
    catch (err) { console.warn("Email send failed:", err); }
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = { ...form, project: selectedProject?._id || null };
      if (editingId) {
        const res = await api.put(`/documents/${editingId}`, payload);
        setDocs(prev => prev.map(d => d._id === editingId ? res.data : d));
        toast({ title: "Document updated!", status: "success", duration: 2000 });
        const assigneeUser = staff.find(s => s._id === form.assignee);
        if (assigneeUser?.email) {
          await sendEmail({
            to: assigneeUser.email,
            subject: `Document Updated: ${form.title}`,
            html: buildEmailHtml({ type: "assigned", toName: assigneeUser.name, fromName: user.name, docTitle: form.title, projectName: selectedProject?.name, message: `The document "<strong>${form.title}</strong>" has been updated and you are assigned to it.` }),
          });
        }
      } else {
        const res = await api.post("/documents", payload);
        setDocs(prev => [res.data, ...prev]);
        toast({ title: "Document created!", status: "success", duration: 2000 });
        const assigneeUser = staff.find(s => s._id === form.assignee);
        if (assigneeUser?.email) {
          await sendEmail({
            to: assigneeUser.email,
            subject: `You've been assigned a document: ${form.title}`,
            html: buildEmailHtml({ type: "assigned", toName: assigneeUser.name, fromName: user.name, docTitle: form.title, projectName: selectedProject?.name, message: `You have been assigned to the document "<strong>${form.title}</strong>". Please review it at your earliest convenience.` }),
          });
        }
      }
      onClose();
      resetModal();
    } catch (err) {
      toast({ title: "Failed to save document", status: "error", duration: 2000 });
    } finally {
      setSaving(false);
    }
  };

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

  // ── Request access to a specific document ──────────────────────────────────
  const handleRequestAccess = async () => {
    if (!accessDoc) return;
    setAccessSending(true);
    try {
      await api.post(`/documents/${accessDoc._id}/request-access`, {
        message: accessMessage,
        userId: user._id,
      });
      const admins = staff.filter(s => s.role?.name?.toLowerCase() === "admin");
      for (const admin of admins) {
        if (admin.email) {
          await sendEmail({
            to: admin.email,
            subject: `Access Request: ${accessDoc.title}`,
            html: buildEmailHtml({ type: "access_request", toName: admin.name, fromName: user.name, docTitle: accessDoc.title, projectName: accessDoc.project?.name, message: accessMessage || `${user.name} is requesting access to view this document.` }),
          });
        }
      }
      toast({ title: "Access request sent!", status: "success", duration: 3000 });
      setAccessMessage("");
      onAccessClose();
    } catch {
      toast({ title: "Failed to send request", status: "error", duration: 2000 });
    } finally {
      setAccessSending(false);
    }
  };

  // ── Request access to the Documents module (staff with no read permission) ──
  const handleModuleAccessRequest = async () => {
    setModuleAccessSending(true);
    try {
      const admins = staff.filter(s => s.role?.name?.toLowerCase() === "admin");
      for (const admin of admins) {
        if (admin.email) {
          await sendEmail({
            to: admin.email,
            subject: `Documents Access Request from ${user.name}`,
            html: buildEmailHtml({
              type: "access_request",
              toName: admin.name,
              fromName: user.name,
              docTitle: "Documents Module",
              projectName: null,
              message: moduleAccessMessage || `${user.name} is requesting access to the Documents module. Please update their role permissions.`,
            }),
          });
        }
      }
      toast({ title: "Access request sent to admin!", status: "success", duration: 3000 });
      setModuleAccessMessage("");
      onModuleClose();
    } catch {
      toast({ title: "Failed to send request", status: "error", duration: 2000 });
    } finally {
      setModuleAccessSending(false);
    }
  };

  const handleGrantAccess = async (requestId, userId, docId, docTitle, approve) => {
    try {
      await api.put(`/documents/access-requests/${requestId}`, {
        status: approve ? "approved" : "denied",
      });
      const requester = staff.find(s => s._id === userId);
      if (requester?.email) {
        await sendEmail({
          to: requester.email,
          subject: `Access ${approve ? "Granted" : "Denied"}: ${docTitle}`,
          html: buildEmailHtml({
            type: approve ? "access_granted" : "access_denied",
            toName: requester.name,
            fromName: user.name,
            docTitle,
            message: approve
              ? `Your access request for "<strong>${docTitle}</strong>" has been approved.`
              : `Your access request for "<strong>${docTitle}</strong>" has been denied. Please contact your admin.`,
          }),
        });
      }
      setPendingRequests(prev => prev.filter(r => r._id !== requestId));
      toast({ title: approve ? "Access granted & email sent!" : "Request denied", status: approve ? "success" : "info", duration: 2000 });
    } catch {
      toast({ title: "Failed to update request", status: "error", duration: 2000 });
    }
  };

  // ── Staff with NO read permission → show request access screen ─────────────
  if (!canRead && !isAdmin) {
    return (
      <Box>
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" mb={4}>
          <Flex align="center" gap={3}>
            <Box bg={iconBg} p={3} borderRadius="lg">
              <MdDescription size={26} color="#2b6cb0" />
            </Box>
            <Box>
              <Heading size="md" color={textColor}>Documents</Heading>
              <Text fontSize="sm" color={subColor}>You need permission to access this module</Text>
            </Box>
          </Flex>
        </Box>

        <Flex
          direction="column" align="center" justify="center" py={16}
          bg={reqBg} borderRadius="xl"
          border="1px solid" borderColor={reqBdr}
        >
          <MdLock size={52} color="#dd6b20" />
          <Heading size="md" color={textColor} mt={4} mb={2}>Access Required</Heading>
          <Text fontSize="sm" color={subColor} mb={6} textAlign="center" maxW="380px">
            You don't have permission to view documents. Request access from your admin to get started.
          </Text>
          <Button
            colorScheme="orange"
            leftIcon={<MdMail />}
            onClick={onModuleOpen}
          >
            Request Access
          </Button>
        </Flex>

        {/* ── MODAL: Request Module Access ── */}
        <Modal isOpen={isModuleOpen} onClose={onModuleClose} isCentered size="md">
          <ModalOverlay />
          <ModalContent bg={cardBg}>
            <ModalHeader color={textColor}>
              <Flex align="center" gap={2}>
                <MdLock />
                Request Documents Access
              </Flex>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <Box w="100%" p={4} bg={reqBg} borderRadius="lg" border={`1px solid ${reqBdr}`}>
                  <Text fontSize="sm" fontWeight="600" color={textColor} mb={1}>📄 Documents Module</Text>
                  <Text fontSize="xs" color={subColor}>
                    Your request will be sent to the admin via email. They will update your role permissions.
                  </Text>
                </Box>
                <FormControl>
                  <FormLabel fontSize="sm" color={textColor}>
                    Reason for access <Text as="span" color={subColor}>(optional)</Text>
                  </FormLabel>
                  <Textarea
                    placeholder="Explain why you need access to documents..."
                    value={moduleAccessMessage}
                    onChange={e => setModuleAccessMessage(e.target.value)}
                    rows={3}
                  />
                </FormControl>
                <Box w="100%" p={3} bg={projBlueBg} borderRadius="lg" border={`1px solid ${projBlueBdr}`}>
                  <Flex align="center" gap={2}>
                    <MdMail size={14} color="#3b82f6" />
                    <Text fontSize="xs" color={projBlueClr}>
                      An email will be sent to the admin for approval.
                    </Text>
                  </Flex>
                </Box>
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
      </Box>
    );
  }

  if (loading) return <Flex justify="center" py={20}><Spinner size="xl" color="brand.500" /></Flex>;

  return (
    <Box>
      {/* ── HEADER ── */}
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
                  ? `Showing documents for: ${selectedProject.name}`
                  : `Showing all ${filtered.length} documents`}
              </Text>
            </Box>
          </Flex>

          <HStack spacing={2}>
            {isAdmin && pendingCount > 0 && (
              <Button
                leftIcon={<MdLock />}
                colorScheme="orange" size="sm" variant="outline"
                onClick={onRequestsOpen} position="relative"
              >
                Access Requests
                <Badge
                  colorScheme="red" borderRadius="full"
                  position="absolute" top="-8px" right="-8px"
                  fontSize="10px" px={1.5}
                >
                  {pendingCount}
                </Badge>
              </Button>
            )}
            {canCreate && (
              <Button leftIcon={<MdAdd />} colorScheme="brand" size="sm"
                onClick={() => { resetModal(); onOpen(); }}>
                New Document
              </Button>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* ── EMPTY STATE ── */}
      {filtered.length === 0 && (
        <Flex direction="column" align="center" py={20} color={subColor}>
          <MdDescription size={48} />
          <Text fontSize="sm" mt={2}>No documents found</Text>
          {canCreate && (
            <Button mt={4} colorScheme="brand" size="sm" leftIcon={<MdAdd />}
              onClick={() => { resetModal(); onOpen(); }}>
              Create first document
            </Button>
          )}
        </Flex>
      )}

      {/* ── TABLE ── */}
      {filtered.length > 0 && (
        <Box bg={cardBg} borderRadius="xl" boxShadow="md"
          border={`1px solid ${borderColor}`} overflow="hidden">
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}>
                <Tr>
                  {["#", "Title", "Description", "Status", "Assignee", "Project", "Created",
                    ...(canUpdate || canDelete || (!isAdmin && canRead) ? ["Actions"] : [])].map(h => (
                    <Th key={h} color={theadColor} fontSize="xs" py={3}
                      textAlign={h === "Actions" ? "right" : "left"}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {paginated.map((doc, idx) => (
                  <Tr key={doc._id}
                    bg={idx % 2 === 0 ? rowEven : rowOdd}
                    _hover={{ bg: rowHover }}
                    transition="background 0.15s">
                    <Td color={subColor} fontSize="xs">{startIndex + idx + 1}</Td>
                    <Td py={3} maxW="200px">
                      <Flex align="center" gap={2}>
                        <MdDescription size={14} color="#3b82f6" />
                        <Text fontWeight="600" fontSize="sm" color={textColor} noOfLines={1}>
                          {doc.title}
                        </Text>
                      </Flex>
                    </Td>
                    <Td maxW="220px">
                      <Text fontSize="xs" color={subColor} noOfLines={2}>{doc.description}</Text>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={statusColors[doc.status] || "gray"}
                        borderRadius="full" fontSize="xs" px={2} textTransform="capitalize">
                        {doc.status || "draft"}
                      </Badge>
                    </Td>
                    <Td>
                      <Flex align="center" gap={2}>
                        <Avatar name={doc.assignee?.name} size="xs" bg="brand.500" color="white" />
                        <Text fontSize="xs" color={textColor} whiteSpace="nowrap">
                          {doc.assignee?.name || "—"}
                        </Text>
                      </Flex>
                    </Td>
                    <Td>
                      <Text fontSize="xs" color={subColor} noOfLines={1}>
                        {doc.project?.name ? `📁 ${doc.project.name}` : "—"}
                      </Text>
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
                        {canUpdate && (
                          <Tooltip label="Edit">
                            <IconButton icon={<MdEdit />} size="xs" colorScheme="brand" variant="ghost"
                              aria-label="Edit" onClick={() => handleOpen(doc)} />
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip label="Delete">
                            <IconButton icon={<MdDelete />} size="xs" colorScheme="red" variant="ghost"
                              aria-label="Delete"
                              onClick={() => { setDeleteId(doc._id); onDeleteOpen(); }} />
                          </Tooltip>
                        )}
                        {/* Staff with read but no update: request access to specific doc */}
                        {!isAdmin && canRead && !canUpdate && (
                          <Tooltip label="Request Access">
                            <IconButton icon={<MdLock />} size="xs" colorScheme="orange" variant="ghost"
                              aria-label="Request Access"
                              onClick={() => { setAccessDoc(doc); onAccessOpen(); }} />
                          </Tooltip>
                        )}
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          {/* ── PAGINATION ── */}
          <Flex px={4} py={3} justify="space-between" align="center"
            borderTop={`1px solid ${borderColor}`}>
            <Text fontSize="sm" color={subColor}>
              {filtered.length === 0 ? "No results"
                : `${startIndex + 1}–${Math.min(startIndex + pageSize, filtered.length)} of ${filtered.length}`}
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

      {/* ── MODAL: Create / Edit Document ── */}
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
            {selectedProject && (
              <Box mb={4} p={3} bg={projBlueBg} borderRadius="lg" border={`1px solid ${projBlueBdr}`}>
                <Text fontSize="xs" color={projBlueClr} fontWeight="600">
                  📁 Project: {selectedProject.name}
                </Text>
              </Box>
            )}
            <VStack spacing={4}>
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
                <Textarea placeholder="Describe the document..." value={form.description} rows={4}
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
                  <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="review">In Review</option>
                    <option value="archived">Archived</option>
                  </Select>
                </FormControl>
                <FormControl isInvalid={!!errors.assignee}>
                  <FormLabel fontSize="sm" color={textColor}>Assignee *</FormLabel>
                  <Select placeholder="Select assignee" value={form.assignee}
                    onChange={e => {
                      setForm(p => ({ ...p, assignee: e.target.value }));
                      setErrors(p => ({ ...p, assignee: undefined }));
                    }}>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </Select>
                  <FormErrorMessage>{errors.assignee}</FormErrorMessage>
                </FormControl>
              </Grid>

              <Box w="100%" p={3} bg={projBlueBg} borderRadius="lg" border={`1px solid ${projBlueBdr}`}>
                <Flex align="center" gap={2}>
                  <MdMail size={14} color="#3b82f6" />
                  <Text fontSize="xs" color={projBlueClr}>
                    An email notification will be sent to the assignee automatically.
                  </Text>
                </Flex>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onClose(); resetModal(); }}>Cancel</Button>
            <Button colorScheme="brand" isLoading={saving} onClick={handleSave}>
              {editingId ? "Update" : "Create"} Document
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── MODAL: Delete Confirm ── */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered size="sm">
        <ModalOverlay />
        <ModalContent bg={cardBg} borderRadius="xl">
          <ModalHeader fontSize="md" color={textColor}>Delete Document</ModalHeader>
          <ModalBody fontSize="sm" color={subColor}>
            Are you sure you want to delete this document? This action cannot be undone.
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

      {/* ── MODAL: Request Access to specific document ── */}
      <Modal isOpen={isAccessOpen} onClose={onAccessClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}><MdLock />Request Document Access</Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%" p={4} bg={reqBg} borderRadius="lg" border={`1px solid ${reqBdr}`}>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={1}>📄 {accessDoc?.title}</Text>
                <Text fontSize="xs" color={subColor}>{accessDoc?.description}</Text>
              </Box>
              <FormControl>
                <FormLabel fontSize="sm" color={textColor}>
                  Reason for access <Text as="span" color={subColor}>(optional)</Text>
                </FormLabel>
                <Textarea
                  placeholder="Explain why you need access to this document..."
                  value={accessMessage}
                  onChange={e => setAccessMessage(e.target.value)}
                  rows={3}
                />
              </FormControl>
              <Box w="100%" p={3} bg={projBlueBg} borderRadius="lg" border={`1px solid ${projBlueBdr}`}>
                <Flex align="center" gap={2}>
                  <MdMail size={14} color="#3b82f6" />
                  <Text fontSize="xs" color={projBlueClr}>
                    An email will be sent to the admin for approval.
                  </Text>
                </Flex>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAccessClose}>Cancel</Button>
            <Button colorScheme="orange" leftIcon={<MdMail />}
              isLoading={accessSending} onClick={handleRequestAccess}>
              Send Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── MODAL: Pending Access Requests (admin only) ── */}
      <Modal isOpen={isRequestsOpen} onClose={onRequestsClose} isCentered size="xl">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}>
              <MdLockOpen />
              Pending Access Requests
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
                        <Tooltip label="Grant Access + Email">
                          <IconButton icon={<MdCheck />} size="sm" colorScheme="green"
                            aria-label="Approve"
                            onClick={() => handleGrantAccess(req._id, req.user?._id, req.document?._id, req.document?.title, true)} />
                        </Tooltip>
                        <Tooltip label="Deny">
                          <IconButton icon={<MdClose />} size="sm" colorScheme="red" variant="outline"
                            aria-label="Deny"
                            onClick={() => handleGrantAccess(req._id, req.user?._id, req.document?._id, req.document?.title, false)} />
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
    </Box>
  );
}