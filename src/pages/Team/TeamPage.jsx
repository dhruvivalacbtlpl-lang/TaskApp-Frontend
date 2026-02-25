import { useState, useEffect, useRef } from "react";
import {
  Box, Flex, Heading, Text, Avatar, Badge,
  Spinner, Grid, GridItem, Button, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, useDisclosure, Input,
  useToast, IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdPeople, MdFolder, MdAdd, MdDelete, MdClose } from "react-icons/md";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

export default function TeamPage() {
  const { projects, projectsLoading, selectedProject } = useAuth();
  const [localSelected, setLocalSelected] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const toast = useToast();

  const cardBg           = useColorModeValue("white", "gray.800");
  const textColor        = useColorModeValue("gray.700", "white");
  const subColor         = useColorModeValue("gray.400", "gray.400");
  const borderColor      = useColorModeValue("#e2e8f0", "gray.600");
  const hoverBg          = useColorModeValue("blue.50", "gray.700");
  const hoverBorderColor = useColorModeValue("blue.200", "blue.400");
  const dropdownBg       = useColorModeValue("white", "gray.700");
  const dropdownBorderColor = useColorModeValue("#e2e8f0", "gray.600");
  const chipBg           = useColorModeValue("blue.50", "blue.900");
  const chipBorderColor  = useColorModeValue("blue.200", "blue.500");
  const chipTextColor    = useColorModeValue("blue.700", "blue.200");
  const iconClr          = useColorModeValue("#2b6cb0", "#63b3ed");

  useEffect(() => {
    if (selectedProject) {
      setLocalSelected(selectedProject);
    } else {
      setLocalSelected(null);
    }
  }, [selectedProject, projects]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await api.get("/staff");
        setAllUsers(res.data || []);
      } catch (err) {
        console.error("Failed to fetch staff", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    const currentMembers = localSelected?.members || [];
    const filtered = allUsers.filter(u => {
      const alreadyMember = currentMembers.some(m => (m._id || m) === u._id);
      const alreadySelected = selectedUsers.some(s => s._id === u._id);
      return (
        !alreadyMember &&
        !alreadySelected &&
        (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      );
    });
    setSearchResults(filtered);
    setShowDropdown(true);
  }, [searchQuery, allUsers, localSelected, selectedUsers]);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelectUser = (user) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleRemoveChip = (userId) => {
    setSelectedUsers(prev => prev.filter(u => u._id !== userId));
  };

  const resetAddModal = () => {
    setSelectedUsers([]);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const updateProjectMembers = async (project, updatedMembers) => {
    try {
      const res = await api.put(`/projects/${project._id}`, {
        name: project.name,
        description: project.description,
        status: project.status,
        members: updatedMembers.map(m => m._id || m),
      });
      if (localSelected?._id === project._id) setLocalSelected(res.data);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleAddMembers = async () => {
    setSaving(true);
    try {
      const targetProject = localSelected;
      if (!targetProject) return;

      if (!selectedUsers.length) {
        toast({ title: "Please select at least one user", status: "warning", duration: 2000 });
        return;
      }
      const success = await updateProjectMembers(targetProject, [
        ...(targetProject.members || []),
        ...selectedUsers,
      ]);
      if (success) {
        toast({ title: `${selectedUsers.length} member(s) added!`, status: "success", duration: 2000 });
        onAddClose();
        resetAddModal();
      } else {
        toast({ title: "Failed to add members", status: "error", duration: 2000 });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (project, memberId) => {
    const updated = (project.members || []).filter(
      m => (m._id || m) !== memberId
    );
    const success = await updateProjectMembers(project, updated);
    if (success) {
      toast({ title: "Member removed", status: "info", duration: 2000 });
    } else {
      toast({ title: "Failed to remove member", status: "error", duration: 2000 });
    }
  };

  const allProjectsView = !localSelected;

  const renderMemberCard = (m, project) => (
    <GridItem key={`${project._id}-${m._id}`}>
      <Flex align="center" gap={3} p={4} borderRadius="lg"
        border="1px solid" borderColor={borderColor}
        _hover={{ bg: hoverBg, borderColor: hoverBorderColor, boxShadow: "sm" }}
        transition="all 0.2s">
        <Avatar name={m.name} size="md" bg="blue.400" color="white" />
        <Box flex={1}>
          <Text fontWeight="600" fontSize="sm" color={textColor}>{m.name}</Text>
          <Text fontSize="xs" color={subColor} noOfLines={1}>{m.email}</Text>
          {m.role?.name && (
            <Badge fontSize="xs" colorScheme="purple" borderRadius="full" mt={1}>
              {m.role.name}
            </Badge>
          )}
          {allProjectsView && (
            <Badge fontSize="xs" colorScheme="blue" borderRadius="full" mt={1} ml={1}>
              {project.name}
            </Badge>
          )}
        </Box>
        <IconButton
          icon={<MdDelete />}
          size="xs"
          colorScheme="red"
          variant="ghost"
          aria-label="Remove member"
          onClick={() => handleRemoveMember(project, m._id)}
        />
      </Flex>
    </GridItem>
  );

  if (projectsLoading) {
    return <Flex justify="center" py={20}><Spinner size="xl" color="blue.500" /></Flex>;
  }

  return (
    <Box>
      {/* BANNER */}
      {localSelected ? (
        <Box bg="blue.600" p={5} borderRadius="xl" boxShadow="md" mb={6} color="white">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" color="blue.200" fontWeight="600" textTransform="uppercase">Selected Project</Text>
              <Heading size="md" mt={1}>{localSelected.name}</Heading>
              <Text fontSize="sm" color="blue.100" mt={1}>{localSelected.description || "No description"}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="3xl" fontWeight="bold">{localSelected.members?.length || 0}</Text>
              <Text fontSize="xs" color="blue.200">Members</Text>
            </Box>
          </Flex>
        </Box>
      ) : (
        <Box bg="blue.600" p={5} borderRadius="xl" boxShadow="md" mb={6} color="white">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" color="blue.200" fontWeight="600" textTransform="uppercase">Viewing</Text>
              <Heading size="md" mt={1}>All Projects</Heading>
              <Text fontSize="sm" color="blue.100" mt={1}>Members across all {projects.length} projects</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="3xl" fontWeight="bold">{projects.length}</Text>
              <Text fontSize="xs" color="blue.200">Projects</Text>
            </Box>
          </Flex>
        </Box>
      )}

      {/* SINGLE PROJECT VIEW */}
      {localSelected && (
        <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
          <Flex align="center" gap={2} mb={5} justify="space-between">
            <Flex align="center" gap={2}>
              <MdPeople size={20} color={iconClr} />
              <Heading size="sm" color={textColor}>{localSelected.name} — Team Members</Heading>
              <Badge colorScheme="blue" borderRadius="full" px={2}>{localSelected.members?.length || 0}</Badge>
            </Flex>
            <Button leftIcon={<MdAdd />} colorScheme="blue" size="sm" onClick={onAddOpen}>
              Add Member
            </Button>
          </Flex>
          {!localSelected.members?.length ? (
            <Flex direction="column" align="center" py={12} color={subColor}>
              <MdPeople size={40} />
              <Text fontSize="sm" mt={2}>No members assigned to this project</Text>
            </Flex>
          ) : (
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
              {localSelected.members.map(m => renderMemberCard(m, localSelected))}
            </Grid>
          )}
        </Box>
      )}

      {/* ALL PROJECTS VIEW */}
      {allProjectsView && projects.map(project => (
        <Box key={project._id} bg={cardBg} p={6} borderRadius="xl" boxShadow="md" mb={4}>
          <Flex align="center" gap={2} mb={5} justify="space-between">
            <Flex align="center" gap={2}>
              <MdFolder size={20} color={iconClr} />
              <Heading size="sm" color={textColor}>{project.name}</Heading>
              <Badge colorScheme="blue" borderRadius="full" px={2}>{project.members?.length || 0}</Badge>
            </Flex>
            <Button leftIcon={<MdAdd />} colorScheme="blue" size="sm"
              onClick={() => { setLocalSelected(project); onAddOpen(); }}>
              Add Member
            </Button>
          </Flex>
          {!project.members?.length ? (
            <Flex direction="column" align="center" py={8} color={subColor}>
              <MdPeople size={32} />
              <Text fontSize="sm" mt={2}>No members assigned</Text>
            </Flex>
          ) : (
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
              {project.members.map(m => renderMemberCard(m, project))}
            </Grid>
          )}
        </Box>
      ))}

      {/* ADD MEMBER MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => { onAddClose(); resetAddModal(); }} isCentered size="md">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>Add Member to {localSelected?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUsers.length > 0 && (
              <Flex wrap="wrap" gap={2} mb={3}>
                {selectedUsers.map(u => (
                  <Flex key={u._id} align="center" gap={1}
                    bg={chipBg} border="1px solid" borderColor={chipBorderColor}
                    borderRadius="full" px={3} py={1}>
                    <Avatar name={u.name} size="2xs" bg="blue.400" color="white" />
                    <Text fontSize="xs" fontWeight="600" color={chipTextColor}>{u.name}</Text>
                    <IconButton
                      icon={<MdClose />}
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      aria-label="Remove"
                      minW="auto" h="auto" p="1px"
                      onClick={() => handleRemoveChip(u._id)}
                    />
                  </Flex>
                ))}
              </Flex>
            )}

            <Box position="relative" ref={searchRef}>
              <Input
                placeholder="Type name or email to search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowDropdown(true)}
                autoComplete="off"
              />

              {showDropdown && searchResults.length > 0 && (
                <Box
                  position="absolute" top="100%" left={0} right={0}
                  bg={dropdownBg} border="1px solid" borderColor={dropdownBorderColor}
                  borderRadius="lg" boxShadow="lg"
                  zIndex={999} maxH="200px" overflowY="auto" mt={1}
                >
                  {searchResults.map(u => (
                    <Flex key={u._id} align="center" gap={3} px={3} py={2}
                      cursor="pointer" _hover={{ bg: hoverBg }}
                      onClick={() => handleSelectUser(u)}>
                      <Avatar name={u.name} size="sm" bg="blue.400" color="white" />
                      <Box>
                        <Text fontSize="sm" fontWeight="600" color={textColor}>{u.name}</Text>
                        <Text fontSize="xs" color={subColor}>{u.email}</Text>
                      </Box>
                      {u.role?.name && (
                        <Badge ml="auto" fontSize="xs" colorScheme="purple" borderRadius="full">
                          {u.role.name}
                        </Badge>
                      )}
                    </Flex>
                  ))}
                </Box>
              )}

              {showDropdown && searchQuery && searchResults.length === 0 && (
                <Box
                  position="absolute" top="100%" left={0} right={0}
                  bg={dropdownBg} border="1px solid" borderColor={dropdownBorderColor}
                  borderRadius="lg" boxShadow="lg"
                  zIndex={999} mt={1} p={3}
                >
                  <Text fontSize="sm" color={subColor} textAlign="center">No users found</Text>
                </Box>
              )}
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onAddClose(); resetAddModal(); }}>Cancel</Button>
            <Button colorScheme="blue" isLoading={saving}
              isDisabled={selectedUsers.length === 0}
              onClick={handleAddMembers}>
              Add {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ""} Member{selectedUsers.length > 1 ? "s" : ""}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}