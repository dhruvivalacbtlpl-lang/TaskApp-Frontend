import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  VStack,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

function EditTaskStatus() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();

  /* ================= FETCH EXISTING STATUS ================= */
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/task-status/${id}`
        );

        setName(res.data.name);
        setStatus(res.data.status);
      } catch (error) {
        toast({
          title: "Error loading status",
          status: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [id, toast]);

  /* ================= UPDATE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.put(
        `http://localhost:5000/api/task-status/${id}`,
        {
          name,
          status,
        }
      );

      toast({
        title: "Task Status updated",
        status: "success",
      });

      navigate("/admin/task-status");
    } catch (error) {
      toast({
        title: "Update failed",
        status: "error",
      });
    }
  };

  if (loading) return <Spinner size="xl" />;

  return (
    <Box
      bg="white"
      p="6"
      borderRadius="md"
      boxShadow="sm"
      maxW="600px"
    >
      <Heading size="md" mb="5">
        Edit Task Status
      </Heading>

      <form onSubmit={handleSubmit}>
        <VStack spacing="4" align="stretch">
          <FormControl isRequired>
            <FormLabel>Status Name</FormLabel>
            <Input
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
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </FormControl>

          <Button type="submit" colorScheme="blue">
            Update Status
          </Button>
        </VStack>
      </form>
    </Box>
  );
}

export default EditTaskStatus;
