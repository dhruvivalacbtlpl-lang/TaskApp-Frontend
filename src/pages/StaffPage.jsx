import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Button, Badge, Spinner,
  HStack, Text, Input, Select, IconButton, useToast, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdPersonAdd, MdEdit, MdDelete } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

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

  const fetchStaff = async () => {
    try {
      const res = await axios.get("/staff", {
        headers: { "Cache-Control": "no-cache" },
      });
      setStaffs(res.data || []);
    } catch {
      toast({ title: "Error fetching staff", status: "error", isClosable: true });
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get("/role", {
        headers: { "Cache-Control": "no-cache" },
      });
      setRoles(res.data || []);
    } catch {
      toast({ title: "Error fetching roles", status: "error", isClosable: true });
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStaff(), fetchRoles()]).finally(() => setLoading(false));
  }, []);

  const filteredStaffs = staffs
    .filter((s) =>
      search
        ? s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .filter((s) => (roleFilter ? s.role?._id === roleFilter : true));

  const totalPages = Math.max(1, Math.ceil(filteredStaffs.length / staffsPerPage));
  const startIndex = (currentPage - 1) * staffsPerPage;
  const currentStaffs = filteredStaffs.slice(startIndex, startIndex + staffsPerPage);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/staff/${id}`);
      setStaffs(staffs.filter((s) => s._id !== id));
      toast({ title: "User deleted successfully", status: "success", isClosable: true });
    } catch {
      toast({ title: "Delete failed. Please try again.", status: "error", isClosable: true });
    }
  };

  // ✅ Early return AFTER all hooks
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
      <Flex justify="space-between" align="center" mb={5}>
        <Heading size="md">Staff</Heading>
        {canCreate && (
          <Button
            colorScheme="blue"
            leftIcon={<MdPersonAdd size={18} />}
            onClick={() => navigate("/admin/staff/create")}
          >
            Add User
          </Button>
        )}
      </Flex>

      <Flex gap={4} mb={4} wrap="wrap">
        <Input
          placeholder="Search users..."
          maxW="300px"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
        />
        <Select
          placeholder="Filter by Role"
          maxW="200px"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
        >
          {roles.map((r) => (
            <option key={r._id} value={r._id}>{r.name}</option>
          ))}
        </Select>
      </Flex>

      {loading ? (
        <Flex justify="center" py={10}><Spinner size="lg" /></Flex>
      ) : (
        <>
          <Box overflowX="auto">
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
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
                {currentStaffs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={styles.empty}>No users found</td>
                  </tr>
                ) : (
                  currentStaffs.map((staff) => (
                    <tr key={staff._id}>
                      <td style={styles.td}>{staff.name}</td>
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
                              <IconButton
                                size="sm"
                                icon={<MdEdit size={16} />}
                                aria-label="Edit Staff"
                                colorScheme="gray"
                                onClick={() => navigate(`/admin/staff/edit/${staff._id}`)}
                              />
                            )}
                            {canDelete && (
                              <IconButton
                                size="sm"
                                icon={<MdDelete size={16} />}
                                aria-label="Delete Staff"
                                colorScheme="red"
                                onClick={() => handleDelete(staff._id)}
                              />
                            )}
                          </HStack>
                        </td>
                      )}
                    </tr>
                  ))
                )}
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
              <IconButton
                size="sm"
                icon={<ChevronLeftIcon />}
                isDisabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                aria-label="Previous page"
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  size="sm"
                  colorScheme={page === currentPage ? "blue" : "gray"}
                  variant={page === currentPage ? "solid" : "outline"}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <IconButton
                size="sm"
                icon={<ChevronRightIcon />}
                isDisabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                aria-label="Next page"
              />
            </HStack>
          </Flex>
        </>
      )}
    </Box>
  );
}

const styles = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  thead: { backgroundColor: "#f8fafc" },
  th: { padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "#334155" },
  td: { padding: "12px", borderBottom: "1px solid #e5e7eb" },
  empty: { textAlign: "center", padding: 20, color: "#64748b" },
};