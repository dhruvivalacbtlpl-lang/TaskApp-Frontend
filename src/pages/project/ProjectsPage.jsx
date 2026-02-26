import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td,
  IconButton, Badge, Spinner, HStack, Text, Select, Avatar, AvatarGroup,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Flex,
  useColorModeValue,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, AddIcon } from "@chakra-ui/icons";
import { MdFolder } from "react-icons/md";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../context/AuthContext";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user, hasPermission, projects, projectsLoading, refreshProjects, selectProject } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const canCreate = isAdmin || hasPermission("project_create");
  const canUpdate = isAdmin || hasPermission("project_update");
  const canDelete = isAdmin || hasPermission("project_delete");

  const [deleteId, setDeleteId]     = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const cardBg    = useColorModeValue("white", "gray.800");
  const theadBg   = useColorModeValue("#bee3f8", "#2a4365");
  const textColor = useColorModeValue("gray.800", "white");
  const subColor  = useColorModeValue("gray.500", "gray.400");
  const rowHover  = useColorModeValue("brand.50", "gray.700");
  const thColor   = useColorModeValue("brand.700", "white");
  const iconClr   = useColorModeValue("#2b6cb0", "#63b3ed");

  useSocket("project:created", () => refreshProjects());
  useSocket("project:updated", () => refreshProjects());
  useSocket("project:deleted", () => refreshProjects());

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.delete(`/projects/${deleteId}`);
      setDeleteId(null);
      refreshProjects();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleProjectClick = (project) => {
    // Sync the topbar dropdown to this project, then navigate to detail
    selectProject(project._id);
    navigate(`/admin/projects/${project._id}/detail`);
  };

  const allProjects  = projects;
  const startIndex   = (currentPage - 1) * rowsPerPage;
  const currentProjects = allProjects.slice(startIndex, startIndex + rowsPerPage);
  const totalPages   = Math.max(1, Math.ceil(allProjects.length / rowsPerPage));

  return (
    <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} isCentered size="sm">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader fontSize="md">Delete Project</ModalHeader>
          <ModalBody fontSize="sm" color="gray.500">
            Are you sure? This will delete the project but not its tasks.
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button size="sm" colorScheme="red" isLoading={deleting}
              loadingText="Deleting..." onClick={handleDeleteConfirm}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Flex justify="space-between" align="center" mb={5}>
        <Flex align="center" gap={2}>
          <MdFolder size={22} color={iconClr} />
          <Heading size="md" color={textColor}>Projects</Heading>
        </Flex>
        {canCreate && (
          <Button leftIcon={<AddIcon />} colorScheme="brand"
            onClick={() => navigate("/admin/projects/create")}>
            Create Project
          </Button>
        )}
      </Flex>

      {projectsLoading ? (
        <Flex justify="center" py={10}><Spinner size="lg" color="brand.500" /></Flex>
      ) : allProjects.length === 0 ? (
        <Flex direction="column" align="center" py={12} color={subColor}>
          <MdFolder size={40} />
          <Text fontSize="sm" fontWeight="medium" mt={2}>No projects found</Text>
          <Text fontSize="xs">Create your first project to get started</Text>
        </Flex>
      ) : (
        <>
          <Table size="sm">
            <Thead bg={theadBg}>
              <Tr>
                <Th color={thColor}>#</Th>
                <Th color={thColor}>Name</Th>
                <Th color={thColor}>Description</Th>
                <Th color={thColor}>Members</Th>
                <Th color={thColor}>Status</Th>
                {(canUpdate || canDelete) && <Th color={thColor} textAlign="center">Actions</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {currentProjects.map((project, i) => (
                <Tr key={project._id} _hover={{ bg: rowHover }} transition="background 0.15s">
                  <Td color={textColor}>{startIndex + i + 1}</Td>
                  <Td fontWeight="600" color="brand.400" cursor="pointer"
                    _hover={{ textDecoration: "underline", color: "brand.300" }}
                    onClick={() => handleProjectClick(project)}>
                    {project.name}
                  </Td>
                  <Td color={subColor} fontSize="sm" maxW="200px">
                    <Text noOfLines={1}>{project.description || "—"}</Text>
                  </Td>
                  <Td>
                    {project.members?.length > 0 ? (
                      <AvatarGroup size="xs" max={3}>
                        {project.members.map((m) => (
                          <Avatar key={m._id} name={m.name} title={m.name} />
                        ))}
                      </AvatarGroup>
                    ) : (
                      <Text fontSize="xs" color={subColor}>No members</Text>
                    )}
                  </Td>
                  <Td>
                    <Badge colorScheme={project.status === 1 ? "green" : "red"}>
                      {project.status === 1 ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  {(canUpdate || canDelete) && (
                    <Td textAlign="center">
                      <HStack justify="center">
                        {canUpdate && (
                          <IconButton size="sm" icon={<EditIcon />} colorScheme="gray"
                            onClick={() => navigate(`/admin/projects/edit/${project._id}`)} />
                        )}
                        {canDelete && (
                          <IconButton size="sm" colorScheme="red" icon={<DeleteIcon />}
                            onClick={() => setDeleteId(project._id)} />
                        )}
                      </HStack>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Flex mt={4} justify="space-between" align="center">
            <Text fontSize="sm" color={textColor}>Page {currentPage} of {totalPages}</Text>
            <HStack>
              <Text fontSize="sm" color={textColor}>Rows</Text>
              <Select size="sm" width="80px" value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </Select>
            </HStack>
            <HStack>
              <Button size="sm" onClick={() => setCurrentPage(p => p - 1)} isDisabled={currentPage === 1}>◀</Button>
              <Button size="sm" onClick={() => setCurrentPage(p => p + 1)} isDisabled={currentPage === totalPages}>▶</Button>
            </HStack>
          </Flex>
        </>
      )}
    </Box>
  );
}