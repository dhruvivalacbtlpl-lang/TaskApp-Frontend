import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Flex, Heading, Text, Badge, Avatar,
  Spinner, Button, Grid, GridItem, Progress, useColorModeValue,
} from "@chakra-ui/react";
import { MdFolder, MdArrowBack, MdPeople, MdCheckBox } from "react-icons/md";
import api from "../../api";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const cardBg      = useColorModeValue("white", "gray.800");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.500", "gray.400");
  const borderColor = useColorModeValue("#e2e8f0", "#4a5568");
  const cardHover   = useColorModeValue("brand.50", "gray.700");
  const iconBg      = useColorModeValue("brand.100", "brand.900");
  const iconClr     = useColorModeValue("#2b6cb0", "#63b3ed");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [projectRes, tasksRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get("/tasks"),
        ]);
        setProject(projectRes.data);
        const projectTasks = (tasksRes.data || []).filter(
          t => t.project?._id === id || t.project === id
        );
        setTasks(projectTasks);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  if (loading) return <Flex justify="center" py={20}><Spinner size="xl" color="brand.500" /></Flex>;
  if (!project) return <Box p={6}><Text color="red.400">Project not found.</Text></Box>;

  const getMemberTaskCount = (memberId) =>
    tasks.filter(t => t.assignee?._id === memberId || t.assignee === memberId).length;

  const getMemberCompletedCount = (memberId) =>
    tasks.filter(t =>
      (t.assignee?._id === memberId || t.assignee === memberId) &&
      t.taskStatus?.name === "COMPLETED"
    ).length;

  const getRoleBadgeColor = (roleName) => {
    switch (roleName?.toLowerCase()) {
      case "admin": return "red";
      case "manager": return "purple";
      case "developer": return "brand";
      case "designer": return "pink";
      default: return "gray";
    }
  };

  return (
    <Box px={4} py={6}>
      <Button leftIcon={<MdArrowBack />} variant="ghost" mb={4}
        onClick={() => navigate("/admin/projects")}>
        Back to Projects
      </Button>

      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md" mb={6}>
        <Flex align="center" gap={3} mb={4}>
          <Box bg={iconBg} p={3} borderRadius="lg">
            <MdFolder size={28} color={iconClr} />
          </Box>
          <Box flex={1}>
            <Heading size="md" color={textColor}>{project.name}</Heading>
            <Text fontSize="sm" color={subColor} mt={1}>
              {project.description || "No description provided"}
            </Text>
          </Box>
          <Badge colorScheme={project.status === 1 ? "green" : "red"}
            fontSize="sm" px={3} py={1} borderRadius="full">
            {project.status === 1 ? "Active" : "Inactive"}
          </Badge>
        </Flex>
        <Flex gap={4} wrap="wrap" fontSize="xs" color={subColor} mt={2}>
          <Text>📅 Created: {new Date(project.createdAt).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
          })}</Text>
          <Text>👥 {project.members?.length || 0} Members</Text>
        </Flex>
      </Box>

      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
        <Flex align="center" gap={2} mb={6}>
          <MdPeople size={22} color={iconClr} />
          <Heading size="sm" color={textColor}>Team Members</Heading>
          <Badge colorScheme="brand" borderRadius="full" px={2}>
            {project.members?.length || 0}
          </Badge>
        </Flex>

        {!project.members?.length ? (
          <Flex direction="column" align="center" py={10} color={subColor}>
            <MdPeople size={40} />
            <Text fontSize="sm" mt={2}>No members assigned to this project</Text>
            <Text fontSize="xs" mt={1}>Go to Projects → Edit to add members</Text>
          </Flex>
        ) : (
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
            {project.members.map((m) => {
              const total = getMemberTaskCount(m._id);
              const completed = getMemberCompletedCount(m._id);
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <GridItem key={m._id}>
                  <Box p={4} borderRadius="xl" border={`1px solid ${borderColor}`}
                    _hover={{ bg: cardHover, borderColor: "brand.300", transform: "translateY(-3px)", boxShadow: "md" }}
                    transition="all 0.2s">
                    <Flex align="center" gap={3} mb={3}>
                      <Avatar name={m.name} size="md" bg="brand.500" color="white" />
                      <Box flex={1}>
                        <Flex align="center" gap={2}>
                          <Text fontWeight="700" fontSize="sm" color={textColor}>{m.name}</Text>
                          <Badge colorScheme={getRoleBadgeColor(m.role?.name)}
                            fontSize="xs" borderRadius="full" px={2}>
                            {m.role?.name || "Staff"}
                          </Badge>
                        </Flex>
                        <Text fontSize="xs" color={subColor} noOfLines={1}>{m.email}</Text>
                      </Box>
                    </Flex>
                    <Flex justify="space-between" mb={2}>
                      <Flex align="center" gap={1}>
                        <MdCheckBox size={14} color="#3b82f6" />
                        <Text fontSize="xs" color={subColor}>{completed}/{total} tasks</Text>
                      </Flex>
                      <Text fontSize="xs" fontWeight="600"
                        color={percent === 100 ? "green.500" : "brand.400"}>
                        {percent}%
                      </Text>
                    </Flex>
                    <Progress value={percent} size="xs"
                      colorScheme={percent === 100 ? "green" : "brand"}
                      borderRadius="full" />
                    <Flex mt={3} gap={2} wrap="wrap">
                      <Badge fontSize="xs" colorScheme="brand" borderRadius="full" px={2}>{total} Total</Badge>
                      <Badge fontSize="xs" colorScheme="green" borderRadius="full" px={2}>{completed} Done</Badge>
                      <Badge fontSize="xs" colorScheme="yellow" borderRadius="full" px={2}>{total - completed} Pending</Badge>
                    </Flex>
                  </Box>
                </GridItem>
              );
            })}
          </Grid>
        )}
      </Box>
    </Box>
  );
}