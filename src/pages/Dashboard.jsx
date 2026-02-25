import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Text, Spinner, SimpleGrid,
  Badge, Avatar, VStack, HStack, Alert, AlertIcon,
  AlertDescription, CircularProgress, CircularProgressLabel,
  useColorModeValue,
} from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

// flexible matchers — handle any casing/spacing variation from DB
const isPending    = (name = "") => name.toLowerCase().includes("pending");
const isCompleted  = (name = "") => name.toLowerCase().includes("complet");
const isInProgress = (name = "") =>
  name.toLowerCase().includes("progress") ||
  name.toLowerCase().replace(/[\s_]+/g, "") === "inprogress";

const getStatusColor = (name = "") => {
  if (isCompleted(name))  return "green";
  if (isInProgress(name)) return "blue";
  if (isPending(name))    return "yellow";
  return "gray";
};

export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    staff: 0, tasks: 0, pending: 0, completed: 0, inProgress: 0, projects: 0,
  });
  const [recentTasks, setRecentTasks]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [errorMsg, setErrorMsg]           = useState("");
  const [staffTaskData, setStaffTaskData] = useState([]);
  const [monthlyData, setMonthlyData]     = useState([]);

  const displayName = user?.name || "User";
  const displayRole = user?.role?.name || "";

  const cardBg        = useColorModeValue("white", "gray.800");
  const textColor     = useColorModeValue("gray.800", "white");
  const subColor      = useColorModeValue("gray.500", "gray.400");
  const mutedColor    = useColorModeValue("gray.400", "gray.500");
  const borderColor   = useColorModeValue("#e5e7eb", "#4a5568");
  const rowHover      = useColorModeValue("blue.50", "gray.700");
  const rowHoverBdr   = useColorModeValue("blue.200", "blue.600");
  const progressBg    = useColorModeValue("gray.200", "gray.600");
  const progressInner = useColorModeValue("gray.50",  "gray.700");
  const chartGrid     = useColorModeValue("#f0f0f0",  "#4a5568");
  const chartText     = useColorModeValue("#374151",  "#e2e8f0");
  const isLight       = useColorModeValue(true, false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, tasksRes, projectsRes] = await Promise.all([
          api.get("/staff"),
          api.get("/tasks"),
          api.get("/projects"),
        ]);

        const allTasks = tasksRes.data    || [];
        const staff    = staffRes.data    || [];
        const projects = projectsRes.data || [];

        // only count regular tasks (not issues) for dashboard stats
        const tasks = allTasks.filter(t => t.type !== "issue");

        const pending    = tasks.filter(t => isPending(t.taskStatus?.name    || "")).length;
        const completed  = tasks.filter(t => isCompleted(t.taskStatus?.name  || "")).length;
        const inProgress = tasks.filter(t => isInProgress(t.taskStatus?.name || "")).length;

        // debug — remove after confirming fix
        console.log("Status sample:", tasks.slice(0, 5).map(t => t.taskStatus?.name));
        console.log({ pending, completed, inProgress });

        setStats({
          staff: staff.length,
          tasks: tasks.length,
          pending,
          completed,
          inProgress,
          projects: projects.length,
        });

        setRecentTasks(tasks.slice(0, 5));

        // staff breakdown
        const staffMap = {};
        tasks.forEach(task => {
          const name = task.assignee?.name;
          if (name) {
            if (!staffMap[name]) staffMap[name] = { pending: 0, completed: 0, inProgress: 0 };
            const sName = task.taskStatus?.name || "";
            if      (isPending(sName))    staffMap[name].pending++;
            else if (isCompleted(sName))  staffMap[name].completed++;
            else if (isInProgress(sName)) staffMap[name].inProgress++;
          }
        });
        setStaffTaskData(
          Object.entries(staffMap).map(([name, counts]) => ({ name, ...counts }))
        );

        // monthly breakdown
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const monthMap   = {};
        tasks.forEach(task => {
          const date       = new Date(task.createdAt);
          const monthIndex = date.getMonth();
          const key        = monthNames[monthIndex];
          if (!monthMap[monthIndex]) monthMap[monthIndex] = { month: key, total: 0, completed: 0 };
          monthMap[monthIndex].total++;
          if (isCompleted(task.taskStatus?.name || "")) monthMap[monthIndex].completed++;
        });
        setMonthlyData(
          Object.keys(monthMap)
            .sort((a, b) => Number(a) - Number(b))
            .map(key => monthMap[key])
        );

      } catch (err) {
        setErrorMsg("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const cards = [
    { label: "Total Staff",  value: stats.staff,      color: "#3b82f6", lightBg: "#eff6ff", darkBg: "#1e3a5f", hoverLight: "#dbeafe", hoverDark: "#1e40af22", emoji: "👥", sub: "Active members" },
    { label: "Total Tasks",  value: stats.tasks,      color: "#10b981", lightBg: "#ecfdf5", darkBg: "#1a3a2e", hoverLight: "#d1fae5", hoverDark: "#065f4622", emoji: "📋", sub: "All time tasks" },
    { label: "Pending",      value: stats.pending,    color: "#f59e0b", lightBg: "#fffbeb", darkBg: "#3a2e1a", hoverLight: "#fef3c7", hoverDark: "#92400e22", emoji: "⏳", sub: "Awaiting action" },
    { label: "Completed",    value: stats.completed,  color: "#8b5cf6", lightBg: "#f5f3ff", darkBg: "#2e1a3a", hoverLight: "#ede9fe", hoverDark: "#5b21b622", emoji: "✅", sub: "Tasks done" },
    { label: "In Progress",  value: stats.inProgress, color: "#ec4899", lightBg: "#fdf2f8", darkBg: "#3a1a2e", hoverLight: "#fce7f3", hoverDark: "#9d174d22", emoji: "🔄", sub: "Being worked on" },
    { label: "Projects",     value: stats.projects,   color: "#06b6d4", lightBg: "#ecfeff", darkBg: "#1a3038", hoverLight: "#cffafe", hoverDark: "#0e749122", emoji: "🗂️", sub: "Active projects" },
  ];

  const completionRate = stats.tasks > 0 ? Math.round((stats.completed  / stats.tasks) * 100) : 0;
  const pendingRate    = stats.tasks > 0 ? Math.round((stats.pending    / stats.tasks) * 100) : 0;
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
      <Flex bg="blue.500" p={6} borderRadius="xl" boxShadow="sm" mb={6}
        align="center" justify="space-between"
        bgGradient="linear(to-r, blue.600, blue.400)">
        <Box>
          <Heading size="md" color="white">👋 Welcome back, {displayName}!</Heading>
          <Text fontSize="sm" color="blue.100" mt={1}>
            {displayRole ? `${displayRole} · ` : ""}Here's your team's performance at a glance.
          </Text>
        </Box>
        <VStack spacing={0} align="center">
          <Avatar name={displayName} size="lg" bg="white" color="blue.500" />
          {displayRole && (
            <Badge mt={2} bg="whiteAlpha.300" color="white" fontSize="10px" borderRadius="full" px={2}>
              {displayRole}
            </Badge>
          )}
        </VStack>
      </Flex>

      {/* Stats Cards */}
      <SimpleGrid columns={{ base: 2, sm: 3, lg: 6 }} spacing={4} mb={6}>
        {cards.map(card => (
          <Box key={card.label}
            bg={isLight ? card.lightBg : card.darkBg}
            p={4} borderRadius="xl" boxShadow="sm"
            borderTop={`3px solid ${card.color}`}
            cursor="pointer" transition="all 0.2s"
            _hover={{ bg: isLight ? card.hoverLight : card.hoverDark, transform: "translateY(-4px)", boxShadow: "md" }}>
            <Text fontSize="2xl" mb={1}>{card.emoji}</Text>
            <Text fontSize="2xl" fontWeight="bold" color={textColor}>{card.value}</Text>
            <Text fontSize="xs" color={subColor} fontWeight="600">{card.label}</Text>
            <Text fontSize="xs" color={mutedColor}>{card.sub}</Text>
          </Box>
        ))}
      </SimpleGrid>

      {/* Charts Row */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>

        {/* Area Chart */}
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
          <Heading size="sm" color={textColor} mb={1}>📈 Monthly Task Overview</Heading>
          <Text fontSize="xs" color={mutedColor} mb={4}>Total vs Completed tasks per month</Text>
          {monthlyData.length === 0 ? (
            <Flex justify="center" align="center" h="200px" color={mutedColor}>
              <Text fontSize="sm">No data available yet</Text>
            </Flex>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartText }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartText }} />
                <Tooltip contentStyle={{ background: cardBg, borderColor: borderColor, color: textColor }} />
                <Legend />
                <Area type="monotone" dataKey="total"     stroke="#3b82f6" fill="url(#totalGrad)"     strokeWidth={2} name="Total" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#completedGrad)" strokeWidth={2} name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Box>

        {/* Circular Progress */}
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
          <Heading size="sm" color={textColor} mb={1}>🎯 Task Completion Rate</Heading>
          <Text fontSize="xs" color={mutedColor} mb={6}>Overall progress breakdown</Text>
          <SimpleGrid columns={3} spacing={4}>
            {[
              { rate: completionRate, color: "green.400",  label: "Completed",   count: stats.completed,  countColor: "green.500"  },
              { rate: inProgressRate, color: "blue.400",   label: "In Progress", count: stats.inProgress, countColor: "blue.500"   },
              { rate: pendingRate,    color: "yellow.400", label: "Pending",     count: stats.pending,    countColor: "yellow.500" },
            ].map(({ rate, color, label, count, countColor }) => (
              <Flex key={label} direction="column" align="center">
                <CircularProgress value={rate} color={color} size="90px" thickness="8px">
                  <CircularProgressLabel fontSize="sm" fontWeight="bold" color={textColor}>
                    {rate}%
                  </CircularProgressLabel>
                </CircularProgress>
                <Text fontSize="xs" color={subColor} mt={2} textAlign="center">{label}</Text>
                <Text fontSize="lg" fontWeight="bold" color={countColor}>{count}</Text>
              </Flex>
            ))}
          </SimpleGrid>

          <Box mt={6} p={4} bg={progressInner} borderRadius="lg">
            <Flex justify="space-between" mb={1}>
              <Text fontSize="xs" color={subColor}>Overall Completion</Text>
              <Text fontSize="xs" fontWeight="bold" color="green.500">{completionRate}%</Text>
            </Flex>
            <Box bg={progressBg} borderRadius="full" h="8px">
              <Box bg="green.400" borderRadius="full" h="8px"
                w={`${completionRate}%`} transition="width 0.5s" />
            </Box>
          </Box>
        </Box>
      </SimpleGrid>

      {/* Staff Bar Chart */}
      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm" mb={6}>
        <Heading size="sm" color={textColor} mb={1}>👤 Staff Task Breakdown</Heading>
        <Text fontSize="xs" color={mutedColor} mb={4}>Tasks per staff member by status</Text>
        {staffTaskData.length === 0 ? (
          <Flex justify="center" align="center" h="200px" color={mutedColor}>
            <Text fontSize="sm">No staff task data available</Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={staffTaskData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: chartText }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: chartText }} />
              <Tooltip contentStyle={{ background: cardBg, borderColor: borderColor, color: textColor }} />
              <Legend />
              <Bar dataKey="completed"  fill="#10b981" radius={[4,4,0,0]} name="Completed"   />
              <Bar dataKey="inProgress" fill="#3b82f6" radius={[4,4,0,0]} name="In Progress" />
              <Bar dataKey="pending"    fill="#f59e0b" radius={[4,4,0,0]} name="Pending"     />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>

      {/* Recent Tasks */}
      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
        <Heading size="sm" color={textColor} mb={4}>🕐 Recent Tasks</Heading>
        {recentTasks.length === 0 ? (
          <Flex direction="column" align="center" py={8} color={mutedColor}>
            <Text fontSize="3xl">📭</Text>
            <Text fontSize="sm" mt={2}>No tasks found</Text>
          </Flex>
        ) : (
          <VStack spacing={3} align="stretch">
            {recentTasks.map(task => (
              <Box key={task._id} p={4} borderRadius="lg"
                border={`1px solid ${borderColor}`} transition="all 0.2s"
                _hover={{ bg: rowHover, borderColor: rowHoverBdr, transform: "translateX(4px)", boxShadow: "sm" }}
                cursor="pointer">
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="600" fontSize="sm" color={textColor}>{task.name}</Text>
                    <HStack mt={1} spacing={2}>
                      <Text fontSize="xs" color={mutedColor} noOfLines={1}>{task.description}</Text>
                      {task.project?.name && (
                        <Badge fontSize="xs" colorScheme="cyan" borderRadius="full" px={2}>
                          🗂️ {task.project.name}
                        </Badge>
                      )}
                    </HStack>
                  </Box>
                  <HStack spacing={2}>
                    <Badge
                      colorScheme={getStatusColor(task.taskStatus?.name || "")}
                      fontSize="xs" borderRadius="full" px={2}
                    >
                      {task.taskStatus?.name || "N/A"}
                    </Badge>
                    <Avatar name={task.assignee?.name} size="xs" bg="blue.400" title={task.assignee?.name} />
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