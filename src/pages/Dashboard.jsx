import { useEffect, useState, useCallback } from "react";
import {
  Box, Flex, Heading, Text, Spinner, SimpleGrid,
  Badge, Avatar, VStack, HStack, Alert, AlertIcon,
  AlertDescription, CircularProgress, CircularProgressLabel,
  useColorModeValue, Button, IconButton, Tooltip, Progress,
} from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { MdClose, MdFolder, MdOpenInNew, MdArrowForward } from "react-icons/md";
import { useNavigate } from "react-router-dom";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const isPending    = (n = "") => n?.toLowerCase().includes("pending");
const isCompleted  = (n = "") => n?.toLowerCase().includes("complet");
const isInProgress = (n = "") =>
  n?.toLowerCase().includes("progress") ||
  n?.toLowerCase().replace(/[\s_]+/g, "") === "inprogress";

const getStatusColor = (n = "") => {
  if (isCompleted(n))  return "green";
  if (isInProgress(n)) return "brand";
  if (isPending(n))    return "yellow";
  return "gray";
};

const PROJECT_COLORS = [
  "#6366f1","#10b981","#f59e0b","#ec4899","#3b82f6",
  "#8b5cf6","#06b6d4","#f97316","#84cc16","#14b8a6",
];

export default function Dashboard() {
  const { user, selectedProject, selectProject } = useAuth();
  const navigate = useNavigate();

  const [allTasks,         setAllTasks]        = useState([]);
  const [allProjects,      setAllProjects]     = useState([]);
  const [stats,            setStats]           = useState({ staff:0, tasks:0, pending:0, completed:0, inProgress:0, projects:0, documents:0 });
  const [recentTasks,      setRecentTasks]     = useState([]);
  const [staffTaskData,    setStaffTaskData]   = useState([]);
  const [monthlyData,      setMonthlyData]     = useState([]);
  const [projectTaskData, setProjectTaskData] = useState([]);
  const [projectPieData,  setProjectPieData]  = useState([]);
  const [loading,          setLoading]         = useState(true);
  const [errorMsg,         setErrorMsg]        = useState("");
  const [activeProject,    setActiveProject]   = useState(null);

  // Use Optional Chaining for safe display
  const displayName = user?.name || "User";
  const displayRole = user?.role?.name || "";

  const cardBg        = useColorModeValue("white",      "gray.800");
  const textColor     = useColorModeValue("gray.800",   "white");
  const subColor      = useColorModeValue("gray.500",   "gray.400");
  const mutedColor    = useColorModeValue("gray.400",   "gray.500");
  const borderColor   = useColorModeValue("#e5e7eb",    "#4a5568");
  const rowHover      = useColorModeValue("brand.50",   "gray.700");
  const rowHoverBdr   = useColorModeValue("brand.200", "brand.600");
  const progressBg    = useColorModeValue("gray.200",   "gray.600");
  const progressInner = useColorModeValue("gray.50",    "gray.700");
  const chartGrid     = useColorModeValue("#f0f0f0",    "#4a5568");
  const chartText     = useColorModeValue("#374151",    "#e2e8f0");
  const filterBg      = useColorModeValue("brand.50",   "brand.900");
  const filterBdr     = useColorModeValue("brand.300", "brand.500");
  const isLight       = useColorModeValue(true, false);

  /* ── Compute helpers ───────────────────────────────────────────────────── */
  const computeStats = useCallback((tasks = [], staffCount, projectCount, docCount) => {
    setStats(prev => ({
      staff:      staffCount   ?? prev.staff,
      projects:   projectCount ?? prev.projects,
      documents:  docCount     ?? prev.documents,
      tasks:      tasks?.length || 0,
      pending:    tasks?.filter(t => isPending(t.taskStatus?.name)).length || 0,
      completed:  tasks?.filter(t => isCompleted(t.taskStatus?.name)).length || 0,
      inProgress: tasks?.filter(t => isInProgress(t.taskStatus?.name)).length || 0,
    }));
  }, []);

  const computeStaffChart = useCallback((tasks = []) => {
    const map = {};
    tasks.forEach(t => {
      const n = t.assignee?.name; if (!n) return;
      if (!map[n]) map[n] = { pending:0, completed:0, inProgress:0 };
      const s = t.taskStatus?.name || "";
      if      (isPending(s))    map[n].pending++;
      else if (isCompleted(s))  map[n].completed++;
      else if (isInProgress(s)) map[n].inProgress++;
    });
    setStaffTaskData(Object.entries(map).map(([name, c]) => ({ name, ...c })));
  }, []);

  const computeMonthlyChart = useCallback((tasks = []) => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const map = {};
    tasks.forEach(t => {
      const m = new Date(t.createdAt).getMonth();
      if (!map[m]) map[m] = { month:months[m], total:0, completed:0 };
      map[m].total++;
      if (isCompleted(t.taskStatus?.name || "")) map[m].completed++;
    });
    setMonthlyData(Object.keys(map).sort((a,b) => +a - +b).map(k => map[k]));
  }, []);

  const computeProjectCharts = useCallback((tasks = []) => {
    const map = {};
    tasks.forEach(t => {
      const n = t.project?.name || "No Project";
      if (!map[n]) map[n] = { name:n, total:0, completed:0, inProgress:0, pending:0 };
      map[n].total++;
      const s = t.taskStatus?.name || "";
      if      (isCompleted(s))  map[n].completed++;
      else if (isInProgress(s)) map[n].inProgress++;
      else if (isPending(s))    map[n].pending++;
    });
    const vals = Object.values(map);
    setProjectTaskData(vals);
    setProjectPieData(vals.map((p, i) => ({
      name: p.name, value: p.total, color: PROJECT_COLORS[i % PROJECT_COLORS.length],
    })));
  }, []);

  /* ── Fetch all data once ───────────────────────────────────────────────── */
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const [staffRes, tasksRes, projectsRes, docsRes] = await Promise.all([
          api.get("/staff"),
          api.get("/tasks"),
          api.get("/projects"),
          api.get("/documents").catch(() => ({ data: [] })),
        ]);

        if (!isMounted) return;

        const tasks    = (tasksRes?.data || []).filter(t => t.type !== "issue");
        const staff    = staffRes?.data || [];
        const projects = projectsRes?.data || [];
        const docs     = Array.isArray(docsRes?.data) ? docsRes.data : [];

        setAllTasks(tasks);
        setAllProjects(projects);
        computeStats(tasks, staff.length, projects.length, docs.length);
        computeStaffChart(tasks);
        computeMonthlyChart(tasks);
        computeProjectCharts(tasks);
        setRecentTasks(tasks.slice(0, 5));
      } catch (err) {
        if (isMounted) setErrorMsg("Failed to load dashboard data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => { isMounted = false; };
  }, [computeStats, computeStaffChart, computeMonthlyChart, computeProjectCharts]);

  /* ── Derived rates ─────────────────────────────────────────────────────── */
  const completionRate = stats.tasks > 0 ? Math.round((stats.completed / stats.tasks) * 100) : 0;
  const pendingRate    = stats.tasks > 0 ? Math.round((stats.pending    / stats.tasks) * 100) : 0;
  const inProgressRate = stats.tasks > 0 ? Math.round((stats.inProgress / stats.tasks) * 100) : 0;

  const cards = [
    { label:"Total Staff",  value:stats.staff,      color:"#3b82f6", lightBg:"#eff6ff", darkBg:"#1e3a5f", hoverLight:"#dbeafe", hoverDark:"#1e40af22", emoji:"👥", sub:"Active members"   },
    { label:"Total Tasks",  value:stats.tasks,      color:"#10b981", lightBg:"#ecfdf5", darkBg:"#1a3a2e", hoverLight:"#d1fae5", hoverDark:"#065f4622", emoji:"📋", sub: activeProject ? `In ${activeProject.name}` : "All tasks" },
    { label:"Pending",      value:stats.pending,    color:"#f59e0b", lightBg:"#fffbeb", darkBg:"#3a2e1a", hoverLight:"#fef3c7", hoverDark:"#92400e22", emoji:"⏳", sub:"Awaiting action"  },
    { label:"Completed",    value:stats.completed,  color:"#8b5cf6", lightBg:"#f5f3ff", darkBg:"#2e1a3a", hoverLight:"#ede9fe", hoverDark:"#5b21b622", emoji:"✅", sub:"Tasks done"        },
    { label:"In Progress",  value:stats.inProgress, color:"#ec4899", lightBg:"#fdf2f8", darkBg:"#3a1a2e", hoverLight:"#fce7f3", hoverDark:"#9d174d22", emoji:"🔄", sub:"Being worked on"   },
    { label:"Documents",    value:stats.documents,  color:"#06b6d4", lightBg:"#ecfeff", darkBg:"#1a3038", hoverLight:"#cffafe", hoverDark:"#0e749122", emoji:"📄", sub:"Total docs"       },
  ];

  if (loading) return (
    <Flex justify="center" align="center" h="60vh">
      <Spinner size="xl" color="brand.500" thickness="3px"/>
    </Flex>
  );

  return (
    <Box>
      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon/><AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* ── Welcome Banner ─────────────────────────────────────────────── */}
      <Flex p={6} borderRadius="xl" boxShadow="sm" mb={6} align="center" justify="space-between"
        style={{ background:`linear-gradient(to right, #6d28d9, #7c3aed)` }}>
        <Box>
          <Heading size="md" color="white">👋 Welcome, {displayName}!</Heading>
          <Text fontSize="sm" color="whiteAlpha.800" mt={1}>
            {user?.company?.name ? `${user.company.name} Dashboard` : "Organization Overview"}
          </Text>
        </Box>
        <Avatar name={displayName} size="lg" bg="white" color="brand.500"/>
      </Flex>

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <SimpleGrid columns={{ base:2, sm:3, lg:6 }} spacing={4} mb={6}>
        {cards.map(card => (
          <Box key={card.label} bg={isLight ? card.lightBg : card.darkBg} p={4} borderRadius="xl" borderTop={`3px solid ${card.color}`}>
             <Text fontSize="2xl" mb={1}>{card.emoji}</Text>
             <Text fontSize="2xl" fontWeight="bold" color={textColor}>{card.value}</Text>
             <Text fontSize="xs" color={subColor} fontWeight="600">{card.label}</Text>
          </Box>
        ))}
      </SimpleGrid>

      {/* ── Project Breakdown Charts ── */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
            <Heading size="sm" mb={4}>Project Distribution</Heading>
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie data={projectPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {projectPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <RTooltip />
                </PieChart>
            </ResponsiveContainer>
        </Box>
        
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
          <Heading size="sm" mb={4}>Task Status Breakdown</Heading>
          <VStack spacing={4} align="stretch">
            <Box>
                <Text fontSize="xs" mb={1}>Completion Rate: {completionRate}%</Text>
                <Progress value={completionRate} colorScheme="green" size="sm" borderRadius="full" />
            </Box>
            <Box>
                <Text fontSize="xs" mb={1}>In Progress: {inProgressRate}%</Text>
                <Progress value={inProgressRate} colorScheme="blue" size="sm" borderRadius="full" />
            </Box>
          </VStack>
        </Box>
      </SimpleGrid>
      
      {/* ── Recent Tasks List ── */}
      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
        <Heading size="sm" mb={4}>🕐 Recent Tasks</Heading>
        <VStack align="stretch" spacing={3}>
            {recentTasks.length > 0 ? recentTasks.map(task => (
                <HStack key={task._id} justify="space-between" p={3} border="1px solid" borderColor={borderColor} borderRadius="lg">
                    <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="sm">{task.name}</Text>
                        <Text fontSize="xs" color={subColor}>{task.project?.name || "No Project"}</Text>
                    </VStack>
                    <Badge colorScheme={getStatusColor(task.taskStatus?.name)}>{task.taskStatus?.name}</Badge>
                </HStack>
            )) : <Text color={mutedColor}>No recent tasks</Text>}
        </VStack>
      </Box>
    </Box>
  );
}