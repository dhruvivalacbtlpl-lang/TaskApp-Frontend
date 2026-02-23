import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Button, Badge, Spinner,
  HStack, Text, Input, Select, IconButton, useToast,
  Alert, AlertIcon, AlertDescription,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdPersonAdd, MdEdit, MdDelete, MdPeople } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import api from "../api"; // ✅ fixed from axios
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket"; // ✅ real-time

export default function StaffPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission, user } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const canRead = isAdmin || hasPermission("Staff_read");
  const canCreate = isAdmin || hasPermission("Staff_create");
  const canUpdate = isAdmin || hasPermission("Staff_update");
  const canDelete = isAdmin || hasPermission("Staff_delete");

  const [staffs, setStaffs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [staffsPerPage, setStaffsPerPage] = useState(5);

  // ✅ confirm modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStaff = async () => {
    try {
      const res = await api.get("/staff"); // ✅ fixed
      setStaffs(res.data || []);
    } catch {
      toast({ title: "Error fetching staff", status: "error" });
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get("/role"); // ✅ fixed
      setRoles(res.data || []);
    } catch {
      toast({ title: "Error fetching roles", status: "error" });
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStaff(), fetchRoles()]).finally(() => setLoading(false));
  }, []);

  // ✅ real-time socket updates
  useSocket("staff:created", (s) => setStaffs((prev) => [s, ...prev]));
  useSocket("staff:updated", (s) => setStaffs((prev) => prev.map((x) => x._id === s._id ? s : x)));
  useSocket("staff:deleted", ({ _id }) => setStaffs((prev) => prev.filter((x) => x._id !== _id)));

  const filteredStaffs = staffs
    .filter((s) =>
      search
        ? s.name?.toLowerCase().includes(search.toLowerCase()) ||
          s.email?.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .filter((s) => (roleFilter ? s.role?._id === roleFilter : true));

  const totalPages = Math.max(1, Math.ceil(filteredStaffs.length / staffsPerPage));
  const startIndex = (currentPage - 1) * staffsPerPage;
  const currentStaffs = filteredStaffs.slice(startIndex, startIndex + staffsPerPage);

  // ✅ fixed — only called AFTER modal confirm
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.delete(`/staff/${deleteId}`); // ✅ fixed
      toast({ title: "Staff deleted", status: "success" });
      setDeleteId(null);
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
    <Box bg="white" p={6} borderRadius="md" boxShadow="md">

      {/* ✅ CONFIRM DELETE MODAL */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} isCentered size="sm">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader fontSize="md">🗑️ Delete Staff</ModalHeader>
          <ModalBody fontSize="sm" color="gray.500">
            Are you sure you want to delete this staff member? This cannot be undone.
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost"
              onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button size="sm" colorScheme="red"
              isLoading={deleting}
              loadingText="Deleting..."
              onClick={handleDeleteConfirm}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Flex justify="space-between" align="center" mb={5}>
        <Flex align="center" gap={2}>
          <MdPeople size={22} color="#2b6cb0" />
          <Heading size="md">Staff</Heading>
        </Flex>
        {canCreate && (
          <Button colorScheme="blue" leftIcon={<MdPersonAdd size={18} />}
            onClick={() => navigate("/admin/staff/create")}>
            Add User
          </Button>
        )}
      </Flex>

      <Flex gap={4} mb={4} wrap="wrap">
        <Input placeholder="Search users..." maxW="300px" value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
        <Select placeholder="Filter by Role" maxW="200px" value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}>
          {roles.map((r) => (
            <option key={r._id} value={r._id}>{r.name}</option>
          ))}
        </Select>
      </Flex>

      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" color="blue.500" />
        </Flex>
      ) : filteredStaffs.length === 0 ? (
        <Flex direction="column" align="center" py={12} color="gray.400">
          <MdPeople size={40} />
          <Text fontSize="sm" fontWeight="medium" mt={2}>No staff found</Text>
          <Text fontSize="xs">Try clearing your filters or add a new user</Text>
        </Flex>
      ) : (
        <>
          <Box overflowX="auto">
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Status</th>
                  {(canUpdate || canDelete) && (
                    <th style={{ ...styles.th, textAlign: "center" }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentStaffs.map((staff, index) => (
                  <tr key={staff._id}
                    onMouseEnter={e => e.currentTarget.style.background = "#ebf8ff"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    style={{ transition: "background 0.15s" }}>
                    <td style={styles.td}>{startIndex + index + 1}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{staff.name}</td>
                    <td style={styles.td}>{staff.email}</td>
                    <td style={styles.td}>
                      <Badge colorScheme="blue">{staff.role?.name || "N/A"}</Badge>
                    </td>
                    <td style={styles.td}>
                      <Badge colorScheme="green">ACTIVE</Badge>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <HStack justify="center">
                          {canUpdate && (
                            <IconButton size="sm" icon={<MdEdit size={16} />}
                              aria-label="Edit" colorScheme="gray"
                              onClick={() => navigate(`/admin/staff/edit/${staff._id}`)} />
                          )}
                          {canDelete && (
                            <IconButton size="sm" icon={<MdDelete size={16} />}
                              aria-label="Delete" colorScheme="red"
                              onClick={() => setDeleteId(staff._id)} // ✅ opens modal
                            />
                          )}
                        </HStack>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          <Flex mt={4} align="center" justify="space-between" wrap="wrap" gap={4}>
            <Text fontSize="sm" color="gray.600">
              Page {currentPage} of {totalPages} • {filteredStaffs.length} users
            </Text>
            <HStack>
              <Text fontSize="sm">Rows:</Text>
              <Select size="sm" width="80px" value={staffsPerPage}
                onChange={(e) => { setStaffsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </Select>
            </HStack>
            <HStack>
              <IconButton size="sm" icon={<ChevronLeftIcon />}
                isDisabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} size="sm"
                  colorScheme={p === currentPage ? "blue" : "gray"}
                  variant={p === currentPage ? "solid" : "outline"}
                  onClick={() => setCurrentPage(p)}>
                  {p}
                </Button>
              ))}
              <IconButton size="sm" icon={<ChevronRightIcon />}
                isDisabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)} />
            </HStack>
          </Flex>
        </>
      )}
    </Box>
  );
}

const styles = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  thead: { backgroundColor: "#bee3f8" },
  th: { padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "#334155" },
  td: { padding: "12px", borderBottom: "1px solid #e5e7eb" },
};