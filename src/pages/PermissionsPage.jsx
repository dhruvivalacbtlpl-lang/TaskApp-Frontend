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

export default function PermissionsPage() {
  const navigate = useNavigate();
  const { hasPermission, user, loading } = useAuth();

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const [permissions, setPermissions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  /* ================= PROTECT PAGE ================= */

  useEffect(() => {
    if (loading) return;

    if (!isAdmin && !hasPermission("permissions_read")) {
      navigate("/admin");
    }
  }, [loading, user]);

  /* ================= FETCH ================= */

  const fetchPermissions = async () => {
    try {
      setDataLoading(true);
      const res = await axios.get(
        "http://localhost:5000/api/permissions"
      );
      setPermissions(res.data || []);
    } catch (err) {
      console.error("Permission fetch error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchPermissions();
    }
  }, [loading]);

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;

    try {
      await axios.delete(
        `http://localhost:5000/api/permissions/${id}`
      );
      fetchPermissions();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  /* ================= PAGINATION ================= */

  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentPermissions = permissions.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  const totalPages =
    Math.ceil(permissions.length / rowsPerPage) || 1;

  /* ================= GLOBAL LOADING ================= */

  if (loading) {
    return (
      <Flex justify="center" align="center" h="60vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box bg="white" p={6} borderRadius="md" boxShadow="md">
      <Flex justify="space-between" align="center" mb={5}>
        <Heading size="md">Permissions</Heading>

        {(isAdmin || hasPermission("permissions_create")) && (
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={() =>
              navigate("/admin/permissions/create")
            }
          >
            Create Permission
          </Button>
        )}
      </Flex>

      {dataLoading ? (
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

                {(isAdmin ||
                  hasPermission("permissions_update") ||
                  hasPermission("permissions_delete")) && (
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
                      colorScheme={
                        perm.status === 1 ? "green" : "red"
                      }
                    >
                      {perm.status === 1
                        ? "Active"
                        : "Inactive"}
                    </Badge>
                  </Td>

                  {(isAdmin ||
                    hasPermission("permissions_update") ||
                    hasPermission("permissions_delete")) && (
                    <Td textAlign="center">
                      <HStack justify="center">
                        {(isAdmin ||
                          hasPermission("permissions_update")) && (
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
                          hasPermission("permissions_delete")) && (
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

              {currentPermissions.length === 0 && (
                <Tr>
                  <Td colSpan="5" textAlign="center">
                    No permissions found
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>

          <Flex
            mt={4}
            justify="space-between"
            align="center"
          >
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
                onClick={() =>
                  setCurrentPage((p) => p - 1)
                }
                isDisabled={currentPage === 1}
              >
                ◀
              </Button>

              <Button
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => p + 1)
                }
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
