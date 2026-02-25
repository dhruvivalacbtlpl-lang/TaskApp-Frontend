import {
  Box, Heading, FormControl, FormLabel, Input, Textarea,
  Select, Button, useToast, CheckboxGroup, Checkbox, VStack,
  Text, Spinner, Flex, HStack, useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function EditProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshProjects } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(1);
  const [members, setMembers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cardBg      = useColorModeValue("white", "gray.800");
  const textColor   = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("#e2e8f0", "#4a5568");
  const subColor    = useColorModeValue("gray.400", "gray.500");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectRes, staffRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get("/staff"),
        ]);
        const p = projectRes.data;
        setName(p.name || "");
        setDescription(p.description || "");
        setStatus(p.status ?? 1);
        setMembers(p.members?.map(m => m._id) || []);
        setStaffList(staffRes.data || []);
      } catch (err) {
        toast({ title: "Failed to load project", status: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/projects/${id}`, { name, description, status, members });
      await refreshProjects();
      toast({ title: "Project updated!", status: "success", duration: 2000 });
      navigate("/admin/projects");
    } catch (err) {
      toast({ title: "Error updating project", status: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Flex justify="center" py={12}><Spinner size="lg" color="blue.500" /></Flex>;

  return (
    <Box maxW="lg" bg={cardBg} p={6} borderRadius="md" boxShadow="sm">
      <Heading size="md" mb={5} color={textColor}>✏️ Edit Project</Heading>
      <form onSubmit={handleSubmit}>
        <FormControl mb={4} isRequired>
          <FormLabel color={textColor}>Project Name</FormLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel color={textColor}>Description</FormLabel>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel color={textColor}>Status</FormLabel>
          <Select value={status} onChange={(e) => setStatus(Number(e.target.value))}>
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </Select>
        </FormControl>

        <FormControl mb={6}>
          <FormLabel color={textColor}>Assign Members</FormLabel>
          <Box border={`1px solid ${borderColor}`} borderRadius="md" p={3} maxH="200px" overflowY="auto">
            {staffList.length === 0 ? (
              <Text fontSize="sm" color={subColor}>No staff found</Text>
            ) : (
              <CheckboxGroup value={members} onChange={setMembers}>
                <VStack align="start" spacing={2}>
                  {staffList.map((s) => (
                    <Checkbox key={s._id} value={s._id}>
                      <Text as="span" color={textColor}>{s.name}</Text>
                      <Text as="span" color={subColor} fontSize="xs"> — {s.email}</Text>
                    </Checkbox>
                  ))}
                </VStack>
              </CheckboxGroup>
            )}
          </Box>
        </FormControl>

        <HStack justify="flex-end" gap={3}>
          <Button variant="outline" onClick={() => navigate("/admin/projects")}>Cancel</Button>
          <Button colorScheme="blue" type="submit" isLoading={saving}>Update</Button>
        </HStack>
      </form>
    </Box>
  );
}