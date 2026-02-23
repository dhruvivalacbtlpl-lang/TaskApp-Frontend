import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Text, Spinner, SimpleGrid,
  Badge, Avatar, VStack, HStack, Alert, AlertIcon,
  AlertDescription, CircularProgress, CircularProgressLabel,
} from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    staff: 0, tasks: 0, pending: 0, completed: 0, inProgress: 0, projects: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [staffTaskData, setStaffTaskData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, tasksRes, projectsRes] = await Promise.all([
          api.get("/staff"),
          api.get("/tasks"),
          api.get("/projects"),
        ]);

        const tasks = tasksRes.data || [];
        const staff = staffRes.data || [];
        const projects = projectsRes.data || [];

        const pending = tasks.filter(t => t.taskStatus?.name === "PENDING").length;
        const completed = tasks.filter(t => t.taskStatus?.name === "COMPLETED").length;
        const inProgress = tasks.filter(t => t.taskStatus?.name === "IN_PROGRESS").length;

        setStats({
          staff: staff.length,
          tasks: tasks.length,
          pending,
          completed,
          inProgress,
          projects: projects.length,
        });

        setRecentTasks(tasks.slice(0, 5));

        // Staff bar chart
        const staffMap = {};
        tasks.forEach((task) => {
          const name = task.assignee?.name;
          if (name) {
            if (!staffMap[name]) staffMap[name] = { pending: 0, completed: 0, inProgress: 0 };
            const status = task.taskStatus?.name;
            if (status === "PENDING") staffMap[name].pending++;
            else if (status === "COMPLETED") staffMap[name].completed++;
            else if (status === "IN_PROGRESS") staffMap[name].inProgress++;
          }
        });
        setStaffTaskData(
          Object.entries(staffMap).map(([name, counts]) => ({ name, ...counts }))
        );

        // ✅ Bug 3 fixed — correct month order
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthMap = {};
        tasks.forEach((task) => {
          const date = new Date(task.createdAt);
          const monthIndex = date.getMonth();
          const key = monthNames[monthIndex];
          if (!monthMap[monthIndex]) monthMap[monthIndex] = { month: key, total: 0, completed: 0 };
          monthMap[monthIndex].total++;
          if (task.taskStatus?.name === "COMPLETED") monthMap[monthIndex].completed++;
        });

        // ✅ Sort by month index so Jan always comes before Feb etc
        const sortedMonthly = Object.keys(monthMap)
          .sort((a, b) => Number(a) - Number(b))
          .map(key => monthMap[key]);
        setMonthlyData(sortedMonthly);

      } catch (err) {
        console.error("Dashboard fetch error:", err);
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
    { label: "Total Staff", value: stats.staff, color: "#3b82f6", bg: "#eff6ff", hoverBg: "#dbeafe", emoji: "👥", sub: "Active members" },
    { label: "Total Tasks", value: stats.tasks, color: "#10b981", bg: "#ecfdf5", hoverBg: "#d1fae5", emoji: "📋", sub: "All time tasks" },
    { label: "Pending", value: stats.pending, color: "#f59e0b", bg: "#fffbeb", hoverBg: "#fef3c7", emoji: "⏳", sub: "Awaiting action" },
    { label: "Completed", value: stats.completed, color: "#8b5cf6", bg: "#f5f3ff", hoverBg: "#ede9fe", emoji: "✅", sub: "Tasks done" },
    { label: "In Progress", value: stats.inProgress, color: "#ec4899", bg: "#fdf2f8", hoverBg: "#fce7f3", emoji: "🔄", sub: "Being worked on" },
    { label: "Projects", value: stats.projects, color: "#06b6d4", bg: "#ecfeff", hoverBg: "#cffafe", emoji: "🗂️", sub: "Active projects" },
  ];

  const completionRate = stats.tasks > 0 ? Math.round((stats.completed / stats.tasks) * 100) : 0;
  const pendingRate = stats.tasks > 0 ? Math.round((stats.pending / stats.tasks) * 100) : 0;
  const inProgressRate = stats.tasks > 0 ? Math.round((stats.inProgress / stats.tasks) * 100) : 0;

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

      {/* Welcome Header */}
      <Flex
        bg="white" p={6} borderRadius="xl" boxShadow="sm" mb={6}
        align="center" justify="space-between"
        bgGradient="linear(to-r, blue.600, blue.400)"
      >
        <Box>
          <Heading size="md" color="white">
            👋 Welcome back, {user?.name || "Admin"}!
          </Heading>
          <Text fontSize="sm" color="blue.100" mt={1}>
            Here's your team's performance at a glance.
          </Text>
        </Box>
        <Avatar name={user?.name} size="lg" bg="white" color="blue.500" />
      </Flex>

      {/* Stats Cards */}
      <SimpleGrid columns={{ base: 2, sm: 3, lg: 6 }} spacing={4} mb={6}>
        {cards.map((card) => (
          <Box
            key={card.label}
            bg={card.bg} p={4} borderRadius="xl" boxShadow="sm"
            borderTop={`3px solid ${card.color}`}
            cursor="pointer" transition="all 0.2s"
            _hover={{ bg: card.hoverBg, transform: "translateY(-4px)", boxShadow: "md" }}
          >
            <Text fontSize="2xl" mb={1}>{card.emoji}</Text>
            <Text fontSize="2xl" fontWeight="bold" color="gray.700">{card.value}</Text>
            <Text fontSize="xs" color="gray.500" fontWeight="600">{card.label}</Text>
            <Text fontSize="xs" color="gray.400">{card.sub}</Text>
          </Box>
        ))}
      </SimpleGrid>

      {/* Area Chart + Circular Progress */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
        <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
          <Heading size="sm" color="gray.700" mb={1}>📈 Monthly Task Overview</Heading>
          <Text fontSize="xs" color="gray.400" mb={4}>Total vs Completed tasks per month</Text>
          {monthlyData.length === 0 ? (
            <Flex justify="center" align="center" h="200px" color="gray.400">
              <Text fontSize="sm">No data available yet</Text>
            </Flex>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="total" stroke="#3b82f6"
                  fill="url(#totalGrad)" strokeWidth={2} name="Total" />
                <Area type="monotone" dataKey="completed" stroke="#10b981"
                  fill="url(#completedGrad)" strokeWidth={2} name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Box>

        <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
          <Heading size="sm" color="gray.700" mb={1}>🎯 Task Completion Rate</Heading>
          <Text fontSize="xs" color="gray.400" mb={6}>Overall progress breakdown</Text>
          <SimpleGrid columns={3} spacing={4}>
            <Flex direction="column" align="center">
              <CircularProgress value={completionRate} color="green.400" size="90px" thickness="8px">
                <CircularProgressLabel fontSize="sm" fontWeight="bold">{completionRate}%</CircularProgressLabel>
              </CircularProgress>
              <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">Completed</Text>
              <Text fontSize="lg" fontWeight="bold" color="green.500">{stats.completed}</Text>
            </Flex>
            <Flex direction="column" align="center">
              <CircularProgress value={inProgressRate} color="blue.400" size="90px" thickness="8px">
                <CircularProgressLabel fontSize="sm" fontWeight="bold">{inProgressRate}%</CircularProgressLabel>
              </CircularProgress>
              <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">In Progress</Text>
              <Text fontSize="lg" fontWeight="bold" color="blue.500">{stats.inProgress}</Text>
            </Flex>
            <Flex direction="column" align="center">
              <CircularProgress value={pendingRate} color="yellow.400" size="90px" thickness="8px">
                <CircularProgressLabel fontSize="sm" fontWeight="bold">{pendingRate}%</CircularProgressLabel>
              </CircularProgress>
              <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">Pending</Text>
              <Text fontSize="lg" fontWeight="bold" color="yellow.500">{stats.pending}</Text>
            </Flex>
          </SimpleGrid>

          <Box mt={6} p={4} bg="gray.50" borderRadius="lg">
            <Flex justify="space-between" mb={1}>
              <Text fontSize="xs" color="gray.500">Overall Completion</Text>
              <Text fontSize="xs" fontWeight="bold" color="green.500">{completionRate}%</Text>
            </Flex>
            <Box bg="gray.200" borderRadius="full" h="8px">
              <Box bg="green.400" borderRadius="full" h="8px"
                w={`${completionRate}%`} transition="width 0.5s" />
            </Box>
          </Box>
        </Box>
      </SimpleGrid>

      {/* Staff Bar Chart */}
      <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" mb={6}>
        <Heading size="sm" color="gray.700" mb={1}>👤 Staff Task Breakdown</Heading>
        <Text fontSize="xs" color="gray.400" mb={4}>Tasks per staff member by status</Text>
        {staffTaskData.length === 0 ? (
          <Flex justify="center" align="center" h="200px" color="gray.400">
            <Text fontSize="sm">No staff task data available</Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={staffTaskData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
              <Bar dataKey="inProgress" fill="#3b82f6" radius={[4, 4, 0, 0]} name="In Progress" />
              <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>

      {/* Recent Tasks */}
      <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
        <Heading size="sm" color="gray.700" mb={4}>🕐 Recent Tasks</Heading>
        {recentTasks.length === 0 ? (
          <Flex direction="column" align="center" py={8} color="gray.400">
            <Text fontSize="3xl">📭</Text>
            <Text fontSize="sm" mt={2}>No tasks found</Text>
          </Flex>
        ) : (
          <VStack spacing={3} align="stretch">
            {recentTasks.map((task) => (
              <Box key={task._id} p={4} borderRadius="lg"
                border="1px solid #e5e7eb" transition="all 0.2s"
                _hover={{ bg: "blue.50", borderColor: "blue.200",
                  transform: "translateX(4px)", boxShadow: "sm" }}
                cursor="pointer"
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="600" fontSize="sm" color="gray.700">
                      {task.name}
                    </Text>
                    <HStack mt={1} spacing={2}>
                      <Text fontSize="xs" color="gray.400" noOfLines={1}>
                        {task.description}
                      </Text>
                      {task.project?.name && (
                        <Badge fontSize="xs" colorScheme="cyan"
                          borderRadius="full" px={2}>
                          🗂️ {task.project.name}
                        </Badge>
                      )}
                    </HStack>
                  </Box>
                  <HStack spacing={2}>
                    <Badge colorScheme={getStatusColor(task.taskStatus?.name)}
                      fontSize="xs" borderRadius="full" px={2}>
                      {task.taskStatus?.name || "N/A"}
                    </Badge>
                    <Avatar name={task.assignee?.name} size="xs"
                      bg="blue.400" title={task.assignee?.name} />
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