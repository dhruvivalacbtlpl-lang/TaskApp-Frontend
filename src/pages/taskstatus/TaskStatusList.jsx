import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Button, Table, Thead, Tbody, Tr, Th, Td,
  Badge, HStack, Spinner, Text, IconButton, Alert, AlertIcon, AlertDescription,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdAdd, MdEdit, MdDelete, MdLabel } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

export default function TaskStatusList() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const canRead   = isAdmin || hasPermission("taskstatus_read");
  const canCreate = isAdmin || hasPermission("taskstatus_create");
  const canUpdate = isAdmin || hasPermission("taskstatus_update");
  const canDelete = isAdmin || hasPermission("taskstatus_delete");

  const cardBg    = useColorModeValue("white", "gray.800");
  const theadBg   = useColorModeValue("#bee3f8", "#2a4365");
  const textColor = useColorModeValue("gray.800", "white");
  const subColor  = useColorModeValue("gray.400", "gray.400");
  const rowHover  = useColorModeValue("blue.50", "gray.700");
  const thColor   = useColorModeValue("blue.700", "white");
  const iconClr   = useColorModeValue("#2b6cb0", "#63b3ed");

  const showMsg = (type, msg) => {
    if (type === "success") { setSuccessMsg(msg); setErrorMsg(""); }
    else { setErrorMsg(msg); setSuccessMsg(""); }
    setTimeout(() => { setSuccessMsg(""); setErrorMsg(""); }, 3000);
  };

  const fetchStatuses = async () => {
    try {
      const res = await api.get("/task-status");
      const data = Array.isArray(res.data) ? res.data
                 : Array.isArray(res.data?.data) ? res.data.data : [];
      setStatuses(data);
    } catch {
      showMsg("error", "Error fetching statuses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) fetchStatuses();
  }, [canRead]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/task-status/${id}`);
      setStatuses((prev) => prev.filter((s) => s._id !== id));
      showMsg("success", "Status deleted successfully.");
    } catch {
      showMsg("error", "Delete failed. Please try again.");
    }
  };

  const getColor = (status) => status === "ACTIVE" ? "green" : "red";

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
          <MdLabel size={22} color={iconClr} />
          <Heading size="md" color={textColor}>Task Status</Heading>
        </Flex>
        {canCreate && (
          <Button leftIcon={<MdAdd size={18} />} colorScheme="blue"
            onClick={() => navigate("/admin/task-status/create")}>
            New Status
          </Button>
        )}
      </Flex>

      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" color="blue.500" />
        </Flex>
      ) : statuses.length === 0 ? (
        <Flex direction="column" align="center" py={12} color={subColor}>
          <MdLabel size={40} />
          <Text fontSize="sm" fontWeight="medium" mt={2}>No statuses found</Text>
          <Text fontSize="xs">Create your first status to get started</Text>
        </Flex>
      ) : (
        <Table size="sm">
          <Thead bg={theadBg}>
            <Tr>
              <Th color={thColor}>#</Th>
              <Th color={thColor}>Status Name</Th>
              <Th color={thColor}>Status</Th>
              {(canUpdate || canDelete) && <Th color={thColor} textAlign="center">Actions</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {statuses.map((status, index) => (
              <Tr key={status._id}
                _hover={{ bg: rowHover }}
                transition="background 0.15s">
                <Td color={textColor}>{index + 1}</Td>
                <Td color={textColor} fontWeight="600">{status.name}</Td>
                <Td>
                  <Badge colorScheme={getColor(status.status)}>
                    {status.status}
                  </Badge>
                </Td>
                {(canUpdate || canDelete) && (
                  <Td textAlign="center">
                    <HStack justify="center">
                      {canUpdate && (
                        <IconButton size="sm" icon={<MdEdit size={16} />}
                          aria-label="Edit Status" colorScheme="gray"
                          onClick={() => navigate(`/admin/task-status/edit/${status._id}`)} />
                      )}
                      {canDelete && (
                        <IconButton size="sm" colorScheme="red"
                          icon={<MdDelete size={16} />} aria-label="Delete Status"
                          onClick={() => handleDelete(status._id)} />
                      )}
                    </HStack>
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
}