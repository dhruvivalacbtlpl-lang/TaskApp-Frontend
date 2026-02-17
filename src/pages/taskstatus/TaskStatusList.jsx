import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Flex,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  useToast,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function TaskStatusList() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const toast = useToast();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  /* ===== PERMISSIONS ===== */
  const canRead =
    isAdmin || hasPermission("taskstatus_read");

  const canCreate =
    isAdmin || hasPermission("taskstatus_create");

  const canUpdate =
    isAdmin || hasPermission("taskstatus_update");

  const canDelete =
    isAdmin || hasPermission("taskstatus_delete");

  /* ================= FETCH ================= */
  const fetchStatuses = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/task-status"
      );
      setStatuses(res.data);
    } catch {
      toast({ title: "Error fetching statuses", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) fetchStatuses();
  }, [canRead]);

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;

    try {
      await axios.delete(
        `http://localhost:5000/api/task-status/${id}`
      );
      setStatuses(statuses.filter((s) => s._id !== id));
      toast({ title: "Status deleted", status: "success" });
    } catch {
      toast({ title: "Delete failed", status: "error" });
    }
  };

  /* ================= STATUS COLOR ================= */
  const getColor = (status) =>
    status === "ACTIVE" ? "green" : "red";

  /* ❌ NO READ PERMISSION */
  if (!canRead) {
    return (
      <Box p={6}>
        <Text fontSize="lg" color="red.500">
          ❌ You don't have permission to view this page
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      {/* HEADER */}
      <Flex justify="space-between" mb={4} align="center">
        <Heading size="lg" color="blue.700">
          Task Status
        </Heading>

        {/* ✅ SHOW ONLY IF CREATE PERMISSION */}
        {canCreate && (
          <Button
            colorScheme="blue"
            onClick={() =>
              navigate("/admin/task-status/create")
            }
          >
            + New Status
          </Button>
        )}
      </Flex>

      {/* TABLE */}
      <Box bg="white" p={4} borderRadius="md">
        {loading ? (
          <Spinner />
        ) : (
          <Table variant="simple">
            <Thead bg="gray.100">
              <Tr>
                <Th>#</Th>
                <Th>Status Name</Th>
                <Th>Status</Th>

                {/* ✅ Hide Actions column if no update/delete */}
                {(canUpdate || canDelete) && (
                  <Th textAlign="center">Actions</Th>
                )}
              </Tr>
            </Thead>

            <Tbody>
              {statuses.map((status, index) => (
                <Tr key={status._id}>
                  <Td>{index + 1}</Td>
                  <Td>{status.name}</Td>

                  <Td>
                    <Badge
                      colorScheme={getColor(status.status)}
                    >
                      {status.status}
                    </Badge>
                  </Td>

                  {/* ✅ SHOW ACTIONS ONLY IF ALLOWED */}
                  {(canUpdate || canDelete) && (
                    <Td textAlign="center">
                      <HStack justify="center">
                        {canUpdate && (
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/admin/task-status/edit/${status._id}`
                              )
                            }
                          >
                            ✏️
                          </Button>
                        )}

                        {canDelete && (
                          <Button
                            size="sm"
                            colorScheme="red"
                            onClick={() =>
                              handleDelete(status._id)
                            }
                          >
                            🗑
                          </Button>
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
    </Box>
  );
}
