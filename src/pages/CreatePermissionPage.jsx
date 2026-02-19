import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Heading, FormControl, FormLabel, Input, Select,
  Button, VStack, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";

export default function CreatePermissionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState(1);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) fetchPermission();
  }, [id]);

  const fetchPermission = async () => {
    try {
      const res = await axios.get(`/permissions/${id}`);
      setName(res.data.name);
      setValue(res.data.value);
      setStatus(res.data.status);
    } catch (err) {
      setErrorMsg("Failed to fetch permission details.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("Permission name is required.");
      return;
    }

    try {
      setLoading(true);
      if (isEdit) {
        await axios.put(`/permissions/${id}`, { name, value, status });
        setSuccessMsg("Permission updated successfully!");
      } else {
        await axios.post("/permissions", { name, value, status });
        setSuccessMsg("Permission created successfully!");
      }
      setTimeout(() => navigate("/admin/permissions"), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={6} maxW="500px">
      <Heading size="lg" mb={6}>
        {isEdit ? "Edit Permission" : "Create Permission"}
      </Heading>

      {/* ✅ Success Message */}
      {successMsg && (
        <Alert status="success" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* ✅ Error Message */}
      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>Name</FormLabel>
            <Input
              placeholder="Enter permission name (ex: Staff_read)"
              value={name}
              onChange={(e) => {
                const newName = e.target.value;
                setName(newName);
                setValue(newName);
              }}
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Value</FormLabel>
            <Input value={value} readOnly />
          </FormControl>

          <FormControl>
            <FormLabel>Status</FormLabel>
            <Select value={status} onChange={(e) => setStatus(Number(e.target.value))}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </Select>
          </FormControl>

          <Button type="submit" colorScheme="blue" isLoading={loading}>
            {isEdit ? "Update" : "Save"}
          </Button>
        </VStack>
      </form>
    </Box>
  );
}