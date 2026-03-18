import { useEffect, useState, useMemo } from "react";
import {
  Box, Flex, Heading, Text, Spinner, SimpleGrid,
  Badge, Avatar, VStack, HStack, useColorModeValue,
  Button, Icon, Progress, Divider, AvatarGroup,
  Square, Grid, GridItem
} from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  MdOutlineRocketLaunch, MdOutlineDataUsage,
  MdOutlineCheckCircle, MdOutlineTimer, MdOutlineLayers
} from "react-icons/md";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, selectedProject, isSuperAdmin, selectedCompany } = useAuth();
  const navigate = useNavigate();
  const [data,    setData]    = useState({ tasks: [], staff: [], docs: [] });
  const [loading, setLoading] = useState(true);

  const bg      = useColorModeValue("gray.50",  "gray.900");
  const cardBg  = useColorModeValue("white",    "gray.800");
  const border  = useColorModeValue("gray.100", "gray.700");
  const subText = useColorModeValue("gray.500", "gray.400");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isSuperAdmin) {
          // SuperAdmin uses /tasks/super/all which works without companyId
          const t = Date.now();
          const url = selectedCompany
            ? `/tasks/super/all?company=${selectedCompany._id}&_t=${t}`
            : `/tasks/super/all?_t=${t}`;

          const [tRes, sRes] = await Promise.all([
            api.get(url),
            api.get(`/staff?_t=${t}`),
          ]);

          // super/all returns { grouped: [{company, tasks}], total }
          const allTasks = (tRes.data?.grouped || []).flatMap(g => g.tasks);
          const allStaff = selectedCompany
            ? (sRes.data || []).filter(s =>
                String(s.company?._id || s.company) === String(selectedCompany._id)
              )
            : (sRes.data || []);

          setData({ tasks: allTasks, staff: allStaff, docs: [] });
        } else {
          // Normal user — original behavior
          const [s, t, d] = await Promise.all([
            api.get("/staff"),
            api.get("/tasks"),
            api.get("/documents").catch(() => ({ data: [] })),
          ]);
          setData({ staff: s.data || [], tasks: t.data || [], docs: d.data || [] });
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setData({ tasks: [], staff: [], docs: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isSuperAdmin, selectedCompany]);

  const activeTasks = useMemo(() => {
    const projId = typeof selectedProject === "string"
      ? selectedProject : selectedProject?._id;
    return projId
      ? data.tasks.filter(t => (t.project?._id || t.project) === projId)
      : data.tasks;
  }, [data.tasks, selectedProject]);

  const analytics = useMemo(() => {
    const total = activeTasks.length;
    const done  = activeTasks.filter(t =>
      t.taskStatus?.name?.toLowerCase().includes("complet") ||
      t.taskStatus?.name?.toLowerCase().includes("done")
    ).length;
    const prog = activeTasks.filter(t =>
      t.taskStatus?.name?.toLowerCase().includes("progress")
    ).length;
    return {
      total, done, prog,
      rate:     total ? Math.round((done / total) * 100) : 0,
      velocity: prog + done > 0 ? "High" : "Stable",
    };
  }, [activeTasks]);

  if (loading) return (
    <Flex h="80vh" align="center" justify="center">
      <Spinner size="xl" thickness="4px" color="purple.500" />
    </Flex>
  );

  return (
    <Box maxW="1400px" mx="auto" p={1}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={8}>
        <VStack align="start" spacing={0}>
          <HStack>
            <Text fontSize="sm" color="purple.500" fontWeight="bold"
              textTransform="uppercase" letterSpacing="widest">
              {isSuperAdmin
                ? selectedCompany ? selectedCompany.name : "All Companies"
                : selectedProject ? "Project Overview" : "Organization Pulse"}
            </Text>
            {(selectedProject || (isSuperAdmin && selectedCompany)) && (
              <Badge colorScheme="purple">Live</Badge>
            )}
          </HStack>
          <Heading size="xl" fontWeight="900">
            {selectedProject
              ? selectedProject.name
              : `Welcome, ${user?.name?.split(" ")[0]}`}
          </Heading>
        </VStack>

        <HStack spacing={3}>
          <AvatarGroup size="sm" max={4}>
            {data.staff.slice(0, 4).map(s => <Avatar key={s._id} name={s.name} />)}
          </AvatarGroup>
          <Divider orientation="vertical" h="30px" />
          {!isSuperAdmin && (
            <Button colorScheme="purple" size="sm" leftIcon={<MdOutlineRocketLaunch />}
              onClick={() => navigate("/admin/tasks/create")}>
              New Task
            </Button>
          )}
        </HStack>
      </Flex>

      {/* Metrics */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={10}>
        <MetricCard icon={MdOutlineLayers}      label="Active Tasks" value={analytics.total}      color="blue.500"   />
        <MetricCard icon={MdOutlineCheckCircle} label="Completed"    value={analytics.done}       color="green.500"  />
        <MetricCard icon={MdOutlineTimer}       label="In Progress"  value={analytics.prog}       color="orange.500" />
        <MetricCard icon={MdOutlineDataUsage}   label="Success Rate" value={`${analytics.rate}%`} color="purple.500" />
      </SimpleGrid>

      <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap={6}>
        {/* Trend Chart */}
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <Box bg={cardBg} p={6} borderRadius="2xl" border="1px solid" borderColor={border} boxShadow="sm">
            <Flex justify="space-between" mb={6}>
              <Text fontWeight="bold">Task Completion Trend</Text>
              <Badge variant="outline" colorScheme="gray" px={3} py={1} borderRadius="lg">
                Last 7 Days
              </Badge>
            </Flex>
            <Box h="320px">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getMockTrendData()}>
                  <defs>
                    <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={border} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    fontSize={12} tick={{ fill: "#94a3b8" }} />
                  <YAxis hide />
                  <RTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="completed" stroke="#8b5cf6"
                    strokeWidth={3} fillOpacity={1} fill="url(#colorPv)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </GridItem>

        {/* Progress */}
        <GridItem colSpan={1}>
          <Box bg={cardBg} p={6} borderRadius="2xl" border="1px solid" borderColor={border} h="full">
            <Text fontWeight="bold" mb={6}>Overall Progress</Text>
            <Flex direction="column" align="center" justify="center" h="250px">
              <VStack spacing={1}>
                <Text fontSize="5xl" fontWeight="900" color="purple.500">{analytics.rate}%</Text>
                <Text fontSize="sm" color={subText}>Completed</Text>
                <Box w="160px" mt={3}>
                  <Progress value={analytics.rate} size="lg" colorScheme="purple"
                    borderRadius="full" bg={border} />
                </Box>
              </VStack>
            </Flex>
            <VStack mt={6} align="stretch" spacing={3}>
              <HealthRow label="Team Velocity" value={analytics.velocity} color="green" />
              <HealthRow label="Total Staff"   value={data.staff.length}  color="blue"  />
              <HealthRow label="Total Docs"    value={data.docs.length}   color="gray"  />
            </VStack>
          </Box>
        </GridItem>

        {/* Recent Tasks */}
        <GridItem colSpan={{ base: 1, lg: 3 }}>
          <Box bg={cardBg} borderRadius="2xl" border="1px solid" borderColor={border} overflow="hidden">
            <Box p={5} borderBottom="1px solid" borderColor={border}>
              <HStack justify="space-between">
                <Text fontWeight="bold">Recent Live Tasks</Text>
                <Badge colorScheme="purple" variant="subtle">{activeTasks.length} total</Badge>
              </HStack>
            </Box>
            {activeTasks.length === 0 ? (
              <Flex align="center" justify="center" h="120px">
                <Text color={subText} fontSize="sm">
                  {isSuperAdmin && !selectedCompany
                    ? "Select a company from the top bar to see its tasks"
                    : "No tasks found"}
                </Text>
              </Flex>
            ) : (
              <Box overflowX="auto">
                <VStack align="stretch" spacing={0} p={2}>
                  {activeTasks.slice(0, 5).map((task) => (
                    <Flex key={task._id} align="center" p={4} borderRadius="xl"
                      _hover={{ bg: bg }} transition="0.2s">
                      <Square size="40px" bg="purple.50" borderRadius="lg" color="purple.600" mr={4}>
                        <MdOutlineRocketLaunch />
                      </Square>
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontWeight="bold" fontSize="sm">{task.name}</Text>
                        <Text fontSize="xs" color={subText}>{task.project?.name || "No Project"}</Text>
                      </VStack>
                      <HStack spacing={8}>
                        <Avatar size="xs" name={task.assignee?.name} />
                        <Badge variant="subtle"
                          colorScheme={
                            task.taskStatus?.name?.toLowerCase().includes("complet") ||
                            task.taskStatus?.name?.toLowerCase().includes("done")
                              ? "green" : "blue"
                          }>
                          {task.taskStatus?.name || "—"}
                        </Badge>
                        <Text fontSize="xs" color={subText}>
                          {new Date(task.createdAt).toLocaleDateString()}
                        </Text>
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            )}
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}

function MetricCard({ icon, label, value, color }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.100", "gray.700");
  return (
    <HStack bg={cardBg} p={5} borderRadius="2xl" border="1px solid"
      borderColor={border} spacing={4} align="center">
      <Square size="48px" bg={`${color.split(".")[0]}.50`} color={color} borderRadius="xl">
        <Icon as={icon} boxSize={6} />
      </Square>
      <VStack align="start" spacing={0}>
        <Text fontSize="2xl" fontWeight="900" lineHeight="1">{value}</Text>
        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">{label}</Text>
      </VStack>
    </HStack>
  );
}

function HealthRow({ label, value, color }) {
  return (
    <Flex justify="space-between" align="center" fontSize="sm">
      <Text color="gray.500">{label}</Text>
      <Badge colorScheme={color} variant="solid" borderRadius="full" px={3}>{value}</Badge>
    </Flex>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <Box bg="gray.900" color="white" p={3} borderRadius="lg" fontSize="xs">
        <Text fontWeight="bold">{payload[0].payload.name}</Text>
        <Text>Completed: {payload[0].value} tasks</Text>
      </Box>
    );
  }
  return null;
};

const getMockTrendData = () => [
  { name: "Mon", completed: 4  },
  { name: "Tue", completed: 7  },
  { name: "Wed", completed: 5  },
  { name: "Thu", completed: 12 },
  { name: "Fri", completed: 9  },
  { name: "Sat", completed: 15 },
  { name: "Sun", completed: 10 },
];