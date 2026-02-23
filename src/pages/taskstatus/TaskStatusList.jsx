import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Flex, Heading, Button, Table, Thead, Tbody, Tr, Th, Td,
  Badge, HStack, Spinner, Text, IconButton, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import { MdAdd, MdEdit, MdDelete, MdLabel } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function TaskStatusList() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const canRead = isAdmin || hasPermission("taskstatus_read");
  const canCreate = isAdmin || hasPermission("taskstatus_create");
  const canUpdate = isAdmin || hasPermission("taskstatus_update");
  const canDelete = isAdmin || hasPermission("taskstatus_delete");

  const showMsg = (type, msg) => {
    if (type === "success") { setSuccessMsg(msg); setErrorMsg(""); }
    else { setErrorMsg(msg); setSuccessMsg(""); }
    setTimeout(() => { setSuccessMsg(""); setErrorMsg(""); }, 3000);
  };

  const fetchStatuses = async () => {
    try {
      const res = await axios.get("/task-status");
      setStatuses(res.data);
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
      await axios.delete(`/task-status/${id}`);
      setStatuses(statuses.filter((s) => s._id !== id));
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
          <MdLabel size={22} color="#2b6cb0" />
          <Heading size="md">Task Status</Heading>
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
        <Flex direction="column" align="center" py={12} color="gray.400">
          <MdLabel size={40} />
          <Text fontSize="sm" fontWeight="medium" mt={2}>No statuses found</Text>
          <Text fontSize="xs">Create your first status to get started</Text>
        </Flex>
      ) : (
        <Table size="sm">
          <Thead bg="#bee3f8">
            <Tr>
              <Th>#</Th>
              <Th>Status Name</Th>
              <Th>Status</Th>
              {(canUpdate || canDelete) && <Th textAlign="center">Actions</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {statuses.map((status, index) => (
              <Tr key={status._id}
                _hover={{ bg: "blue.50" }}
                transition="background 0.15s">
                <Td>{index + 1}</Td>
                <Td fontWeight="600">{status.name}</Td>
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