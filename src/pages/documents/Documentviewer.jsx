/**
 * DocumentViewer.jsx
 * Read-only view of a CKEditor text document.
 *
 * Route: /documents/view/:id
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Flex, Text, Badge, Avatar, Button, Spinner, VStack,
  HStack, Divider, Tooltip, IconButton, useColorModeValue, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, useDisclosure, Textarea, FormControl, FormLabel,
} from "@chakra-ui/react";
import {
  MdArrowBack, MdEdit, MdDescription, MdPerson, MdFolder,
  MdCalendarToday, MdLock, MdMail,
} from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

const statusColors  = { draft:"gray", active:"green", archived:"orange", review:"purple" };
const statusLabels  = { draft:"Draft", active:"Active", archived:"Archived", review:"In Review" };

export default function DocumentViewer() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const toast       = useToast();
  const { user, hasPermission } = useAuth();

  const [doc,            setDoc]            = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [accessMessage,  setAccessMessage]  = useState("");
  const [accessSending,  setAccessSending]  = useState(false);

  const { isOpen: isAccessOpen, onOpen: onAccessOpen, onClose: onAccessClose } = useDisclosure();

  const isAdmin       = user?.role?.name?.toLowerCase() === "admin";
  const canUpdate     = isAdmin || hasPermission("document_update");

  // ── Colors ─────────────────────────────────────────────────────────────────
  const pageBg      = useColorModeValue("#f7fafc",  "gray.900");
  const cardBg      = useColorModeValue("white",    "gray.800");
  const borderClr   = useColorModeValue("#e2e8f0",  "#4a5568");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.500", "gray.400");
  const metaBg      = useColorModeValue("gray.50",  "gray.750");
  const reqBg       = useColorModeValue("orange.50","orange.900");
  const reqBdr      = useColorModeValue("orange.200","orange.600");
  const lockBg      = useColorModeValue("red.50",   "red.900");
  const lockBdr     = useColorModeValue("red.200",  "red.600");

  useEffect(() => {
    api.get(`/documents/${id}`)
      .then(res => setDoc(res.data))
      .catch(() => toast({ title:"Failed to load document", status:"error", duration:3000 }))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  const isCreator    = (d) => d.createdBy?._id === user?._id || d.createdBy === user?._id;
  const isAssigned   = (d) => d.assignee?._id  === user?._id || d.assignee  === user?._id;
  const isAllowed    = (d) => d.allowedUsers?.some(u => (u?._id||u)?.toString() === user?._id?.toString());
  const canReadThis  = (d) => isAdmin || isCreator(d) || isAssigned(d) || isAllowed(d);

  const handleRequestAccess = async () => {
    if (!doc) return;
    setAccessSending(true);
    try {
      await api.post(`/documents/${doc._id}/request-access`, { message: accessMessage });
      toast({ title:"Access request sent!", status:"success", duration:3000 });
      setAccessMessage(""); onAccessClose();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to send";
      if (msg.includes("already")) {
        toast({ title:"You already have a pending request", status:"warning", duration:3000 });
        onAccessClose();
      } else {
        toast({ title:msg, status:"error", duration:3000 });
      }
    } finally {
      setAccessSending(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <Flex justify="center" align="center" h="60vh">
      <VStack spacing={3}>
        <Spinner size="xl" color="brand.500"/>
        <Text color={subColor} fontSize="sm">Loading document…</Text>
      </VStack>
    </Flex>
  );

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!doc) return (
    <Flex justify="center" align="center" h="60vh" direction="column" gap={4}>
      <MdDescription size={48} color="#a0aec0"/>
      <Text color={subColor}>Document not found.</Text>
      <Button size="sm" leftIcon={<MdArrowBack size={14}/>}
        onClick={() => navigate("/admin/documents")}>
        Back to Documents
      </Button>
    </Flex>
  );

  // ── No access ──────────────────────────────────────────────────────────────
  if (!canReadThis(doc)) return (
    <Flex justify="center" align="center" h="60vh">
      <Box maxW="420px" w="100%" p={8} bg={lockBg} borderRadius="2xl"
        border={`1px solid`} borderColor={lockBdr} textAlign="center">
        <MdLock size={48} color="#e53e3e" style={{ margin:"0 auto 16px" }}/>
        <Text fontWeight="700" fontSize="lg" color={textColor} mb={2}>
          Restricted Document
        </Text>
        <Text fontSize="sm" color={subColor} mb={6}>
          You don't have permission to view this document.
          Request access and the admin will be notified.
        </Text>
        <HStack justify="center" spacing={3}>
          <Button size="sm" variant="outline" leftIcon={<MdArrowBack size={13}/>}
            onClick={() => navigate("/admin/documents")}>
            Go Back
          </Button>
          <Button size="sm" colorScheme="orange" leftIcon={<MdMail size={13}/>}
            onClick={onAccessOpen}>
            Request Access
          </Button>
        </HStack>
      </Box>

      {/* Access request modal */}
      <Modal isOpen={isAccessOpen}
        onClose={() => { onAccessClose(); setAccessMessage(""); }}
        isCentered size="md">
        <ModalOverlay/>
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}><MdLock size={16}/> Request Access</Flex>
          </ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%" p={4} bg={reqBg} borderRadius="lg"
                border="1px solid" borderColor={reqBdr}>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={1}>
                  {doc.title}
                </Text>
                <Text fontSize="xs" color={subColor}>
                  The admin will be notified via email.
                </Text>
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
            <Button variant="ghost"
              onClick={() => { onAccessClose(); setAccessMessage(""); }}>Cancel</Button>
            <Button colorScheme="orange" leftIcon={<MdMail size={13}/>}
              isLoading={accessSending} onClick={handleRequestAccess}>
              Send Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );

  // ── Full viewer ────────────────────────────────────────────────────────────
  return (
    <Box bg={pageBg} minH="100vh" py={6} px={{ base:4, md:6 }}>
      <Box maxW="860px" mx="auto">

        {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
        <Flex justify="space-between" align="center" mb={5} wrap="wrap" gap={3}>
          <Button size="sm" variant="ghost" leftIcon={<MdArrowBack size={15}/>}
            color={subColor} onClick={() => navigate("/admin/documents")}>
            Back to Documents
          </Button>
          {(canUpdate || isCreator(doc)) && (
            <Button size="sm" colorScheme="brand" leftIcon={<MdEdit size={14}/>}
              onClick={() => navigate(`/admin/documents/editor/${doc._id}`)}>
              Edit Document
            </Button>
          )}
        </Flex>

        {/* ── DOCUMENT HEADER CARD ────────────────────────────────────────── */}
        <Box bg={cardBg} borderRadius="2xl" boxShadow="lg"
          border={`1px solid ${borderClr}`} overflow="hidden" mb={4}>

          {/* Colour accent bar based on status */}
          <Box h="4px" bg={
            doc.status === "active"   ? "green.400"  :
            doc.status === "review"   ? "purple.400" :
            doc.status === "archived" ? "orange.400" : "gray.300"
          }/>

          <Box px={8} pt={6} pb={5}>
            <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4}>
              <Box flex={1}>
                <Flex align="center" gap={2} mb={2}>
                  <MdDescription size={18} color="#3182ce"/>
                  <Badge colorScheme={statusColors[doc.status]||"gray"}
                    borderRadius="full" fontSize="xs" px={2} textTransform="capitalize">
                    {statusLabels[doc.status]||doc.status}
                  </Badge>
                </Flex>
                <Text fontWeight="800" fontSize="2xl" color={textColor} lineHeight="1.3" mb={2}>
                  {doc.title}
                </Text>
                {doc.description && (
                  <Text fontSize="sm" color={subColor} lineHeight="1.7">
                    {doc.description}
                  </Text>
                )}
              </Box>
            </Flex>

            {/* Meta row */}
            <Divider my={4} borderColor={borderClr}/>
            <Flex gap={6} wrap="wrap">
              {doc.createdBy?.name && (
                <Flex align="center" gap={2}>
                  <Avatar name={doc.createdBy.name} size="xs" bg="purple.400" color="white"/>
                  <Box>
                    <Text fontSize="10px" color={subColor} textTransform="uppercase"
                      letterSpacing="wide" fontWeight="600">Author</Text>
                    <Text fontSize="xs" color={textColor} fontWeight="600">{doc.createdBy.name}</Text>
                  </Box>
                </Flex>
              )}
              {doc.assignee?.name && (
                <Flex align="center" gap={2}>
                  <Avatar name={doc.assignee.name} size="xs" bg="brand.500" color="white"/>
                  <Box>
                    <Text fontSize="10px" color={subColor} textTransform="uppercase"
                      letterSpacing="wide" fontWeight="600">Assignee</Text>
                    <Text fontSize="xs" color={textColor} fontWeight="600">{doc.assignee.name}</Text>
                  </Box>
                </Flex>
              )}
              {doc.project?.name && (
                <Flex align="center" gap={2}>
                  <Box p={1} bg="blue.100" borderRadius="md" _dark={{ bg:"blue.900" }}>
                    <MdFolder size={13} color="#2b6cb0"/>
                  </Box>
                  <Box>
                    <Text fontSize="10px" color={subColor} textTransform="uppercase"
                      letterSpacing="wide" fontWeight="600">Project</Text>
                    <Text fontSize="xs" color={textColor} fontWeight="600">{doc.project.name}</Text>
                  </Box>
                </Flex>
              )}
              <Flex align="center" gap={2}>
                <Box p={1} bg="gray.100" borderRadius="md" _dark={{ bg:"gray.700" }}>
                  <MdCalendarToday size={13} color="#718096"/>
                </Box>
                <Box>
                  <Text fontSize="10px" color={subColor} textTransform="uppercase"
                    letterSpacing="wide" fontWeight="600">Created</Text>
                  <Text fontSize="xs" color={textColor} fontWeight="600">
                    {new Date(doc.createdAt).toLocaleDateString("en-IN",
                      { day:"numeric", month:"long", year:"numeric" })}
                  </Text>
                </Box>
              </Flex>
            </Flex>
          </Box>
        </Box>

        {/* ── DOCUMENT CONTENT ────────────────────────────────────────────── */}
        <Box bg={cardBg} borderRadius="2xl" boxShadow="sm"
          border={`1px solid ${borderClr}`} overflow="hidden">
          {doc.content ? (
            <Box
              px={{ base:6, md:10 }} py={8}
              className="document-content"
              color={textColor}
              sx={{
                fontSize:   "15px",
                lineHeight: "1.85",
                // Headings
                "h1,h2,h3,h4": { color: textColor, fontWeight:"700", marginBottom:"0.5em", marginTop:"1.2em", lineHeight:"1.3" },
                "h1": { fontSize:"1.8em" },
                "h2": { fontSize:"1.45em", borderBottom:`1px solid ${borderClr}`, paddingBottom:"0.3em" },
                "h3": { fontSize:"1.2em" },
                "h4": { fontSize:"1.05em" },
                // Paragraphs
                "p":  { marginBottom:"1em" },
                // Lists
                "ul, ol": { paddingLeft:"1.8em", marginBottom:"1em" },
                "li":     { marginBottom:"0.3em" },
                // Blockquote
                "blockquote": {
                  borderLeft: "4px solid #3182ce",
                  paddingLeft: "1em",
                  color: subColor,
                  fontStyle: "italic",
                  margin: "1.2em 0",
                  background: metaBg,
                  borderRadius: "0 8px 8px 0",
                  padding: "12px 16px",
                },
                // Code
                "pre": {
                  background: metaBg,
                  border: `1px solid ${borderClr}`,
                  borderRadius: "8px",
                  padding: "16px",
                  overflowX: "auto",
                  fontSize: "13px",
                  marginBottom: "1em",
                },
                "code": {
                  background: metaBg,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                },
                // Tables
                "table": {
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: "1em",
                  fontSize: "14px",
                },
                "th": {
                  background: metaBg,
                  padding: "10px 14px",
                  border: `1px solid ${borderClr}`,
                  fontWeight: "600",
                  textAlign: "left",
                },
                "td": {
                  padding: "9px 14px",
                  border: `1px solid ${borderClr}`,
                },
                "tr:nth-of-type(even) td": { background: metaBg },
                // Links
                "a": { color:"#3182ce", textDecoration:"underline" },
                "hr": { borderColor: borderClr, margin:"1.5em 0" },
                // Strong / Em
                "strong": { fontWeight:"700" },
                "em":     { fontStyle:"italic" },
              }}
              dangerouslySetInnerHTML={{ __html: doc.content }}
            />
          ) : (
            <Flex direction="column" align="center" py={16} color={subColor}>
              <MdDescription size={40}/>
              <Text fontSize="sm" mt={2}>This document has no content yet.</Text>
              {(canUpdate || isCreator(doc)) && (
                <Button mt={4} size="sm" colorScheme="brand" leftIcon={<MdEdit size={13}/>}
                  onClick={() => navigate(`/admin/documents/editor/${doc._id}`)}>
                  Add Content
                </Button>
              )}
            </Flex>
          )}
        </Box>

        {/* ── BOTTOM NAV ──────────────────────────────────────────────────── */}
        <Flex justify="space-between" align="center" mt={5} wrap="wrap" gap={3}>
          <Button size="sm" variant="ghost" leftIcon={<MdArrowBack size={14}/>}
            color={subColor} onClick={() => navigate("/admin/documents")}>
            Back to Documents
          </Button>
          {(canUpdate || isCreator(doc)) && (
            <Button size="sm" colorScheme="brand" leftIcon={<MdEdit size={14}/>}
              onClick={() => navigate(`/admin/documents/editor/${doc._id}`)}>
              Edit Document
            </Button>
          )}
        </Flex>

      </Box>
    </Box>
  );
}