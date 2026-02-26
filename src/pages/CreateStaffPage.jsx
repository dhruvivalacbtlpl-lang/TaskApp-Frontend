import { useEffect, useState } from "react";
import api from "../api";
import {
  Box, Heading, Input, Select, Button, FormControl, FormLabel,
  VStack, Spinner, Flex, Alert, AlertIcon, AlertDescription, Text,
  useColorModeValue, IconButton,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MdArrowBack } from "react-icons/md";

const CreateStaffPage = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [mobile, setMobile]     = useState("");
  const [role, setRole]         = useState("");
  const [roles, setRoles]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError]     = useState("");
  const [successMsg, setSuccessMsg]     = useState("");
  const [errorMsg, setErrorMsg]         = useState("");

  const cardBg    = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.800", "white");
  const subColor  = useColorModeValue("gray.500", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  useEffect(() => {
    if (!isAdmin && !hasPermission("Staff_create")) navigate("/admin/staff");
  }, []);

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const res = await api.get("/role");
      if (res.data && Array.isArray(res.data)) {
        let filtered = res.data.filter(r => r.status === 1);
        if (!isAdmin) filtered = filtered.filter(r => r.name.toLowerCase() !== "admin");
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
    setErrorMsg(""); setSuccessMsg("");
    const validationError = validate();
    if (validationError) { setErrorMsg(validationError); return; }
    try {
      setLoading(true);
      await api.post("/staff/create", { name, email, mobile, role });
      setSuccessMsg(`Staff created! Login credentials sent to ${email}`);
      setName(""); setEmail(""); setMobile(""); setRole("");
      // redirect after short delay so user sees success message
      setTimeout(() => navigate("/admin/staff"), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Failed to create staff. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 10) setMobile(val);
  };

  return (
    <Box maxW="500px" mx="auto" p="6" bg={cardBg} borderRadius="md" boxShadow="md">

      {/* HEADER with back button */}
      <Flex align="center" gap={3} mb={6}>
        <IconButton
          icon={<MdArrowBack size={20} />}
          aria-label="Go back"
          variant="outline"
          size="sm"
          borderColor={borderColor}
          color={textColor}
          onClick={() => navigate("/admin/staff")}
          _hover={{ bg: "brand.50", borderColor: "brand.300", color: "brand.600",
            _dark: { bg: "gray.700", borderColor: "brand.500", color: "brand.300" } }}
        />
        <Heading size="lg" color={textColor}>👤 Create Staff</Heading>
      </Flex>

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
              <FormLabel fontSize="sm" color={textColor}>Name</FormLabel>
              <Input
                placeholder="Enter full name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
              />
              <Text fontSize="xs" color={subColor} textAlign="right">{name.length}/50</Text>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color={textColor}>Email</FormLabel>
              <Input
                placeholder="Enter email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                maxLength={100}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color={textColor}>Mobile</FormLabel>
              <Input
                placeholder="10 digit mobile number"
                value={mobile}
                onChange={handleMobileChange}
                maxLength={10}
              />
              <Text fontSize="xs" color={subColor} textAlign="right">{mobile.length}/10</Text>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color={textColor}>Role</FormLabel>
              <Select
                placeholder="Select Role"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </Select>
            </FormControl>

            <Flex gap={3} w="100%">
              <Button
                flex={1}
                variant="outline"
                borderColor={borderColor}
                color={textColor}
                onClick={() => navigate("/admin/staff")}
                leftIcon={<MdArrowBack />}
              >
                Back
              </Button>
              <Button
                flex={2}
                type="submit"
                colorScheme="brand"
                isLoading={loading}
                loadingText="Creating..."
              >
                Create Staff
              </Button>
            </Flex>

          </VStack>
        </form>
      )}
    </Box>
  );
};

export default CreateStaffPage;