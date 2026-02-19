import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Text, Spinner, SimpleGrid,
  Badge, Avatar, VStack, HStack, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import { MdPeople, MdCheckBox, MdVpnKey, MdLabel } from "react-icons/md";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    staff: 0, tasks: 0, roles: 0, taskStatuses: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, tasksRes, rolesRes, statusRes] = await Promise.all([
          axios.get("/staff"),
          axios.get("/tasks"),
          axios.get("/role"),
          axios.get("/task-status"),
        ]);
        setStats({
          staff: staffRes.data.length,
          tasks: tasksRes.data.length,
          roles: rolesRes.data.length,
          taskStatuses: statusRes.data.length,
        });
        setRecentTasks(tasksRes.data.slice(0, 5));
      } catch (err) {
        setErrorMsg("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusColor = (name) => {
    switch (name) {
      case "COMPLETED": return "green";
      case "IN_PROGRESS": return "blue";
      case "PENDING": return "yellow";
      default: return "gray";
    }
  };

  const cards = [
    { label: "Total Staff", value: stats.staff, icon: MdPeople, color: "#3b82f6", bg: "#eff6ff" },
    { label: "Total Tasks", value: stats.tasks, icon: MdCheckBox, color: "#10b981", bg: "#ecfdf5" },
    { label: "Total Roles", value: stats.roles, icon: MdVpnKey, color: "#f59e0b", bg: "#fffbeb" },
    { label: "Task Statuses", value: stats.taskStatuses, icon: MdLabel, color: "#8b5cf6", bg: "#f5f3ff" },
  ];

  if (loading) {
    return (
      <Flex justify="center" align="center" h="60vh">
        <Spinner size="xl" color="blue.500" thickness="3px" />
      </Flex>
    );
  }

  return (
    <Box>
      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* ✅ Welcome Header */}
      <Flex
        bg="white" p={6} borderRadius="md" boxShadow="sm"
        mb={6} align="center" justify="space-between"
      >
        <Box>
          <Heading size="md" color="gray.700">
            Welcome back, {user?.name || "Admin"}
          </Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Here's what's happening with your team today.
          </Text>
        </Box>
        <Avatar name={user?.name} size="md" bg="blue.500" />
      </Flex>

      {/* ✅ Stats Cards */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={6}>
        {cards.map((card) => (
          <Box
            key={card.label}
            bg="white" p={5} borderRadius="md" boxShadow="sm"
            borderLeft={`4px solid ${card.color}`}
          >
            <Flex justify="space-between" align="center">
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="600" textTransform="uppercase">
                  {card.label}
                </Text>
                <Text fontSize="3xl" fontWeight="bold" color="gray.700" mt={1}>
                  {card.value}
                </Text>
              </Box>
              <Box bg={card.bg} p={3} borderRadius="full">
                <card.icon size={24} color={card.color} />
              </Box>
            </Flex>
          </Box>
        ))}
      </SimpleGrid>

      {/* ✅ Recent Tasks */}
      <Box bg="white" p={6} borderRadius="md" boxShadow="sm">
        <Heading size="sm" color="gray.700" mb={4}>Recent Tasks</Heading>
        {recentTasks.length === 0 ? (
          <Text color="gray.400" textAlign="center" py={6} fontSize="sm">
            No tasks found
          </Text>
        ) : (
          <VStack spacing={3} align="stretch">
            {recentTasks.map((task) => (
              <Box
                key={task._id} p={4} borderRadius="md"
                border="1px solid #e5e7eb" _hover={{ bg: "gray.50" }}
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="600" fontSize="sm" color="gray.700">
                      {task.name}
                    </Text>
                    <Text fontSize="xs" color="gray.400" mt={1}>
                      {task.description}
                    </Text>
                  </Box>
                  <HStack spacing={2}>
                    <Badge colorScheme={getStatusColor(task.taskStatus?.name)} fontSize="xs">
                      {task.taskStatus?.name || "N/A"}
                    </Badge>
                    <Avatar
                      name={task.assignee?.name}
                      size="xs" bg="blue.400"
                      title={task.assignee?.name}
                    />
                  </HStack>
                </Flex>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}