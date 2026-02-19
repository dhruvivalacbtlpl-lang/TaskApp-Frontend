import { useState, useEffect } from "react";
import {
  Box, Heading, FormControl, FormLabel, Input,
  Select, Button, VStack, Spinner, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

function EditTaskStatus() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`/task-status/${id}`);
        setName(res.data.name);
        setStatus(res.data.status);
      } catch (error) {
        setErrorMsg("Error loading status. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");
    try {
      setSubmitting(true);
      await axios.put(`/task-status/${id}`, { name, status });
      setSuccessMsg("Task status updated successfully!");
      setTimeout(() => navigate("/admin/task-status"), 1500);
    } catch (error) {
      setErrorMsg("Update failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner size="xl" />;

  return (
    <Box bg="white" p="6" borderRadius="md" boxShadow="sm" maxW="600px">
      <Heading size="md" mb="5">Edit Task Status</Heading>

      {/* ✅ Messages */}
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
            <FormLabel>Status Name</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Status</FormLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </FormControl>
          <Button type="submit" colorScheme="blue" isLoading={submitting}>
            Update Status
          </Button>
        </VStack>
      </form>
    </Box>
  );
}

export default EditTaskStatus;