import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Button, Badge, Spinner,
  HStack, Text, Input, Select, IconButton, useToast,
  Alert, AlertIcon, AlertDescription,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useColorModeValue, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdPersonAdd, MdEdit, MdDelete, MdPeople } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";

export default function StaffPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission, user } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const canRead   = isAdmin || hasPermission("Staff_read");
  const canCreate = isAdmin || hasPermission("Staff_create");
  const canUpdate = isAdmin || hasPermission("Staff_update");
  const canDelete = isAdmin || hasPermission("Staff_delete");

  const [staffs, setStaffs]           = useState([]);
  const [roles, setRoles]             = useState([]);
  const [search, setSearch]           = useState("");
  const [roleFilter, setRoleFilter]   = useState("");
  const [loading, setLoading]         = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [staffsPerPage, setStaffsPerPage] = useState(5);
  const [deleteId, setDeleteId]       = useState(null);
  const [deleting, setDeleting]       = useState(false);

  const cardBg      = useColorModeValue("white", "gray.800");
  const theadBg     = useColorModeValue("#bee3f8", "#2a4365");
  const theadColor  = useColorModeValue("brand.700", "white");
  const rowEven     = useColorModeValue("white", "gray.800");
  const rowOdd      = useColorModeValue("gray.50", "gray.750");
  const rowHover    = useColorModeValue("brand.50", "gray.700");
  const borderColor = useColorModeValue("#e5e7eb", "#4a5568");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.400", "gray.400");
  const iconClr     = useColorModeValue("#2b6cb0", "#63b3ed");
  const modalBg     = useColorModeValue("white", "gray.800");

  const fetchStaff = async () => {
    try {
      const res = await api.get("/staff");
      setStaffs(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast({ title: "Error fetching staff", status: "error" });
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get("/role");
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast({ title: "Error fetching roles", status: "error" });
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStaff(), fetchRoles()]).finally(() => setLoading(false));
  }, []);

  useSocket("staff:created", (s) => setStaffs(prev => [s, ...prev]));
  useSocket("staff:updated", (s) => setStaffs(prev => prev.map(x => x._id === s._id ? s : x)));
  useSocket("staff:deleted", ({ _id }) => setStaffs(prev => prev.filter(x => x._id !== _id)));

  const filteredStaffs = staffs
    .filter(s => search
      ? s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
      : true)
    .filter(s => roleFilter ? s.role?._id === roleFilter : true);

  const totalPages    = Math.max(1, Math.ceil(filteredStaffs.length / staffsPerPage));
  const startIndex    = (currentPage - 1) * staffsPerPage;
  const currentStaffs = filteredStaffs.slice(startIndex, startIndex + staffsPerPage);

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.delete(`/staff/${deleteId}`);
      // immediately remove from state — don't rely on socket
      setStaffs(prev => prev.filter(s => s._id !== deleteId));
      toast({ title: "Staff deleted", status: "success" });
      setDeleteId(null);
      // adjust page if last item on page was deleted
      const newFiltered = filteredStaffs.filter(s => s._id !== deleteId);
      const newTotalPages = Math.max(1, Math.ceil(newFiltered.length / staffsPerPage));
      if (currentPage > newTotalPages) setCurrentPage(newTotalPages);
    } catch {
      toast({ title: "Delete failed", status: "error" });
    } finally {
      setDeleting(false);
    }
  };

  if (!canRead) {
    return (
      <Box p={6}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription>You don't have permission to view this page.</AlertDescription>
        </Alert>
      </Box>
    );
  }

  return (
    <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">

      {/* DELETE CONFIRM MODAL */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} isCentered size="sm">
        <ModalOverlay />
        <ModalContent borderRadius="xl" bg={modalBg}>
          <ModalHeader fontSize="md" color={textColor}>🗑️ Delete Staff</ModalHeader>
          <ModalBody fontSize="sm" color={subColor}>
            Are you sure you want to delete this staff member? This cannot be undone.
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button size="sm" colorScheme="red" isLoading={deleting}
              loadingText="Deleting..." onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* HEADER */}
      <Flex justify="space-between" align="center" mb={5}>
        <Flex align="center" gap={2}>
          <MdPeople size={22} color={iconClr} />
          <Heading size="md" color={textColor}>Staff</Heading>
        </Flex>
        {canCreate && (
          <Button colorScheme="brand" leftIcon={<MdPersonAdd size={18} />}
            onClick={() => navigate("/admin/staff/create")}>
            Add User
          </Button>
        )}
      </Flex>

      {/* FILTERS */}
      <Flex gap={4} mb={4} wrap="wrap">
        <Input
          placeholder="Search users..."
          maxW="300px"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
        />
        <Select
          placeholder="Filter by Role"
          maxW="200px"
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
        >
          {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
        </Select>
      </Flex>

      {/* CONTENT */}
      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" color="brand.500" />
        </Flex>
      ) : filteredStaffs.length === 0 ? (
        <Flex direction="column" align="center" py={12} color={subColor}>
          <MdPeople size={40} />
          <Text fontSize="sm" fontWeight="medium" mt={2}>No staff found</Text>
          <Text fontSize="xs">Try clearing your filters or add a new user</Text>
        </Flex>
      ) : (
        <>
          <TableContainer borderRadius="lg" border={`1px solid ${borderColor}`} overflow="hidden">
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}>
                <Tr>
                  {["#", "Name", "Email", "Role", "Status",
                    ...(canUpdate || canDelete ? ["Actions"] : [])
                  ].map(h => (
                    <Th
                      key={h}
                      color={theadColor}
                      fontSize="xs"
                      py={3}
                      textAlign={h === "Actions" ? "center" : "left"}
                    >
                      {h}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {currentStaffs.map((staff, index) => (
                  <Tr
                    key={staff._id}
                    bg={index % 2 === 0 ? rowEven : rowOdd}
                    _hover={{ bg: rowHover }}
                    transition="background 0.15s"
                  >
                    <Td color={textColor} fontSize="sm">
                      {startIndex + index + 1}
                    </Td>
                    <Td>
                      <Text fontWeight="600" fontSize="sm" color={textColor}>
                        {staff.name}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="sm" color={textColor}>
                        {staff.email}
                      </Text>
                    </Td>
                    <Td>
                      <Badge colorScheme="brand" borderRadius="full" px={2}>
                        {staff.role?.name || "N/A"}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme="green" borderRadius="full" px={2}>
                        ACTIVE
                      </Badge>
                    </Td>
                    {(canUpdate || canDelete) && (
                      <Td textAlign="center">
                        <HStack justify="center">
                          {canUpdate && (
                            <IconButton
                              size="sm"
                              icon={<MdEdit size={16} />}
                              aria-label="Edit"
                              colorScheme="gray"
                              onClick={() => navigate(`/admin/staff/edit/${staff._id}`)}
                            />
                          )}
                          {canDelete && (
                            <IconButton
                              size="sm"
                              icon={<MdDelete size={16} />}
                              aria-label="Delete"
                              colorScheme="red"
                              onClick={() => setDeleteId(staff._id)}
                            />
                          )}
                        </HStack>
                      </Td>
                    )}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          {/* PAGINATION */}
          <Flex mt={4} align="center" justify="space-between" wrap="wrap" gap={4}>
            <Text fontSize="sm" color={textColor}>
              Page {currentPage} of {totalPages} • {filteredStaffs.length} users
            </Text>
            <HStack>
              <Text fontSize="sm" color={textColor}>Rows:</Text>
              <Select
                size="sm" width="80px"
                value={staffsPerPage}
                onChange={e => { setStaffsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </Select>
            </HStack>
            <HStack>
              <IconButton
                size="sm"
                icon={<ChevronLeftIcon />}
                isDisabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Button
                  key={p} size="sm"
                  colorScheme={p === currentPage ? "brand" : "gray"}
                  variant={p === currentPage ? "solid" : "outline"}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </Button>
              ))}
              <IconButton
                size="sm"
                icon={<ChevronRightIcon />}
                isDisabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              />
            </HStack>
          </Flex>
        </>
      )}
    </Box>
  );
}