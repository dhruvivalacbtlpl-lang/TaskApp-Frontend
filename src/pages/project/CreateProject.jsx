import {
  Box, Heading, FormControl, FormLabel, Input, Textarea,
  Select, Button, useToast, CheckboxGroup, Checkbox, VStack, Text, HStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

export default function CreateProject() {
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(1);
  const [members, setMembers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);

  const cardBg      = useColorModeValue("white", "gray.800");
  const textColor   = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("#e2e8f0", "#4a5568");
  const subColor    = useColorModeValue("gray.400", "gray.500");

  useEffect(() => {
    api.get("/staff").then(res => setStaffList(res.data || [])).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast({ title: "Project name is required", status: "warning" });
    setLoading(true);
    try {
      await api.post("/projects", { name, description, status, members });
      toast({ title: "Project created!", status: "success", duration: 2000 });
      navigate("/admin/projects");
    } catch (err) {
      toast({ title: "Error creating project", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="lg" bg={cardBg} p={6} borderRadius="md" boxShadow="sm">
      <Heading size="md" mb={5} color={textColor}>🗂️ Create Project</Heading>
      <form onSubmit={handleSubmit}>
        <FormControl mb={4} isRequired>
          <FormLabel color={textColor}>Project Name</FormLabel>
          <Input placeholder="Enter project name" value={name}
            onChange={(e) => setName(e.target.value)} />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel color={textColor}>Description</FormLabel>
          <Textarea placeholder="Enter description" value={description}
            onChange={(e) => setDescription(e.target.value)} rows={3} />
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
          <Button colorScheme="brand" type="submit" isLoading={loading}>Create</Button>
        </HStack>
      </form>
    </Box>
  );
}