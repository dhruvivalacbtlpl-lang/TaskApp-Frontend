import { useState } from "react";
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function CreateTaskStatus() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE"); // ✅ uppercase
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post("http://localhost:5000/api/task-status", {
        name: name.toUpperCase(), // optional if you want uppercase names
        status, // already uppercase
      });

      navigate("/admin/task-status");
    } catch (err) {
      console.error("Create failed:", err.response?.data || err.message);
    }
  };

  return (
    <Box bg="white" p="6" borderRadius="md" boxShadow="sm" maxW="600px">
      <Heading size="md" mb="5">
        Create Task Status
      </Heading>

      <form onSubmit={handleSubmit}>
        <VStack spacing="4" align="stretch">
          <FormControl isRequired>
            <FormLabel>Status Name</FormLabel>
            <Input
              placeholder="PENDING / IN_PROGRESS / COMPLETED"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Status</FormLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {/* ✅ uppercase values */}
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </FormControl>

          <Button type="submit" colorScheme="blue">
            Create Status
          </Button>
        </VStack>
      </form>
    </Box>
  );
}

export default CreateTaskStatus;
