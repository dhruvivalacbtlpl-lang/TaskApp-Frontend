import { useState } from "react";
import {
  Box, Flex, Table, Thead, Tbody, Tr, Th, Td,
  Input, Select, Button, Text, HStack, IconButton, Badge,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";

export default function StaffList({ staffs, setStaffs, onDelete, canUpdate, canDelete }) {
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState(10);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // ✅ Bug 10 fixed — real-time socket
  useSocket("staff:created", (s) => setStaffs((prev) => [s, ...prev]));
  useSocket("staff:updated", (s) => setStaffs((prev) => prev.map((x) => x._id === s._id ? s : x)));
  useSocket("staff:deleted", ({ _id }) => setStaffs((prev) => prev.filter((x) => x._id !== _id)));

  const filtered = (staffs || []).filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / entries));
  const start = (page - 1) * entries;
  const currentData = filtered.slice(start, start + entries);

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box bg="white" borderRadius="md" boxShadow="sm">

      {/* ✅ Bug 11 fixed — confirm modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} isCentered size="sm">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader fontSize="md">Delete Staff</ModalHeader>
          <ModalBody fontSize="sm" color="gray.500">
            Are you sure you want to delete this staff member?
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button size="sm" colorScheme="red" isLoading={deleting}
              onClick={handleDeleteConfirm}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Controls */}
      <Flex justify="space-between" align="center" p={4} wrap="wrap" gap={3}>
        <HStack>
          <Text fontSize="sm">Show</Text>
          <Select size="sm" width="80px" value={entries}
            onChange={(e) => { setEntries(Number(e.target.value)); setPage(1); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </Select>
          <Text fontSize="sm">entries</Text>
        </HStack>
        <Input size="sm" placeholder="Search name or email..." width="220px"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </Flex>

      {/* Table */}
      <Table size="sm">
        <Thead bg="#bee3f8">
          <Tr>
            <Th>#</Th>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Mobile</Th>
            <Th>Role</Th>
            {(canUpdate || canDelete) && <Th textAlign="center">Actions</Th>}
          </Tr>
        </Thead>
        <Tbody>
          {currentData.length === 0 ? (
            <Tr>
              <Td colSpan={6} textAlign="center" py={8} color="gray.400">
                No staff found
              </Td>
            </Tr>
          ) : (
            currentData.map((staff, index) => (
              <Tr key={staff._id} _hover={{ bg: "gray.50" }}>
                <Td>{start + index + 1}</Td>
                <Td fontWeight="500">{staff.name}</Td>
                <Td>{staff.email}</Td>
                <Td>{staff.mobile}</Td>
                <Td>
                  <Badge colorScheme="brand" borderRadius="full" px={2}>
                    {staff.role?.name || "—"}
                  </Badge>
                </Td>
                {(canUpdate || canDelete) && (
                  <Td textAlign="center">
                    <HStack justify="center">
                      {canUpdate && (
                        <IconButton size="sm" icon={<EditIcon />}
                          onClick={() => navigate(`/admin/staff/edit/${staff._id}`)} />
                      )}
                      {canDelete && (
                        <IconButton size="sm" colorScheme="red" icon={<DeleteIcon />}
                          onClick={() => setDeleteId(staff._id)} />
                      )}
                    </HStack>
                  </Td>
                )}
              </Tr>
            ))
          )}
        </Tbody>
      </Table>

      {/* Pagination */}
      <Flex justify="space-between" align="center" p={4}>
        <Text fontSize="sm" color="gray.500">
          Showing {filtered.length === 0 ? 0 : start + 1} to {Math.min(start + entries, filtered.length)} of {filtered.length} entries
        </Text>
        <HStack>
          <Button size="sm" onClick={() => setPage(p => p - 1)} isDisabled={page === 1}>Previous</Button>
          <Button size="sm" onClick={() => setPage(p => p + 1)} isDisabled={page === totalPages}>Next</Button>
        </HStack>
      </Flex>
    </Box>
  );
}