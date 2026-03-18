import { useEffect, useState, useRef } from "react";
import {
  Box, Heading, Text, SimpleGrid, Card, CardBody, HStack, VStack,
  Badge, Spinner, Center, Avatar, useColorModeValue, Input, InputGroup,
  InputLeftElement, IconButton, Menu, MenuButton, MenuList, MenuItem,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, FormControl, FormLabel, Button, useToast,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  Divider, Tabs, TabList, TabPanels, Tab, TabPanel, Switch, Image,
} from "@chakra-ui/react";
import {
  MdSearch, MdBusiness, MdEmail, MdPhone, MdMoreVert,
  MdEdit, MdDelete, MdRestore, MdUpload, MdRefresh,
} from "react-icons/md";
import api from "../api";

const API_BASE = import.meta.env.VITE_API_TARGET || "http://localhost:5000";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const dayLabel = (d) => d.charAt(0).toUpperCase() + d.slice(1);
const defaultWorkingHours = () =>
  DAYS.map((day) => ({
    day,
    isWorking: !["saturday","sunday"].includes(day),
    startTime: "09:00",
    endTime:   "18:00",
    breaks: [],
  }));

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function EditModal({ company, onClose, onSaved }) {
  const toast = useToast();
  const [saving,      setSaving]      = useState(false);
  const [logoFile,    setLogoFile]    = useState(null);
  const [logoPreview, setLogoPreview] = useState(company.logo || "");
  const fileRef = useRef();

  const [form, setForm] = useState({
    name:    company.name    || "",
    email:   company.email   || "",
    phone:   company.phone   || "",
    address: company.address || "",
    website: company.website || "",
  });

  const [wh, setWh] = useState(
    company.workingHours?.length ? company.workingHours : defaultWorkingHours()
  );

  const set        = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const toggleDay  = (i) => setWh((p) => p.map((d,idx) => idx===i ? {...d, isWorking: !d.isWorking} : d));
  const setWhField = (i,k,v) => setWh((p) => p.map((d,idx) => idx===i ? {...d, [k]: v} : d));

  const pickLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = async () => {
    try {
      await api.delete(`/company/${company._id}/logo`);
      setLogoPreview(""); setLogoFile(null);
    } catch {
      toast({ title: "Could not remove logo", status: "error", duration: 3000 });
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Name and email are required", status: "warning", duration: 3000 });
      return;
    }
    setSaving(true);
    try {
      await api.put(`/company/${company._id}/profile`, { ...form, workingHours: wh });
      if (logoFile) {
        const fd = new FormData();
        fd.append("logo", logoFile);
        await api.put(`/company/${company._id}/logo`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      toast({ title: "Company updated", status: "success", duration: 3000 });
      onSaved(); onClose();
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Save failed", status: "error", duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const inputBg = useColorModeValue("gray.50", "gray.700");

  return (
    <Modal isOpen onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent borderRadius="2xl">
        <ModalHeader borderBottomWidth="1px" pb={4}>Edit — {company.name}</ModalHeader>
        <ModalCloseButton />

        <ModalBody py={5}>
          <Tabs variant="soft-rounded" colorScheme="blue" size="sm">
            <TabList mb={5} flexWrap="wrap" gap={2}>
              <Tab>Profile</Tab>
              <Tab>Logo</Tab>
              <Tab>Working Hours</Tab>
            </TabList>

            <TabPanels>
              {/* Profile */}
              <TabPanel px={0}>
                <VStack spacing={4}>
                  {[
                    { label: "Company Name *", key: "name",    type: "text"  },
                    { label: "Email *",         key: "email",   type: "email" },
                    { label: "Phone",           key: "phone",   type: "tel"   },
                    { label: "Address",         key: "address", type: "text"  },
                    { label: "Website",         key: "website", type: "url"   },
                  ].map(({ label, key, type }) => (
                    <FormControl key={key}>
                      <FormLabel fontSize="sm" mb={1}>{label}</FormLabel>
                      <Input type={type} value={form[key]} onChange={set(key)}
                        bg={inputBg} borderRadius="lg" size="md" />
                    </FormControl>
                  ))}
                </VStack>
              </TabPanel>

              {/* Logo */}
              <TabPanel px={0}>
                <VStack spacing={5} align="start">
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={3}>Current Logo</Text>
                    {logoPreview ? (
                      <HStack spacing={4} align="center">
                        <Image
                          src={logoPreview.startsWith("blob:") ? logoPreview : `${API_BASE}${logoPreview}`}
                          alt="logo" boxSize="80px" objectFit="contain"
                          borderRadius="xl" border="1px solid" borderColor="gray.200" p={2}
                        />
                        <Button size="sm" colorScheme="red" variant="outline" onClick={removeLogo}>
                          Remove
                        </Button>
                      </HStack>
                    ) : (
                      <Avatar size="xl" name={company.name} bg="blue.500"
                        icon={<MdBusiness size={28}/>} />
                    )}
                  </Box>
                  <Divider />
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={3}>Upload New Logo</Text>
                    <input ref={fileRef} type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      style={{ display: "none" }} onChange={pickLogo} />
                    <Button leftIcon={<MdUpload />} onClick={() => fileRef.current.click()}
                      colorScheme="blue" variant="outline" size="sm">
                      Choose File
                    </Button>
                    {logoFile && (
                      <Text fontSize="xs" color="gray.500" mt={2}>
                        {logoFile.name} — will upload on Save
                      </Text>
                    )}
                  </Box>
                </VStack>
              </TabPanel>

              {/* Working Hours */}
              <TabPanel px={0}>
                <VStack spacing={3} align="stretch">
                  {wh.map((day, i) => (
                    <Box key={day.day} p={3} borderRadius="xl" border="1px solid"
                      borderColor={day.isWorking ? "blue.200" : "gray.200"}
                      bg={day.isWorking
                        ? useColorModeValue("blue.50","blue.900")
                        : useColorModeValue("gray.50","gray.800")}>
                      <HStack justify="space-between" mb={day.isWorking ? 3 : 0}>
                        <Text fontWeight="600" fontSize="sm" w="100px">{dayLabel(day.day)}</Text>
                        <Switch isChecked={day.isWorking} onChange={() => toggleDay(i)}
                          colorScheme="blue" size="sm" />
                      </HStack>
                      {day.isWorking && (
                        <HStack spacing={3} flexWrap="wrap">
                          <FormControl flex={1} minW="100px">
                            <FormLabel fontSize="xs" mb={1}>Start</FormLabel>
                            <Input type="time" size="sm" value={day.startTime}
                              onChange={(e) => setWhField(i, "startTime", e.target.value)}
                              borderRadius="lg" bg={inputBg} />
                          </FormControl>
                          <FormControl flex={1} minW="100px">
                            <FormLabel fontSize="xs" mb={1}>End</FormLabel>
                            <Input type="time" size="sm" value={day.endTime}
                              onChange={(e) => setWhField(i, "endTime", e.target.value)}
                              borderRadius="lg" bg={inputBg} />
                          </FormControl>
                        </HStack>
                      )}
                    </Box>
                  ))}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" gap={3}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={save} isLoading={saving}
            loadingText="Saving…" borderRadius="xl">
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function SuperAdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [editing,   setEditing]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const cancelRef = useRef();
  const toast     = useToast();

  const cardBg      = useColorModeValue("white",    "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const subText     = useColorModeValue("gray.500", "gray.400");

  const load = () => {
    setLoading(true);
    api.get("/company/all")
      .then(r => setCompanies(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleStatus = async (company) => {
    const newStatus = company.status === 1 ? 0 : 1;
    try {
      await api.patch(`/company/${company._id}/status`, { status: newStatus });
      setCompanies(prev =>
        prev.map(c => c._id === company._id ? { ...c, status: newStatus } : c)
      );
      toast({
        title: newStatus === 0 ? "Company deactivated" : "Company restored",
        status: newStatus === 0 ? "warning" : "success",
        duration: 3000,
      });
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Action failed", status: "error", duration: 4000 });
    }
    setDeleting(null);
  };

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Center h="60vh"><Spinner size="xl" /></Center>;

  return (
    <Box>
      {/* Header */}
      <HStack justify="space-between" mb={6} wrap="wrap" gap={3}>
        <VStack align="start" spacing={0}>
          <Heading size="lg">All Companies</Heading>
          <Text color={subText} fontSize="sm">{companies.length} companies registered</Text>
        </VStack>
        <HStack>
          <Badge colorScheme="yellow" fontSize="sm" px={3} py={1} borderRadius="full">
            SuperAdmin View
          </Badge>
          <IconButton icon={<MdRefresh />} variant="ghost" size="sm"
            aria-label="Refresh" onClick={load} />
        </HStack>
      </HStack>

      {/* Search */}
      <InputGroup mb={6} maxW="400px">
        <InputLeftElement><MdSearch color="gray" /></InputLeftElement>
        <Input placeholder="Search companies…" value={search}
          onChange={e => setSearch(e.target.value)} />
      </InputGroup>

      {/* Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
        {filtered.map(company => {
          const isActive = company.status !== 0;
          return (
            <Card
              key={company._id}
              bg={cardBg}
              border="1px solid"
              borderColor={isActive ? borderColor : "red.200"}
              borderRadius="xl"
              opacity={isActive ? 1 : 0.6}
              _hover={{ boxShadow: "lg", transform: "translateY(-2px)" }}
              transition="0.2s"
            >
              <CardBody>
                <HStack justify="space-between" mb={4}>
                  <HStack spacing={3}>
                    <Avatar size="md" name={company.name}
                      src={company.logo ? `${API_BASE}${company.logo}` : undefined}
                      bg="blue.500" icon={<MdBusiness size={20}/>} />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="700" fontSize="md">{company.name}</Text>
                      <Badge colorScheme={isActive ? "green" : "red"} fontSize="xs">
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </VStack>
                  </HStack>

                  {/* 3-dot menu */}
                  <Menu>
                    <MenuButton as={IconButton} icon={<MdMoreVert />}
                      variant="ghost" size="sm" aria-label="Options" />
                    <MenuList minW="140px">
                      <MenuItem icon={<MdEdit />} onClick={() => setEditing(company)}>
                        Edit
                      </MenuItem>
                      <MenuItem
                        icon={isActive ? <MdDelete /> : <MdRestore />}
                        color={isActive ? "red.500" : "green.500"}
                        onClick={() => setDeleting(company)}
                      >
                        {isActive ? "Deactivate" : "Restore"}
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </HStack>

                {/* Contact info */}
                <VStack align="start" spacing={2} fontSize="sm" color={subText}>
                  {company.email && (
                    <HStack spacing={2}><MdEmail /><Text noOfLines={1}>{company.email}</Text></HStack>
                  )}
                  {company.phone && (
                    <HStack spacing={2}><MdPhone /><Text>{company.phone}</Text></HStack>
                  )}
                  {company.address && (
                    <Text noOfLines={1}>{company.address}</Text>
                  )}
                </VStack>

                <Text fontSize="xs" color="gray.400" mt={4}>
                  Created: {new Date(company.createdAt).toLocaleDateString()}
                </Text>
              </CardBody>
            </Card>
          );
        })}
      </SimpleGrid>

      {filtered.length === 0 && !loading && (
        <Center h="200px">
          <Text color="gray.500">No companies found</Text>
        </Center>
      )}

      {/* Edit Modal */}
      {editing && (
        <EditModal company={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}

      {/* Deactivate / Restore confirm */}
      <AlertDialog isOpen={!!deleting} leastDestructiveRef={cancelRef}
        onClose={() => setDeleting(null)}>
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="2xl">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {deleting?.status !== 0 ? "Deactivate Company" : "Restore Company"}
            </AlertDialogHeader>
            <AlertDialogBody>
              {deleting?.status !== 0
                ? `Deactivating "${deleting?.name}" will hide it from all users. You can restore it later.`
                : `Restore "${deleting?.name}" and make it active again?`}
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={() => setDeleting(null)} variant="ghost">
                Cancel
              </Button>
              <Button
                colorScheme={deleting?.status !== 0 ? "red" : "green"}
                onClick={() => toggleStatus(deleting)}
              >
                {deleting?.status !== 0 ? "Deactivate" : "Restore"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}