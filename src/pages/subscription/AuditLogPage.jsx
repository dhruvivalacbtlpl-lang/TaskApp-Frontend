import { useEffect, useState, useCallback } from "react";
import {
  Box, Flex, Heading, Text, Badge, HStack, VStack,
  Select, Input, InputGroup, InputLeftElement, Spinner,
  Center, useColorModeValue, Avatar, Table, Thead, Tbody,
  Tr, Th, Td, TableContainer, IconButton, Button, Icon,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import {
  MdSearch, MdRefresh, MdCheckBox, MdBugReport, MdPeople,
  MdFolder, MdDescription, MdCreditCard, MdVpnKey, MdSecurity,
  MdLock, MdLabel, MdGroup, MdLogin, MdLogout,
} from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

// Normalize IP for display
const formatIP = (ip) => {
  if (!ip) return "—";
  if (ip === "::1") return "127.0.0.1 (localhost)";
  if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
  return ip;
};

const ACTION_COLORS = {
  CREATE:   "green",
  UPDATE:   "blue",
  DELETE:   "red",
  LOGIN:    "teal",
  LOGOUT:   "gray",
  ASSIGN:   "purple",
  PURCHASE: "orange",
  EXPIRE:   "red",
  BULK:     "cyan",
};

const MODULE_ICON_MAP = {
  Task:         { icon: MdCheckBox,   color: "green.500"  },
  Issue:        { icon: MdBugReport,  color: "orange.500" },
  Staff:        { icon: MdPeople,     color: "blue.500"   },
  Project:      { icon: MdFolder,     color: "yellow.600" },
  Document:     { icon: MdDescription,color: "purple.500" },
  Subscription: { icon: MdCreditCard, color: "teal.500"   },
  Role:         { icon: MdVpnKey,     color: "pink.500"   },
  Permission:   { icon: MdSecurity,   color: "red.500"    },
  Auth:         { icon: MdLock,       color: "gray.600"   },
  TaskStatus:   { icon: MdLabel,      color: "cyan.500"   },
  Team:         { icon: MdGroup,      color: "indigo.500" },
};

// Helper component for module icon
const ModuleIcon = ({ module, size = 4 }) => {
  const config = MODULE_ICON_MAP[module] || { icon: MdDescription, color: "gray.400" };
  return <Icon as={config.icon} boxSize={size} color={config.color} />;
};

const MODULES = ["Task","Issue","Staff","Project","Document","Subscription","Role","Permission","Auth","TaskStatus","Team"];
const ACTIONS = ["CREATE","UPDATE","DELETE","LOGIN","LOGOUT","ASSIGN","PURCHASE","EXPIRE","BULK"];

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export default function AuditLogPage() {
  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [module,     setModule]     = useState("");
  const [action,     setAction]     = useState("");

  const { isSuperAdmin, companies, selectedCompany } = useAuth();

  const cardBg    = useColorModeValue("white",    "gray.800");
  const border    = useColorModeValue("gray.100", "gray.700");
  const theadBg   = useColorModeValue("#bee3f8",  "#2a4365");
  const theadClr  = useColorModeValue("gray.700", "white");
  const rowHover  = useColorModeValue("#ebf8ff",  "#2d3748");
  const borderClr = useColorModeValue("#e5e7eb",  "#4a5568");
  const textColor = useColorModeValue("gray.800", "white");
  const subColor  = useColorModeValue("gray.500", "gray.400");
  const inputBg   = useColorModeValue("white",    "gray.700");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (module) params.set("module", module);
      if (action) params.set("action", action);
      if (isSuperAdmin && selectedCompany?._id) params.set("companyId", selectedCompany._id);

      const r = await api.get(`/audit?${params.toString()}`);
      setLogs(r.data.logs || []);
      setTotal(r.data.total || 0);
      setTotalPages(r.data.totalPages || 1);
    } catch (err) {
      console.error("Audit log fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [page, module, action, isSuperAdmin, selectedCompany]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [module, action, selectedCompany]);

  // Client-side search filter
  const filtered = logs.filter(log =>
    !search ||
    log.description?.toLowerCase().includes(search.toLowerCase()) ||
    log.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    log.metadata?.entityName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box bg={useColorModeValue("gray.50","gray.900")} minH="100vh" p={{ base: 4, md: 6 }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Box>
          <Heading size="lg" fontWeight="900">Audit Logs</Heading>
          <Text fontSize="sm" color={subColor}>
            {total} records · auto-deleted after 30 days
          </Text>
        </Box>
        <IconButton icon={<MdRefresh />} variant="ghost" aria-label="Refresh"
          onClick={load} isLoading={loading} borderRadius="lg" />
      </Flex>

      {/* Filters */}
      <Flex gap={3} mb={5} wrap="wrap">
        <InputGroup maxW="250px">
          <InputLeftElement><MdSearch color="gray" /></InputLeftElement>
          <Input placeholder="Search logs…" value={search}
            onChange={e => setSearch(e.target.value)}
            bg={inputBg} borderRadius="lg" />
        </InputGroup>

        <Select placeholder="All Modules" value={module}
          onChange={e => setModule(e.target.value)} maxW="160px" borderRadius="lg">
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>

        <Select placeholder="All Actions" value={action}
          onChange={e => setAction(e.target.value)} maxW="150px" borderRadius="lg">
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
      </Flex>

      {/* Table */}
      <Box bg={cardBg} borderRadius="2xl" border="1px solid" borderColor={border} overflow="hidden">
        {loading ? (
          <Center py={16}><Spinner size="lg" color="blue.500" /></Center>
        ) : filtered.length === 0 ? (
          <Center py={16}>
            <VStack>
              <Text fontSize="lg" color={subColor}>No logs found</Text>
              <Text fontSize="sm" color={subColor}>Try adjusting your filters</Text>
            </VStack>
          </Center>
        ) : (
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}>
                <Tr>
                  {["Time", "User", "Action", "Module", "IP"].map(h => (
                    <Th key={h} color={theadClr} py={3}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((log, i) => (
                  <Tr key={log._id || i}
                    onMouseEnter={e => e.currentTarget.style.background = rowHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Td py={3} color={subColor} fontSize="xs" whiteSpace="nowrap">
                      {fmt(log.createdAt)}
                    </Td>
                    <Td py={3}>
                      <HStack spacing={2}>
                        <Avatar size="xs" name={log.user?.name} bg="purple.400" />
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="600" color={textColor}>{log.user?.name || "—"}</Text>
                          <Text fontSize="10px" color={subColor}>{log.user?.role}</Text>
                        </VStack>
                      </HStack>
                    </Td>
                    <Td py={3}>
                      <Badge
                        colorScheme={ACTION_COLORS[log.action] || "gray"}
                        borderRadius="full" px={2} fontSize="xs"
                      >
                        {log.action}
                      </Badge>
                    </Td>
                    <Td py={3}>
                      <HStack spacing={2}>
                        <ModuleIcon module={log.module} />
                        <Text fontSize="sm">{log.module}</Text>
                      </HStack>
                    </Td>

                    <Td py={3}>
                      <Text fontSize="xs" color={subColor} fontFamily="mono">
                        {formatIP(log.ip)}
                      </Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Flex mt={4} justify="space-between" align="center">
          <Text fontSize="sm" color={textColor}>
            Page {page} of {totalPages} · {total} total
          </Text>
          <HStack>
            <IconButton size="sm" icon={<ChevronLeftIcon />} isDisabled={page === 1}
              onClick={() => setPage(p => p - 1)} aria-label="Prev" borderRadius="lg" />
            <IconButton size="sm" icon={<ChevronRightIcon />} isDisabled={page === totalPages}
              onClick={() => setPage(p => p + 1)} aria-label="Next" borderRadius="lg" />
          </HStack>
        </Flex>
      )}
    </Box>
  );
}