import {
  Box, Button, Flex, Heading, Table, Thead, Tbody, Tr, Th, Td,
  IconButton, Badge, Spinner, HStack, Text, Select, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdAdd, MdEdit, MdDelete, MdVpnKey } from "react-icons/md";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function RolesPage() {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";
  const canRead = isAdmin || hasPermission("role_read");
  const canCreate = isAdmin || hasPermission("role_create");
  const canUpdate = isAdmin || hasPermission("role_update");
  const canDelete = isAdmin || hasPermission("role_delete");
  const showActionColumn = canUpdate || canDelete;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    if (!canRead) navigate("/admin");
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/role");
      setRoles(res.data || []);
    } catch (err) {
      setErrorMsg("Failed to fetch roles. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const deleteRole = async (id) => {
    try {
      await axios.delete(`/role/${id}`);
      setSuccessMsg("Role deleted successfully.");
      setErrorMsg("");
      fetchRoles();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Failed to delete role. Please try again.");
    }
  };

  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRoles = roles.slice(startIndex, startIndex + rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(roles.length / rowsPerPage));

  return (
    <Box bg="white" p={6} borderRadius="md" boxShadow="md">

      {successMsg && (
        <Alert status="success" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}
      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Flex justify="space-between" align="center" mb={5}>
        <Flex align="center" gap={2}>
          <MdVpnKey size={22} color="#2b6cb0" />
          <Heading size="md">Roles</Heading>
        </Flex>
        {canCreate && (
          <Button leftIcon={<MdAdd size={18} />} colorScheme="blue"
            onClick={() => navigate("/admin/roles/create")}>
            Create Role
          </Button>
        )}
      </Flex>

      {loading ? (
        <Flex justify="center" py={10}><Spinner size="lg" color="blue.500" /></Flex>
      ) : roles.length === 0 ? (
        <Flex direction="column" align="center" py={12} color="gray.400">
          <MdVpnKey size={40} />
          <Text fontSize="sm" fontWeight="medium" mt={2}>No roles found</Text>
          <Text fontSize="xs">Create your first role to get started</Text>
        </Flex>
      ) : (
        <>
          <Table size="sm">
            <Thead bg="#bee3f8">
              <Tr>
                <Th>#</Th>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Permissions Count</Th>
                {showActionColumn && <Th textAlign="center">Action</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {currentRoles.map((role, i) => (
                <Tr key={role._id}
                  _hover={{ bg: "blue.50" }}
                  transition="background 0.15s">
                  <Td>{startIndex + i + 1}</Td>
                  <Td fontWeight="600">{role.name}</Td>
                  <Td>
                    <Badge colorScheme={role.status === 1 ? "green" : "red"}>
                      {role.status === 1 ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td>{role.permissions?.length || 0}</Td>
                  {showActionColumn && (
                    <Td textAlign="center">
                      <HStack justify="center">
                        {canUpdate && (
                          <IconButton size="sm" icon={<MdEdit size={16} />}
                            aria-label="Edit Role" colorScheme="gray"
                            onClick={() => navigate(`/admin/roles/edit/${role._id}`)} />
                        )}
                        {canDelete && (
                          <IconButton size="sm" icon={<MdDelete size={16} />}
                            aria-label="Delete Role" colorScheme="red"
                            onClick={() => deleteRole(role._id)} />
                        )}
                      </HStack>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Flex mt={4} justify="space-between" align="center">
            <Text fontSize="sm">Page {currentPage} of {totalPages}</Text>
            <HStack>
              <Text fontSize="sm">Rows</Text>
              <Select size="sm" width="80px" value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </Select>
            </HStack>
            <HStack>
              <IconButton size="sm" icon={<ChevronLeftIcon />}
                isDisabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)} aria-label="Previous page" />
              <IconButton size="sm" icon={<ChevronRightIcon />}
                isDisabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)} aria-label="Next page" />
            </HStack>
          </Flex>
        </>
      )}
    </Box>
  );
}