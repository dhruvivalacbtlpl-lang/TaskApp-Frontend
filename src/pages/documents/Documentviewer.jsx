/**
 * DocumentViewer.jsx
 * Read-only view of a document — loads ALL pages from DocumentPage collection.
 * Also shows legacy single-content docs.
 *
 * Route: /admin/documents/view/:id
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Flex, Text, Badge, Avatar, Button, Spinner, VStack,
  HStack, Divider, useColorModeValue, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, useDisclosure, Textarea, FormControl, FormLabel,
} from "@chakra-ui/react";
import {
  MdArrowBack, MdEdit, MdDescription, MdFolder,
  MdCalendarToday, MdLock, MdMail, MdPrint,
} from "react-icons/md";
import api        from "../../api";
import { useAuth } from "../../context/AuthContext";

const statusColors = { draft:"gray", active:"green", archived:"orange", review:"purple" };
const statusLabels = { draft:"Draft", active:"Active", archived:"Archived", review:"In Review" };

const BRAND = "#1a56db";

export default function DocumentViewer() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();
  const { user, hasPermission } = useAuth();

  const [doc,           setDoc]           = useState(null);
  const [pages,         setPages]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [accessMessage, setAccessMessage] = useState("");
  const [accessSending, setAccessSending] = useState(false);

  const { isOpen: isAccessOpen, onOpen: onAccessOpen, onClose: onAccessClose } = useDisclosure();

  const isAdmin    = user?.role?.name?.toLowerCase() === "admin";
  const canUpdate  = isAdmin || hasPermission("document_update");

  // ── Colors ─────────────────────────────────────────────────────────────────
  const pageBg    = useColorModeValue("#f0f2f5",   "gray.900");
  const cardBg    = useColorModeValue("white",     "gray.800");
  const sheetBg   = useColorModeValue("#ffffff",   "#1f2937");
  const borderClr = useColorModeValue("#e2e8f0",   "#4a5568");
  const textColor = useColorModeValue("gray.800",  "white");
  const subColor  = useColorModeValue("gray.500",  "gray.400");
  const metaBg    = useColorModeValue("gray.50",   "gray.750");
  const reqBg     = useColorModeValue("orange.50", "orange.900");
  const reqBdr    = useColorModeValue("orange.200","orange.600");
  const lockBg    = useColorModeValue("red.50",    "red.900");
  const lockBdr   = useColorModeValue("red.200",   "red.600");
  const hdrColor  = useColorModeValue("#555555",   "#9ca3af");
  const canvasBg  = useColorModeValue("#d0d0d0",   "#111827");

  // ── Load doc + pages ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [docRes, pagesRes] = await Promise.all([
          api.get(`/documents/${id}`),
          api.get(`/document-pages?documentId=${id}`),
        ]);
        setDoc(docRes.data);
        setPages(pagesRes.data || []);
      } catch {
        toast({ title: "Failed to load document", status: "error", duration: 3000 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]); // eslint-disable-line

  const isCreator   = (d) => d.createdBy?._id === user?._id || d.createdBy === user?._id;
  const isAssigned  = (d) => d.assignee?._id  === user?._id || d.assignee  === user?._id;
  const isAllowed   = (d) => d.allowedUsers?.some(u => (u?._id||u)?.toString() === user?._id?.toString());
  const canReadThis = (d) => isAdmin || isCreator(d) || isAssigned(d) || isAllowed(d);

  // ── Access request ──────────────────────────────────────────────────────────
  const handleRequestAccess = async () => {
    if (!doc) return;
    setAccessSending(true);
    try {
      await api.post(`/documents/${doc._id}/request-access`, { message: accessMessage });
      toast({ title: "Access request sent!", status: "success", duration: 3000 });
      setAccessMessage(""); onAccessClose();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to send";
      if (msg.includes("already")) {
        toast({ title: "You already have a pending request", status: "warning", duration: 3000 });
        onAccessClose();
      } else {
        toast({ title: msg, status: "error", duration: 3000 });
      }
    } finally {
      setAccessSending(false);
    }
  };

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const hasPages = pages.length > 0;

    const pageHTML = hasPages
      ? pages.map(p => `
          <div class="page">
            ${p.headerText ? `<div class="hdr">${p.headerText}</div>` : ""}
            <div class="body">${p.pageContent || ""}</div>
            ${p.footerText ? `<div class="ftr">${p.footerText}</div>` : ""}
          </div>
          <div class="pb"></div>
        `).join("")
      : `<div class="page"><div class="body">${doc.content || ""}</div></div>`;

    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>${doc.title || "Document"}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Georgia, serif; font-size: 12pt; color: #111; }
        .page {
          width: 794px; min-height: 1123px;
          padding: 72px 96px;
          display: flex; flex-direction: column;
        }
        .hdr {
          font-size: 9pt; color: #555;
          border-bottom: 1px solid #ddd;
          padding-bottom: 6px; margin-bottom: 20px;
          text-align: center;
        }
        .ftr {
          font-size: 9pt; color: #555;
          border-top: 1px solid #ddd;
          padding-top: 6px; margin-top: auto;
          text-align: center;
        }
        .body { flex: 1; }
        .pb { page-break-after: always; }
        h1 { font-size: 22pt; color: #1040b0; border-bottom: 2px solid #e8f0fd; padding-bottom: 6px; margin: 16px 0 8px; }
        h2 { font-size: 17pt; color: #1a56db; margin: 14px 0 6px; }
        h3 { font-size: 13pt; font-weight: 600; margin: 12px 0 4px; }
        p  { margin-bottom: 8px; }
        ul, ol { padding-left: 28px; margin-bottom: 8px; }
        blockquote { border-left: 4px solid #1a56db; padding: 8px 16px; color: #555; font-style: italic; background: #e8f0fd; border-radius: 0 4px 4px 0; margin: 12px 0; }
        pre  { background: #1e293b; color: #e2e8f0; padding: 12px 16px; border-radius: 6px; font-size: 10pt; font-family: 'Courier New', monospace; margin: 12px 0; }
        code { background: #f1f5f9; color: #0f172a; padding: 1px 5px; border-radius: 3px; font-size: 10pt; font-family: 'Courier New', monospace; }
        table { border-collapse: collapse; width: 100%; font-size: 11pt; }
        td, th { border: 1px solid #ccc; padding: 7px 12px; vertical-align: top; }
        th { background: #e8f0fd; font-weight: 700; color: #1040b0; }
        a { color: #1a56db; text-decoration: underline; }
        hr { border: none; border-top: 2px solid #e8f0fd; margin: 16px 0; }
        img { max-width: 100%; border-radius: 4px; }
      </style>
      </head><body>${pageHTML}</body></html>
    `);
    win.document.close();
    win.print();
  };

  // ── Shared content styles ───────────────────────────────────────────────────
  const contentSx = {
    fontSize: "15px",
    lineHeight: "1.85",
    color: textColor,
    "h1,h2,h3,h4": { color: textColor, fontWeight: "700", marginBottom: "0.5em", marginTop: "1.2em", lineHeight: "1.3" },
    "h1": { fontSize: "1.8em", borderBottom: `2px solid #e8f0fd`, paddingBottom: "0.3em" },
    "h2": { fontSize: "1.45em", borderBottom: `1px solid ${borderClr}`, paddingBottom: "0.3em" },
    "h3": { fontSize: "1.2em" },
    "h4": { fontSize: "1.05em" },
    "p":  { marginBottom: "1em" },
    "ul, ol": { paddingLeft: "1.8em", marginBottom: "1em" },
    "li": { marginBottom: "0.3em" },
    "blockquote": {
      borderLeft: `4px solid ${BRAND}`, paddingLeft: "1em",
      color: subColor, fontStyle: "italic", margin: "1.2em 0",
      background: metaBg, borderRadius: "0 8px 8px 0", padding: "12px 16px",
    },
    "pre": {
      background: "#1e293b", color: "#e2e8f0",
      border: `1px solid ${borderClr}`, borderRadius: "8px",
      padding: "16px", overflowX: "auto", fontSize: "13px", marginBottom: "1em",
      fontFamily: "'Fira Code','Consolas',monospace",
    },
    "code": {
      background: metaBg, padding: "2px 6px",
      borderRadius: "4px", fontSize: "13px", fontFamily: "monospace",
    },
    "table": { width: "100%", borderCollapse: "collapse", marginBottom: "1em", fontSize: "14px" },
    "th": { background: metaBg, padding: "10px 14px", border: `1px solid ${borderClr}`, fontWeight: "600", textAlign: "left" },
    "td": { padding: "9px 14px", border: `1px solid ${borderClr}` },
    "tr:nth-of-type(even) td": { background: metaBg },
    "a":      { color: BRAND, textDecoration: "underline" },
    "hr":     { borderColor: borderClr, margin: "1.5em 0" },
    "strong": { fontWeight: "700" },
    "em":     { fontStyle: "italic" },
    "img":    { maxWidth: "100%", borderRadius: "4px" },
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <Flex justify="center" align="center" h="60vh">
      <VStack spacing={3}>
        <Spinner size="xl" color="brand.500"/>
        <Text color={subColor} fontSize="sm">Loading document…</Text>
      </VStack>
    </Flex>
  );

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

  // ── No access ───────────────────────────────────────────────────────────────
  if (!canReadThis(doc)) return (
    <Flex justify="center" align="center" h="60vh">
      <Box maxW="420px" w="100%" p={8} bg={lockBg} borderRadius="2xl"
        border="1px solid" borderColor={lockBdr} textAlign="center">
        <MdLock size={48} color="#e53e3e" style={{ margin: "0 auto 16px" }}/>
        <Text fontWeight="700" fontSize="lg" color={textColor} mb={2}>Restricted Document</Text>
        <Text fontSize="sm" color={subColor} mb={6}>
          You don't have permission to view this document.
        </Text>
        <HStack justify="center" spacing={3}>
          <Button size="sm" variant="outline" leftIcon={<MdArrowBack size={13}/>}
            onClick={() => navigate("/admin/documents")}>Go Back</Button>
          <Button size="sm" colorScheme="orange" leftIcon={<MdMail size={13}/>}
            onClick={onAccessOpen}>Request Access</Button>
        </HStack>
      </Box>

      <Modal isOpen={isAccessOpen}
        onClose={() => { onAccessClose(); setAccessMessage(""); }} isCentered size="md">
        <ModalOverlay/>
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>
            <Flex align="center" gap={2}><MdLock size={16}/> Request Access</Flex>
          </ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%" p={4} bg={reqBg} borderRadius="lg" border="1px solid" borderColor={reqBdr}>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={1}>{doc.title}</Text>
                <Text fontSize="xs" color={subColor}>The admin will be notified via email.</Text>
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
            <Button variant="ghost" onClick={() => { onAccessClose(); setAccessMessage(""); }}>Cancel</Button>
            <Button colorScheme="orange" leftIcon={<MdMail size={13}/>}
              isLoading={accessSending} onClick={handleRequestAccess}>
              Send Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );

  // ── Determine what to show ───────────────────────────────────────────────────
  const hasPages   = pages.length > 0;
  const isDocx     = doc.documentType === "docx" || doc.documentType === "txt";
  const showEditor = isDocx || (!doc.file?.url); // any editor-type doc

  // ── Full viewer ─────────────────────────────────────────────────────────────
  return (
    <Box bg={pageBg} minH="100vh" py={6} px={{ base: 4, md: 6 }}>
      <Box maxW="900px" mx="auto">

        {/* ── TOOLBAR ──────────────────────────────────────────────────────── */}
        <Flex justify="space-between" align="center" mb={5} wrap="wrap" gap={3}>
          <Button size="sm" variant="ghost" leftIcon={<MdArrowBack size={15}/>}
            color={subColor} onClick={() => navigate("/admin/documents")}>
            Back to Documents
          </Button>

          <HStack spacing={2}>
            {/* ✅ Generate PDF button */}
            {showEditor && (
              <Button size="sm" variant="outline" colorScheme="red"
                leftIcon={<MdPrint size={14}/>} onClick={handlePrint}>
                Generate PDF
              </Button>
            )}

            {/* Edit button */}
            {(canUpdate || isCreator(doc)) && (
              <Button size="sm" colorScheme="blue"
                leftIcon={<MdEdit size={14}/>}
                onClick={() => navigate(`/admin/documents/editor/${doc._id}`)}>
                Edit Document
              </Button>
            )}
          </HStack>
        </Flex>

        {/* ── DOCUMENT HEADER CARD ─────────────────────────────────────────── */}
        <Box bg={cardBg} borderRadius="2xl" boxShadow="lg"
          border={`1px solid ${borderClr}`} overflow="hidden" mb={6}>
          <Box h="4px" bg={
            doc.status === "active"   ? "green.400"  :
            doc.status === "review"   ? "purple.400" :
            doc.status === "archived" ? "orange.400" : "gray.300"
          }/>
          <Box px={8} pt={6} pb={5}>
            <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4}>
              <Box flex={1}>
                <Flex align="center" gap={2} mb={2}>
                  <MdDescription size={18} color={BRAND}/>
                  <Badge colorScheme={statusColors[doc.status] || "gray"}
                    borderRadius="full" fontSize="xs" px={2} textTransform="capitalize">
                    {statusLabels[doc.status] || doc.status}
                  </Badge>
                  {doc.documentType && (
                    <Badge colorScheme={doc.documentType === "docx" ? "blue" : "gray"}
                      borderRadius="full" fontSize="xs" px={2}>
                      .{doc.documentType}
                    </Badge>
                  )}
                  {hasPages && (
                    <Badge colorScheme="purple" borderRadius="full" fontSize="xs" px={2}>
                      {pages.length} page{pages.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </Flex>
                <Text fontWeight="800" fontSize="2xl" color={textColor} lineHeight="1.3" mb={2}>
                  {doc.title}
                </Text>
                {doc.description && (
                  <Text fontSize="sm" color={subColor} lineHeight="1.7">{doc.description}</Text>
                )}
              </Box>
            </Flex>

            <Divider my={4} borderColor={borderClr}/>
            <Flex gap={6} wrap="wrap">
              {doc.createdBy?.name && (
                <Flex align="center" gap={2}>
                  <Avatar name={doc.createdBy.name} size="xs" bg="purple.400" color="white"/>
                  <Box>
                    <Text fontSize="10px" color={subColor} textTransform="uppercase" letterSpacing="wide" fontWeight="600">Author</Text>
                    <Text fontSize="xs" color={textColor} fontWeight="600">{doc.createdBy.name}</Text>
                  </Box>
                </Flex>
              )}
              {doc.assignee?.name && (
                <Flex align="center" gap={2}>
                  <Avatar name={doc.assignee.name} size="xs" bg="brand.500" color="white"/>
                  <Box>
                    <Text fontSize="10px" color={subColor} textTransform="uppercase" letterSpacing="wide" fontWeight="600">Assignee</Text>
                    <Text fontSize="xs" color={textColor} fontWeight="600">{doc.assignee.name}</Text>
                  </Box>
                </Flex>
              )}
              {doc.project?.name && (
                <Flex align="center" gap={2}>
                  <Box p={1} bg="blue.100" borderRadius="md" _dark={{ bg: "blue.900" }}>
                    <MdFolder size={13} color="#2b6cb0"/>
                  </Box>
                  <Box>
                    <Text fontSize="10px" color={subColor} textTransform="uppercase" letterSpacing="wide" fontWeight="600">Project</Text>
                    <Text fontSize="xs" color={textColor} fontWeight="600">{doc.project.name}</Text>
                  </Box>
                </Flex>
              )}
              <Flex align="center" gap={2}>
                <Box p={1} bg="gray.100" borderRadius="md" _dark={{ bg: "gray.700" }}>
                  <MdCalendarToday size={13} color="#718096"/>
                </Box>
                <Box>
                  <Text fontSize="10px" color={subColor} textTransform="uppercase" letterSpacing="wide" fontWeight="600">Created</Text>
                  <Text fontSize="xs" color={textColor} fontWeight="600">
                    {new Date(doc.createdAt).toLocaleDateString("en-IN",
                      { day: "numeric", month: "long", year: "numeric" })}
                  </Text>
                </Box>
              </Flex>
            </Flex>
          </Box>
        </Box>

        {/* ── PAGES — rendered as stacked A4 sheets ────────────────────────── */}
        {hasPages ? (
          <Box bg={canvasBg} borderRadius="xl" p={6}>
            <VStack spacing={6} align="center">
              {pages.map((page, idx) => (
                <Box key={page._id || idx}
                  w="794px" minH="1123px" bg={sheetBg}
                  boxShadow="0 2px 8px rgba(0,0,0,0.18), 0 8px 32px rgba(0,0,0,0.14)"
                  display="flex" flexDirection="column" position="relative"
                  sx={{
                    "&::before": {
                      content: '""', display: "block", height: "3px",
                      background: `linear-gradient(90deg,${BRAND} 0%,#60a5fa 60%,#93c5fd 100%)`,
                    },
                  }}
                >
                  {/* Page number chip */}
                  <Box position="absolute" top="12px" right="16px"
                    bg="#e8f0fd" borderRadius="full" px={2} py="1px"
                    fontSize="9px" fontWeight="700" color={BRAND}>
                    Page {page.pageNumber}
                  </Box>

                  {/* Header */}
                  {page.headerText && (
                    <Box px="72px" pt="22px" pb="8px"
                      borderBottom={`1px solid ${borderClr}`}>
                      <Text fontSize="9pt" color={hdrColor} textAlign="center"
                        fontStyle="italic">{page.headerText}</Text>
                    </Box>
                  )}

                  {/* Content */}
                  <Box flex="1" px="72px" py="24px">
                    {page.pageContent ? (
                      doc.documentType === "txt" ? (
                        /* Plain text */
                        <Text
                          whiteSpace="pre-wrap"
                          fontFamily="'Courier New',Courier,monospace"
                          fontSize="12pt" lineHeight="1.85" color={textColor}>
                          {page.pageContent}
                        </Text>
                      ) : (
                        /* Rich HTML from CKEditor */
                        <Box sx={contentSx}
                          dangerouslySetInnerHTML={{ __html: page.pageContent }}/>
                      )
                    ) : (
                      <Flex align="center" justify="center" h="200px" color={subColor}>
                        <Text fontSize="sm" fontStyle="italic">Empty page</Text>
                      </Flex>
                    )}
                  </Box>

                  {/* Footer */}
                  {page.footerText && (
                    <Box px="72px" pb="22px" pt="8px"
                      borderTop={`1px solid ${borderClr}`}>
                      <Text fontSize="9pt" color={hdrColor} textAlign="center"
                        fontStyle="italic">{page.footerText}</Text>
                    </Box>
                  )}
                </Box>
              ))}
            </VStack>
          </Box>

        ) : doc.content ? (
          /* ── Legacy single-content doc ─────────────────────────────────── */
          <Box bg={cardBg} borderRadius="2xl" boxShadow="sm"
            border={`1px solid ${borderClr}`} overflow="hidden">
            <Box px={{ base: 6, md: 10 }} py={8} sx={contentSx}
              dangerouslySetInnerHTML={{ __html: doc.content }}/>
          </Box>

        ) : (
          /* ── No content at all ─────────────────────────────────────────── */
          <Box bg={cardBg} borderRadius="2xl" boxShadow="sm"
            border={`1px solid ${borderClr}`} overflow="hidden">
            <Flex direction="column" align="center" py={16} color={subColor}>
              <MdDescription size={40}/>
              <Text fontSize="sm" mt={2}>This document has no content yet.</Text>
              {(canUpdate || isCreator(doc)) && (
                <Button mt={4} size="sm" colorScheme="blue" leftIcon={<MdEdit size={13}/>}
                  onClick={() => navigate(`/admin/documents/editor/${doc._id}`)}>
                  Open Editor
                </Button>
              )}
            </Flex>
          </Box>
        )}

        {/* ── BOTTOM NAV ───────────────────────────────────────────────────── */}
        <Flex justify="space-between" align="center" mt={6} wrap="wrap" gap={3}>
          <Button size="sm" variant="ghost" leftIcon={<MdArrowBack size={14}/>}
            color={subColor} onClick={() => navigate("/admin/documents")}>
            Back to Documents
          </Button>
          <HStack spacing={2}>
            {showEditor && (
              <Button size="sm" variant="outline" colorScheme="red"
                leftIcon={<MdPrint size={14}/>} onClick={handlePrint}>
                Generate PDF
              </Button>
            )}
            {(canUpdate || isCreator(doc)) && (
              <Button size="sm" colorScheme="blue" leftIcon={<MdEdit size={14}/>}
                onClick={() => navigate(`/admin/documents/editor/${doc._id}`)}>
                Edit Document
              </Button>
            )}
          </HStack>
        </Flex>

      </Box>
    </Box>
  );
}