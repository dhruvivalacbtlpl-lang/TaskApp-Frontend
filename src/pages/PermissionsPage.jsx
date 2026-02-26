import {
  Box, Flex, Heading, Button, Badge, Spinner, HStack, Text,
  IconButton, Table, Thead, Tbody, Tr, Th, Td, Select,
  Alert, AlertIcon, AlertDescription, useColorModeValue,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdAdd, MdEdit, MdDelete, MdSecurity } from "react-icons/md";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
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

  const cardBg    = useColorModeValue("white", "gray.800");
  const theadBg   = useColorModeValue("#bee3f8", "#2a4365");
  const textColor = useColorModeValue("gray.800", "white");
  const subColor  = useColorModeValue("gray.400", "gray.400");
  const rowHover  = useColorModeValue("brand.50", "gray.700");
  const thColor   = useColorModeValue("brand.700", "white");
  const iconClr   = useColorModeValue("#2b6cb0", "#63b3ed");

  useEffect(() => {
    if (loading) return;
    if (!isAdmin && !hasPermission("permissions_read")) navigate("/admin");
  }, [loading, user]);

  const fetchPermissions = async () => {
    try {
      setDataLoading(true);
      const res = await api.get("/permissions");
      setPermissions(Array.isArray(res.data) ? res.data : []);
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
      await api.delete(`/permissions/${id}`);
      setSuccessMsg("Permission deleted successfully.");
      setErrorMsg("");
      fetchPermissions();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Failed to delete permission. Please try again.");
    }
  };

  const startIndex         = (currentPage - 1) * rowsPerPage;
  const currentPermissions = permissions.slice(startIndex, startIndex + rowsPerPage);
  const totalPages         = Math.ceil(permissions.length / rowsPerPage) || 1;

  if (loading) {
    return <Flex justify="center" align="center" h="60vh"><Spinner size="xl" color="brand.500" /></Flex>;
  }

  return (
    <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">
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
          <MdSecurity size={22} color={iconClr} />
          <Heading size="md" color={textColor}>Permissions</Heading>
        </Flex>
        {(isAdmin || hasPermission("permissions_create")) && (
          <Button leftIcon={<MdAdd size={18} />} colorScheme="brand"
            onClick={() => navigate("/admin/permissions/create")}>
            Create Permission
          </Button>
        )}
      </Flex>

      {dataLoading ? (
        <Flex justify="center" py={10}><Spinner size="lg" color="brand.500" /></Flex>
      ) : permissions.length === 0 ? (
        <Flex direction="column" align="center" py={12} color={subColor}>
          <MdSecurity size={40} />
          <Text fontSize="sm" fontWeight="medium" mt={2}>No permissions found</Text>
          <Text fontSize="xs">Create your first permission to get started</Text>
        </Flex>
      ) : (
        <>
          <Table size="sm">
            <Thead bg={theadBg}>
              <Tr>
                <Th color={thColor}>#</Th>
                <Th color={thColor}>Name</Th>
                <Th color={thColor}>Value</Th>
                <Th color={thColor}>Status</Th>
                {(isAdmin || hasPermission("permissions_update") || hasPermission("permissions_delete")) && (
                  <Th color={thColor} textAlign="center">Action</Th>
                )}
              </Tr>
            </Thead>
            <Tbody>
              {currentPermissions.map((perm, i) => (
                <Tr key={perm._id} _hover={{ bg: rowHover }} transition="background 0.15s">
                  <Td color={textColor}>{startIndex + i + 1}</Td>
                  <Td color={textColor} fontWeight="600">{perm.name}</Td>
                  <Td color={textColor}>{perm.value}</Td>
                  <Td>
                    <Badge colorScheme={perm.status === 1 ? "green" : "red"}>
                      {perm.status === 1 ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  {(isAdmin || hasPermission("permissions_update") || hasPermission("permissions_delete")) && (
                    <Td textAlign="center">
                      <HStack justify="center">
                        {(isAdmin || hasPermission("permissions_update")) && (
                          <IconButton size="sm" icon={<MdEdit size={16} />}
                            aria-label="Edit Permission" colorScheme="gray"
                            onClick={() => navigate(`/admin/permissions/edit/${perm._id}`)} />
                        )}
                        {(isAdmin || hasPermission("permissions_delete")) && (
                          <IconButton size="sm" colorScheme="red"
                            icon={<MdDelete size={16} />} aria-label="Delete Permission"
                            onClick={() => handleDelete(perm._id)} />
                        )}
                      </HStack>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Flex mt={4} justify="space-between" align="center">
            <Text fontSize="sm" color={textColor}>Page {currentPage} of {totalPages}</Text>
            <HStack>
              <Text fontSize="sm" color={textColor}>Rows</Text>
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