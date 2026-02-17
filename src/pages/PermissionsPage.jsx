import {
  Box,
  Flex,
  Heading,
  Button,
  Badge,
  Spinner,
  HStack,
  Text,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, AddIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function PermissionPage() {
  const navigate = useNavigate();

  // ✅ AUTH
  const { hasPermission, user } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // ✅ PROTECT PAGE (READ PERMISSION)
  useEffect(() => {
    if (!isAdmin && !hasPermission("permission_read")) {
      navigate("/admin");
    }
  }, []);

  /* ================= FETCH ================= */
  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/permissions");
      setPermissions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await axios.delete(`http://localhost:5000/api/permissions/${id}`);
    fetchPermissions();
  };

  /* ================= PAGINATION ================= */
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentPermissions = permissions.slice(
    startIndex,
    startIndex + rowsPerPage
  );
  const totalPages = Math.ceil(permissions.length / rowsPerPage);

  return (
    <Box bg="white" p={6} borderRadius="md" boxShadow="md">
      {/* HEADER */}
      <Flex justify="space-between" align="center" mb={5}>
        <Heading size="md">Permissions</Heading>

        {/* ✅ CREATE PERMISSION */}
        {(isAdmin || hasPermission("permission_create")) && (
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={() => navigate("/admin/permissions/create")}
          >
            Create Permission
          </Button>
        )}
      </Flex>

      {/* TABLE */}
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
                <Th>Value</Th>
                <Th>Status</Th>

                {/* ⭐ HIDE ACTION COLUMN IF NO UPDATE/DELETE */}
                {(isAdmin ||
                  hasPermission("permission_update") ||
                  hasPermission("permission_delete")) && (
                  <Th textAlign="center">Action</Th>
                )}
              </Tr>
            </Thead>

            <Tbody>
              {currentPermissions.map((perm, i) => (
                <Tr key={perm._id}>
                  <Td>{startIndex + i + 1}</Td>
                  <Td fontWeight="500">{perm.name}</Td>
                  <Td>{perm.value}</Td>

                  <Td>
                    <Badge
                      colorScheme={perm.status === 1 ? "green" : "red"}
                    >
                      {perm.status === 1 ? "Active" : "Inactive"}
                    </Badge>
                  </Td>

                  {/* ⭐ ACTION BUTTONS */}
                  {(isAdmin ||
                    hasPermission("permission_update") ||
                    hasPermission("permission_delete")) && (
                    <Td textAlign="center">
                      <HStack justify="center">
                        
                        {(isAdmin ||
                          hasPermission("permission_update")) && (
                          <IconButton
                            size="sm"
                            icon={<EditIcon />}
                            onClick={() =>
                              navigate(
                                `/admin/permissions/edit/${perm._id}`
                              )
                            }
                          />
                        )}

                        {(isAdmin ||
                          hasPermission("permission_delete")) && (
                          <IconButton
                            size="sm"
                            colorScheme="red"
                            icon={<DeleteIcon />}
                            onClick={() =>
                              handleDelete(perm._id)
                            }
                          />
                        )}

                      </HStack>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>

          {/* 🔥 SAME PAGINATION AS ROLES PAGE */}
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
