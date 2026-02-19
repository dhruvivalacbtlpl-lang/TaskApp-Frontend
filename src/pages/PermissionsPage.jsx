import {
  Box, Flex, Heading, Button, Badge, Spinner, HStack, Text,
  IconButton, Table, Thead, Tbody, Tr, Th, Td, Select,
  Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdAdd, MdEdit, MdDelete } from "react-icons/md";
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
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin && !hasPermission("permissions_read")) {
      navigate("/admin");
    }
  }, [loading, user]);

  const fetchPermissions = async () => {
    try {
      setDataLoading(true);
      const res = await axios.get("/permissions");
      setPermissions(res.data || []);
    } catch (err) {
      setErrorMsg("Failed to fetch permissions. Please try again.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchPermissions();
  }, [loading]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/permissions/${id}`);
      setSuccessMsg("Permission deleted successfully.");
      setErrorMsg("");
      fetchPermissions();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Failed to delete permission. Please try again.");
    }
  };

  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentPermissions = permissions.slice(startIndex, startIndex + rowsPerPage);
  const totalPages = Math.ceil(permissions.length / rowsPerPage) || 1;

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
            leftIcon={<MdAdd size={18} />}
            colorScheme="blue"
            onClick={() => navigate("/admin/permissions/create")}
          >
            Create Permission
          </Button>
        )}
      </Flex>

      {/* ✅ Success Message */}
      {successMsg && (
        <Alert status="success" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* ✅ Error Message */}
      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {dataLoading ? (
        <Flex justify="center" py={10}><Spinner size="lg" /></Flex>
      ) : (
        <>
          <Table size="sm">
            <Thead bg="#bee3f8">
              <Tr>
                <Th>#</Th>
                <Th>Name</Th>
                <Th>Value</Th>
                <Th>Status</Th>
                {(isAdmin || hasPermission("permissions_update") || hasPermission("permissions_delete")) && (
                  <Th textAlign="center">Action</Th>
                )}
              </Tr>
            </Thead>
            <Tbody>
              {currentPermissions.length === 0 ? (
                <Tr>
                  <Td colSpan="5" textAlign="center" color="gray.500" py={6}>
                    No permissions found
                  </Td>
                </Tr>
              ) : (
                currentPermissions.map((perm, i) => (
                  <Tr key={perm._id}>
                    <Td>{startIndex + i + 1}</Td>
                    <Td fontWeight="500">{perm.name}</Td>
                    <Td>{perm.value}</Td>
                    <Td>
                      <Badge colorScheme={perm.status === 1 ? "green" : "red"}>
                        {perm.status === 1 ? "Active" : "Inactive"}
                      </Badge>
                    </Td>
                    {(isAdmin || hasPermission("permissions_update") || hasPermission("permissions_delete")) && (
                      <Td textAlign="center">
                        <HStack justify="center">
                          {(isAdmin || hasPermission("permissions_update")) && (
                            <IconButton
                              size="sm"
                              icon={<MdEdit size={16} />}
                              aria-label="Edit Permission"
                              colorScheme="gray"
                              onClick={() => navigate(`/admin/permissions/edit/${perm._id}`)}
                            />
                          )}
                          {(isAdmin || hasPermission("permissions_delete")) && (
                            <IconButton
                              size="sm"
                              colorScheme="red"
                              icon={<MdDelete size={16} />}
                              aria-label="Delete Permission"
                              onClick={() => handleDelete(perm._id)}
                            />
                          )}
                        </HStack>
                      </Td>
                    )}
                  </Tr>
                ))
              )}
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
              <IconButton
                size="sm"
                icon={<ChevronLeftIcon />}
                isDisabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                aria-label="Previous page"
              />
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