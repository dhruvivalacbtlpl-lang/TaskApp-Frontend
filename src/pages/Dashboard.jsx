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
const isPending    = (n = "") => n.toLowerCase().includes("pending");
const isCompleted  = (n = "") => n.toLowerCase().includes("complet");
const isInProgress = (n = "") =>
  n.toLowerCase().includes("progress") ||
  n.toLowerCase().replace(/[\s_]+/g, "") === "inprogress";

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

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user, selectedProject, selectProject } = useAuth();
  const navigate = useNavigate();

  const [allTasks,        setAllTasks]        = useState([]);
  const [allProjects,     setAllProjects]     = useState([]);
  const [stats,           setStats]           = useState({ staff:0, tasks:0, pending:0, completed:0, inProgress:0, projects:0, documents:0 });
  const [recentTasks,     setRecentTasks]     = useState([]);
  const [staffTaskData,   setStaffTaskData]   = useState([]);
  const [monthlyData,     setMonthlyData]     = useState([]);
  const [projectTaskData, setProjectTaskData] = useState([]);
  const [projectPieData,  setProjectPieData]  = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [errorMsg,        setErrorMsg]        = useState("");
  const [activeProject,   setActiveProject]   = useState(null);

  const displayName = user?.name || "User";
  const displayRole = user?.role?.name || "";

  const cardBg        = useColorModeValue("white",     "gray.800");
  const textColor     = useColorModeValue("gray.800",  "white");
  const subColor      = useColorModeValue("gray.500",  "gray.400");
  const mutedColor    = useColorModeValue("gray.400",  "gray.500");
  const borderColor   = useColorModeValue("#e5e7eb",   "#4a5568");
  const rowHover      = useColorModeValue("brand.50",  "gray.700");
  const rowHoverBdr   = useColorModeValue("brand.200", "brand.600");
  const progressBg    = useColorModeValue("gray.200",  "gray.600");
  const progressInner = useColorModeValue("gray.50",   "gray.700");
  const chartGrid     = useColorModeValue("#f0f0f0",   "#4a5568");
  const chartText     = useColorModeValue("#374151",   "#e2e8f0");
  const filterBg      = useColorModeValue("brand.50",  "brand.900");
  const filterBdr     = useColorModeValue("brand.300", "brand.500");
  const isLight       = useColorModeValue(true, false);

  /* ── Compute helpers ───────────────────────────────────────────────────── */
  const computeStats = useCallback((tasks, staffCount, projectCount, docCount) => {
    setStats(prev => ({
      staff:      staffCount   ?? prev.staff,
      projects:   projectCount ?? prev.projects,
      documents:  docCount     ?? prev.documents,
      tasks:      tasks.length,
      pending:    tasks.filter(t => isPending(t.taskStatus?.name    || "")).length,
      completed:  tasks.filter(t => isCompleted(t.taskStatus?.name  || "")).length,
      inProgress: tasks.filter(t => isInProgress(t.taskStatus?.name || "")).length,
    }));
  }, []);

  const computeStaffChart = useCallback((tasks) => {
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

  const computeMonthlyChart = useCallback((tasks) => {
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

  const computeProjectCharts = useCallback((tasks) => {
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
    const run = async () => {
      try {
        const [staffRes, tasksRes, projectsRes, docsRes] = await Promise.all([
          api.get("/staff"),
          api.get("/tasks"),
          api.get("/projects"),
          api.get("/documents").catch(() => ({ data: [] })),
        ]);

        const tasks    = (tasksRes.data    || []).filter(t => t.type !== "issue");
        const staff    = staffRes.data    || [];
        const projects = projectsRes.data || [];
        const docs     = Array.isArray(docsRes.data) ? docsRes.data : [];

        setAllTasks(tasks);
        setAllProjects(projects);
        computeStats(tasks, staff.length, projects.length, docs.length);
        computeStaffChart(tasks);
        computeMonthlyChart(tasks);
        computeProjectCharts(tasks);
        setRecentTasks(tasks.slice(0, 5));
      } catch {
        setErrorMsg("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []); // eslint-disable-line

  /* ── Sync navbar selectedProject → highlight + filter dashboard ────────── */
  useEffect(() => {
    if (!allProjects.length) return;
    if (selectedProject?._id) {
      const found = allProjects.find(p => p._id === selectedProject._id);
      if (found) setActiveProject(found);
    } else {
      setActiveProject(null);
    }
  }, [selectedProject, allProjects]);

  /* ── Recompute when activeProject changes ──────────────────────────────── */
  useEffect(() => {
    if (!allTasks.length) return;
    const filtered = activeProject
      ? allTasks.filter(t => (t.project?._id ?? t.project) === activeProject._id)
      : allTasks;
    computeStats(filtered, null, null, null);
    computeStaffChart(filtered);
    computeMonthlyChart(filtered);
    setRecentTasks(filtered.slice(0, 5));
  }, [activeProject, allTasks]); // eslint-disable-line

  /* ── Project card click — toggle filter + sync to navbar ──────────────── */
  const handleProjectClick = (project) => {
    if (activeProject?._id === project._id) {
      setActiveProject(null);
      selectProject("");
    } else {
      setActiveProject(project);
      selectProject(project);
    }
  };

  /* ── Stat card navigation map ──────────────────────────────────────────── */
  const cardNavMap = {
    "Total Staff":  "/admin/staff",
    "Total Tasks":  "/admin/tasks",
    "Pending":      "/admin/tasks",
    "Completed":    "/admin/tasks",
    "In Progress":  "/admin/tasks",
    "Documents":    "/admin/documents",
  };

  /* ── Derived rates ─────────────────────────────────────────────────────── */
  const completionRate = stats.tasks > 0 ? Math.round((stats.completed  / stats.tasks) * 100) : 0;
  const pendingRate    = stats.tasks > 0 ? Math.round((stats.pending    / stats.tasks) * 100) : 0;
  const inProgressRate = stats.tasks > 0 ? Math.round((stats.inProgress / stats.tasks) * 100) : 0;

  const cards = [
    { label:"Total Staff",  value:stats.staff,      color:"#3b82f6", lightBg:"#eff6ff", darkBg:"#1e3a5f", hoverLight:"#dbeafe", hoverDark:"#1e40af22", emoji:"👥", sub:"Active members"   },
    { label:"Total Tasks",  value:stats.tasks,      color:"#10b981", lightBg:"#ecfdf5", darkBg:"#1a3a2e", hoverLight:"#d1fae5", hoverDark:"#065f4622", emoji:"📋", sub: activeProject ? `In ${activeProject.name}` : "All time tasks" },
    { label:"Pending",      value:stats.pending,    color:"#f59e0b", lightBg:"#fffbeb", darkBg:"#3a2e1a", hoverLight:"#fef3c7", hoverDark:"#92400e22", emoji:"⏳", sub:"Awaiting action"  },
    { label:"Completed",    value:stats.completed,  color:"#8b5cf6", lightBg:"#f5f3ff", darkBg:"#2e1a3a", hoverLight:"#ede9fe", hoverDark:"#5b21b622", emoji:"✅", sub:"Tasks done"        },
    { label:"In Progress",  value:stats.inProgress, color:"#ec4899", lightBg:"#fdf2f8", darkBg:"#3a1a2e", hoverLight:"#fce7f3", hoverDark:"#9d174d22", emoji:"🔄", sub:"Being worked on"   },
    { label:"Documents",    value:stats.documents,  color:"#06b6d4", lightBg:"#ecfeff", darkBg:"#1a3038", hoverLight:"#cffafe", hoverDark:"#0e749122", emoji:"📄", sub:"Total documents"   },
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
        style={{ background:`linear-gradient(to right, ${import.meta.env.VITE_PRIMARY_HOVER||"#6d28d9"}, ${import.meta.env.VITE_PRIMARY_COLOR||"#7c3aed"})` }}>
        <Box>
          <Heading size="md" color="white">👋 Welcome back, {displayName}!</Heading>
          <Text fontSize="sm" color="whiteAlpha.800" mt={1}>
            {displayRole ? `${displayRole} · ` : ""}Here's your team's performance at a glance.
          </Text>
        </Box>
        <VStack spacing={0} align="center">
          <Avatar name={displayName} size="lg" bg="white" color="brand.500"/>
          {displayRole && (
            <Badge mt={2} bg="whiteAlpha.300" color="white" fontSize="10px" borderRadius="full" px={2}>
              {displayRole}
            </Badge>
          )}
        </VStack>
      </Flex>

      {/* ── Active Filter Banner ────────────────────────────────────────── */}
      {activeProject && (
        <Flex align="center" justify="space-between" mb={4} px={4} py={3}
          bg={filterBg} borderRadius="xl" border="1px solid" borderColor={filterBdr}>
          <HStack spacing={2} flexWrap="wrap">
            <MdFolder size={16} color="#7c3aed"/>
            <Text fontSize="sm" fontWeight="600" color={textColor}>Filtering by:</Text>
            <Badge colorScheme="brand" borderRadius="full" px={3} fontSize="sm">
              {activeProject.name}
            </Badge>
            <Text fontSize="xs" color={subColor}>
              — stats, charts and tasks reflect this project only
            </Text>
          </HStack>
          <Tooltip label="Clear filter">
            <IconButton icon={<MdClose/>} size="xs" variant="ghost" colorScheme="brand"
              aria-label="clear" onClick={() => { setActiveProject(null); selectProject(""); }}/>
          </Tooltip>
        </Flex>
      )}

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <SimpleGrid columns={{ base:2, sm:3, lg:6 }} spacing={4} mb={6}>
        {cards.map(card => {
          const dest = cardNavMap[card.label];
          return (
            <Tooltip key={card.label} label={dest ? `Click to go to ${card.label}` : ""} hasArrow>
              <Box
                bg={isLight ? card.lightBg : card.darkBg}
                p={4} borderRadius="xl" boxShadow="sm"
                borderTop={`3px solid ${card.color}`}
                cursor={dest ? "pointer" : "default"}
                transition="all 0.2s" position="relative" role="group"
                _hover={dest ? { bg:isLight ? card.hoverLight : card.hoverDark, transform:"translateY(-4px)", boxShadow:"md" } : {}}
                onClick={() => dest && navigate(dest)}>
                <Text fontSize="2xl" mb={1}>{card.emoji}</Text>
                <Text fontSize="2xl" fontWeight="bold" color={textColor}>{card.value}</Text>
                <Text fontSize="xs" color={subColor} fontWeight="600">{card.label}</Text>
                <Text fontSize="xs" color={mutedColor}>{card.sub}</Text>
                {dest && (
                  <Box position="absolute" top={3} right={3}
                    opacity={0} _groupHover={{ opacity:1 }} transition="opacity 0.2s">
                    <MdArrowForward size={13} color={card.color}/>
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })}
      </SimpleGrid>

      {/* ── Projects Grid ───────────────────────────────────────────────── */}
      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm" mb={6}>
        <Flex justify="space-between" align="center" mb={4}>
          <Box>
            <Heading size="sm" color={textColor}>🗂️ Projects</Heading>
            <Text fontSize="xs" color={mutedColor} mt={0.5}>
              Click a card to filter the dashboard · selecting from the navbar also highlights here
            </Text>
          </Box>
          <Button size="xs" variant="outline" colorScheme="brand"
            rightIcon={<MdOpenInNew size={11}/>} onClick={() => navigate("/admin/projects")}>
            View All
          </Button>
        </Flex>

        {allProjects.length === 0 ? (
          <Flex justify="center" align="center" h="80px" color={mutedColor}>
            <Text fontSize="sm">No projects found</Text>
          </Flex>
        ) : (
          <SimpleGrid columns={{ base:1, sm:2, md:3 }} spacing={3}>
            {allProjects.slice(0, 6).map((project, i) => {
              const pt       = allTasks.filter(t => (t.project?._id ?? t.project) === project._id);
              const done     = pt.filter(t => isCompleted(t.taskStatus?.name || "")).length;
              const progress = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0;
              const isActive = activeProject?._id === project._id;
              const accent   = PROJECT_COLORS[i % PROJECT_COLORS.length];

              return (
                <Box key={project._id} p={4} borderRadius="xl" cursor="pointer"
                  border="2px solid"
                  borderColor={isActive ? accent : borderColor}
                  bg={isActive ? (isLight ? "#f5f3ff" : "#2e1a3a") : cardBg}
                  transition="all 0.2s"
                  boxShadow={isActive ? `0 0 0 3px ${accent}33` : "sm"}
                  _hover={{ borderColor: accent, transform:"translateY(-2px)", boxShadow:"md" }}
                  onClick={() => handleProjectClick(project)}>

                  <Flex justify="space-between" align="flex-start" mb={3}>
                    <HStack spacing={2}>
                      <Box w="10px" h="10px" borderRadius="full" bg={accent} mt="2px" flexShrink={0}/>
                      <Text fontWeight="700" fontSize="sm" color={textColor} noOfLines={1}>
                        {project.name}
                      </Text>
                    </HStack>
                    {isActive && (
                      <Badge colorScheme="brand" fontSize="9px" borderRadius="full" px={2}>
                        Active
                      </Badge>
                    )}
                  </Flex>

                  {project.description && (
                    <Text fontSize="xs" color={subColor} noOfLines={2} mb={3}>
                      {project.description}
                    </Text>
                  )}

                  <HStack spacing={4} mb={3}>
                    {[
                      { val:pt.length,       label:"Tasks", color:textColor    },
                      { val:done,            label:"Done",  color:"green.500"  },
                      { val:pt.length - done,label:"Left",  color:"orange.400" },
                    ].map(({ val, label, color }) => (
                      <VStack key={label} spacing={0} align="center">
                        <Text fontSize="lg" fontWeight="bold" color={color}>{val}</Text>
                        <Text fontSize="9px" color={mutedColor} textTransform="uppercase">{label}</Text>
                      </VStack>
                    ))}
                  </HStack>

                  <Box>
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="10px" color={subColor}>Progress</Text>
                      <Text fontSize="10px" fontWeight="bold" color={accent}>{progress}%</Text>
                    </Flex>
                    <Progress value={progress} size="xs" borderRadius="full" bg={progressBg}
                      sx={{ "& > div": { background: accent } }}/>
                  </Box>

                  {project.status && (
                    <Badge mt={3} fontSize="9px" borderRadius="full" px={2}
                      colorScheme={
                        project.status === "completed" ? "green" :
                        project.status === "active"    ? "brand" : "gray"
                      }>
                      {project.status}
                    </Badge>
                  )}
                </Box>
              );
            })}
          </SimpleGrid>
        )}
      </Box>

      {/* ── Monthly + Completion ────────────────────────────────────────── */}
      <SimpleGrid columns={{ base:1, lg:2 }} spacing={4} mb={6}>

        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
          <Heading size="sm" color={textColor} mb={1}>📈 Monthly Task Overview</Heading>
          <Text fontSize="xs" color={mutedColor} mb={4}>
            Total vs Completed per month
            {activeProject && <Badge ml={2} colorScheme="brand" fontSize="xs">{activeProject.name}</Badge>}
          </Text>
          {monthlyData.length === 0 ? (
            <Flex justify="center" align="center" h="200px" color={mutedColor}>
              <Text fontSize="sm">No data yet</Text>
            </Flex>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top:5, right:10, left:-20, bottom:5 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid}/>
                <XAxis dataKey="month" tick={{ fontSize:11, fill:chartText }}/>
                <YAxis allowDecimals={false} tick={{ fontSize:11, fill:chartText }}/>
                <RTooltip contentStyle={{ background:cardBg, borderColor, color:textColor }}/>
                <Legend/>
                <Area type="monotone" dataKey="total"     stroke="#3b82f6" fill="url(#totalGrad)"     strokeWidth={2} name="Total"/>
                <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#completedGrad)" strokeWidth={2} name="Completed"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Box>

        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
          <Heading size="sm" color={textColor} mb={1}>🎯 Task Completion Rate</Heading>
          <Text fontSize="xs" color={mutedColor} mb={6}>
            Overall progress breakdown
            {activeProject && <Badge ml={2} colorScheme="brand" fontSize="xs">{activeProject.name}</Badge>}
          </Text>
          <SimpleGrid columns={3} spacing={4}>
            {[
              { rate:completionRate, color:"green.400",  label:"Completed",   count:stats.completed,  countColor:"green.500"  },
              { rate:inProgressRate, color:"brand.400",  label:"In Progress", count:stats.inProgress, countColor:"brand.500"  },
              { rate:pendingRate,    color:"yellow.400", label:"Pending",     count:stats.pending,    countColor:"yellow.500" },
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
                w={`${completionRate}%`} transition="width 0.5s"/>
            </Box>
          </Box>
        </Box>
      </SimpleGrid>

      {/* ── Project Charts ───────────────────────────────────────────────── */}
      <SimpleGrid columns={{ base:1, lg:2 }} spacing={4} mb={6}>

        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
          <Heading size="sm" color={textColor} mb={1}>📊 Project Task Breakdown</Heading>
          <Text fontSize="xs" color={mutedColor} mb={4}>Tasks per project by status</Text>
          {projectTaskData.length === 0 ? (
            <Flex justify="center" align="center" h="200px" color={mutedColor}>
              <Text fontSize="sm">No project data</Text>
            </Flex>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={projectTaskData} margin={{ top:5, right:10, left:-10, bottom:30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid}/>
                <XAxis dataKey="name" tick={{ fontSize:10, fill:chartText }} angle={-25} textAnchor="end" interval={0}/>
                <YAxis allowDecimals={false} tick={{ fontSize:11, fill:chartText }}/>
                <RTooltip contentStyle={{ background:cardBg, borderColor, color:textColor }}/>
                <Legend wrapperStyle={{ paddingTop:"8px" }}/>
                <Bar dataKey="completed"  fill="#10b981" radius={[4,4,0,0]} name="Completed"/>
                <Bar dataKey="inProgress" fill="#3b82f6" radius={[4,4,0,0]} name="In Progress"/>
                <Bar dataKey="pending"    fill="#f59e0b" radius={[4,4,0,0]} name="Pending"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>

        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
          <Heading size="sm" color={textColor} mb={1}>🥧 Task Distribution by Project</Heading>
          <Text fontSize="xs" color={mutedColor} mb={4}>Share of total tasks per project</Text>
          {projectPieData.length === 0 ? (
            <Flex justify="center" align="center" h="200px" color={mutedColor}>
              <Text fontSize="sm">No data</Text>
            </Flex>
          ) : (
            <Flex align="center" gap={4} wrap="wrap">
              <ResponsiveContainer width="60%" height={220}>
                <PieChart>
                  <Pie data={projectPieData} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {projectPieData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <RTooltip contentStyle={{ background:cardBg, borderColor, color:textColor }}
                    formatter={(v, n) => [`${v} tasks`, n]}/>
                </PieChart>
              </ResponsiveContainer>
              <VStack align="flex-start" spacing={1.5} flex={1} minW="100px">
                {projectPieData.map((e, i) => (
                  <HStack key={i} spacing={2}>
                    <Box w="10px" h="10px" borderRadius="full" bg={e.color} flexShrink={0}/>
                    <Text fontSize="11px" color={textColor} noOfLines={1}>{e.name}</Text>
                    <Text fontSize="11px" color={mutedColor}>({e.value})</Text>
                  </HStack>
                ))}
              </VStack>
            </Flex>
          )}
        </Box>
      </SimpleGrid>

      {/* ── Staff Chart ─────────────────────────────────────────────────── */}
      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm" mb={6}>
        <Heading size="sm" color={textColor} mb={1}>👤 Staff Task Breakdown</Heading>
        <Text fontSize="xs" color={mutedColor} mb={4}>
          Tasks per staff member by status
          {activeProject && <Badge ml={2} colorScheme="brand" fontSize="xs">{activeProject.name}</Badge>}
        </Text>
        {staffTaskData.length === 0 ? (
          <Flex justify="center" align="center" h="200px" color={mutedColor}>
            <Text fontSize="sm">No staff task data</Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={staffTaskData} margin={{ top:5, right:20, left:0, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid}/>
              <XAxis dataKey="name" tick={{ fontSize:12, fill:chartText }}/>
              <YAxis allowDecimals={false} tick={{ fontSize:12, fill:chartText }}/>
              <RTooltip contentStyle={{ background:cardBg, borderColor, color:textColor }}/>
              <Legend/>
              <Bar dataKey="completed"  fill="#10b981" radius={[4,4,0,0]} name="Completed"/>
              <Bar dataKey="inProgress" fill="#3b82f6" radius={[4,4,0,0]} name="In Progress"/>
              <Bar dataKey="pending"    fill="#f59e0b" radius={[4,4,0,0]} name="Pending"/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>

      {/* ── Recent Tasks ────────────────────────────────────────────────── */}
      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
        <Flex justify="space-between" align="center" mb={4}>
          <HStack spacing={2}>
            <Heading size="sm" color={textColor}>🕐 Recent Tasks</Heading>
            {activeProject && (
              <Badge colorScheme="brand" fontSize="xs" borderRadius="full" px={2}>
                {activeProject.name}
              </Badge>
            )}
          </HStack>
          <Button size="xs" variant="outline" colorScheme="brand"
            rightIcon={<MdOpenInNew size={11}/>} onClick={() => navigate("/admin/tasks")}>
            View All
          </Button>
        </Flex>

        {recentTasks.length === 0 ? (
          <Flex direction="column" align="center" py={8} color={mutedColor}>
            <Text fontSize="3xl">📭</Text>
            <Text fontSize="sm" mt={2}>
              {activeProject ? `No tasks in ${activeProject.name}` : "No tasks found"}
            </Text>
          </Flex>
        ) : (
          <VStack spacing={3} align="stretch">
            {recentTasks.map(task => (
              <Box key={task._id} p={4} borderRadius="lg"
                border={`1px solid ${borderColor}`} transition="all 0.2s" cursor="pointer"
                _hover={{ bg:rowHover, borderColor:rowHoverBdr, transform:"translateX(4px)", boxShadow:"sm" }}
                onClick={() => navigate("/admin/tasks")}>
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
                    <Badge colorScheme={getStatusColor(task.taskStatus?.name || "")}
                      fontSize="xs" borderRadius="full" px={2}>
                      {task.taskStatus?.name || "N/A"}
                    </Badge>
                    <Avatar name={task.assignee?.name} size="xs" bg="brand.500" title={task.assignee?.name}/>
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