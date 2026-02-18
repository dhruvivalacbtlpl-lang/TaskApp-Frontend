// src/pages/RolesPage.jsx
import {
  Box,
  Button,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Badge,
  Spinner,
  HStack,
  Text,
  Select,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, AddIcon } from "@chakra-ui/icons";
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

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // ✅ Protect page
  useEffect(() => {
    if (!canRead) {
      navigate("/admin");
    }
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/role");
      setRoles(res.data || []);
    } catch (err) {
      console.error("Fetch roles failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const deleteRole = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await axios.delete(`http://localhost:5000/api/role/${id}`);
    fetchRoles();
  };

  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRoles = roles.slice(startIndex, startIndex + rowsPerPage);
  const totalPages = Math.ceil(roles.length / rowsPerPage);

  return (
    <Box bg="white" p={6} borderRadius="md" boxShadow="md">
      <Flex justify="space-between" align="center" mb={5}>
        <Heading size="md">Roles</Heading>

        {/* ✅ CREATE BUTTON */}
        {canCreate && (
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={() => navigate("/admin/roles/create")}
          >
            Create Role
          </Button>
        )}
      </Flex>

      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" />
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

                {/* ✅ Hide entire column if no update/delete */}
                {showActionColumn && <Th textAlign="center">Action</Th>}
              </Tr>
            </Thead>

            <Tbody>
              {currentRoles.map((role, i) => (
                <Tr key={role._id}>
                  <Td>{startIndex + i + 1}</Td>
                  <Td fontWeight="500">{role.name}</Td>

                  <Td>
                    <Badge colorScheme={role.status === 1 ? "green" : "red"}>
                      {role.status === 1 ? "Active" : "Inactive"}
                    </Badge>
                  </Td>

                  <Td>{role.permissions?.length || 0}</Td>

                  {/* ✅ Hide entire column if no update/delete */}
                  {showActionColumn && (
                    <Td textAlign="center">
                      <HStack justify="center">
                        {canUpdate && (
                          <IconButton
                            size="sm"
                            icon={<EditIcon />}
                            onClick={() =>
                              navigate(`/admin/roles/edit/${role._id}`)
                            }
                          />
                        )}

                        {canDelete && (
                          <IconButton
                            size="sm"
                            colorScheme="red"
                            icon={<DeleteIcon />}
                            onClick={() => deleteRole(role._id)}
                          />
                        )}
                      </HStack>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>

          {/* Pagination */}
          <Flex mt={4} justify="space-between" align="center">
            <Text fontSize="sm">
              Page {currentPage} of {totalPages}
            </Text>

            <HStack>
              <Text fontSize="sm">Rows</Text>
              <Select
                size="sm"
                width="80px"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </Select>
            </HStack>

            <HStack>
              <Button
                size="sm"
                onClick={() => setCurrentPage((p) => p - 1)}
                isDisabled={currentPage === 1}
              >
                ◀
              </Button>

              <Button
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                isDisabled={currentPage === totalPages}
              >
                ▶
              </Button>
            </HStack>
          </Flex>
        </>
      )}
    </Box>
  );
}
