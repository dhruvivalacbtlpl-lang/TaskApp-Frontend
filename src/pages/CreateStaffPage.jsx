import { useEffect, useState } from "react";
import api from "../api"; // ✅ Bug 1 & 2 fixed
import {
  Box, Heading, Input, Select, Button, FormControl, FormLabel,
  VStack, Spinner, Flex, Alert, AlertIcon, AlertDescription, Text,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CreateStaffPage = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("");
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isAdmin && !hasPermission("Staff_create")) {
      navigate("/admin/staff");
    }
  }, []);

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const res = await api.get("/role"); // ✅ fixed
      if (res.data && Array.isArray(res.data)) {
        let filtered = res.data.filter((r) => r.status === 1);
        if (!isAdmin) {
          filtered = filtered.filter((r) => r.name.toLowerCase() !== "admin");
        }
        setRoles(filtered);
      } else {
        setRoles([]);
      }
    } catch (err) {
      setRolesError("Unable to load roles. Please try again.");
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  // ✅ Bug 3 fixed — validation
  const validate = () => {
    if (!name.trim()) return "Name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (name.trim().length > 50) return "Name must be under 50 characters";
    if (!/^[a-zA-Z\s]+$/.test(name)) return "Name can only contain letters";

    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email";

    if (!mobile.trim()) return "Mobile is required";
    if (!/^[0-9]{10}$/.test(mobile)) return "Mobile must be exactly 10 digits";

    if (!role) return "Please select a role";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setLoading(true);
      await api.post("/staff/create", { name, email, mobile, role }); // ✅ fixed
      setSuccessMsg(`Staff created! Login credentials sent to ${email}`);
      setName(""); setEmail(""); setMobile(""); setRole("");
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Failed to create staff. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ mobile only numbers
  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, ""); // strip non-digits
    if (val.length <= 10) setMobile(val);
  };

  return (
    <Box maxW="500px" mx="auto" p="6" bg="white" borderRadius="md" boxShadow="md">
      <Heading size="lg" mb="6">👤 Create Staff</Heading>

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

      {rolesLoading ? (
        <Flex justify="center" py={10}><Spinner size="lg" /></Flex>
      ) : rolesError ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon /><AlertDescription>{rolesError}</AlertDescription>
        </Alert>
      ) : roles.length === 0 ? (
        <Alert status="warning" borderRadius="md">
          <AlertIcon /><AlertDescription>No roles available. Please create roles first.</AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm">Name</FormLabel>
              <Input placeholder="Enter full name" value={name}
                onChange={(e) => setName(e.target.value)} maxLength={50} />
              <Text fontSize="xs" color="gray.400" textAlign="right">{name.length}/50</Text>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Email</FormLabel>
              <Input placeholder="Enter email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} maxLength={100} />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Mobile</FormLabel>
              <Input placeholder="10 digit mobile number" value={mobile}
                onChange={handleMobileChange} maxLength={10} />
              <Text fontSize="xs" color="gray.400" textAlign="right">{mobile.length}/10</Text>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Role</FormLabel>
              <Select placeholder="Select Role" value={role}
                onChange={(e) => setRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </Select>
            </FormControl>

            <Button type="submit" colorScheme="blue" width="100%" isLoading={loading}>
              Create Staff
            </Button>
          </VStack>
        </form>
      )}
    </Box>
  );
};

export default CreateStaffPage;