import { useState } from "react";
import {
  Box, Heading, FormControl, FormLabel, Input,
  Select, Button, VStack, Alert, AlertIcon, AlertDescription,
  useColorModeValue,
} from "@chakra-ui/react";
import api from "../../api";
import { useNavigate } from "react-router-dom";

function CreateTaskStatus() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  const cardBg    = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.800", "white");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");
    if (!name.trim()) { setErrorMsg("Status name is required."); return; }
    try {
      setLoading(true);
      await api.post("/task-status", { name: name.toUpperCase(), status });
      setSuccessMsg("Task status created successfully!");
      setTimeout(() => navigate("/admin/task-status"), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Create failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box bg={cardBg} p="6" borderRadius="md" boxShadow="sm" maxW="600px">
      <Heading size="md" mb="5" color={textColor}>Create Task Status</Heading>

      {successMsg && (
        <Alert status="success" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}
      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <VStack spacing="4" align="stretch">
          <FormControl isRequired>
            <FormLabel color={textColor}>Status Name</FormLabel>
            <Input
              placeholder="PENDING / IN_PROGRESS / COMPLETED"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel color={textColor}>Status</FormLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </FormControl>
          <Button type="submit" colorScheme="blue" isLoading={loading}>
            Create Status
          </Button>
        </VStack>
      </form>
    </Box>
  );
}

export default CreateTaskStatus;