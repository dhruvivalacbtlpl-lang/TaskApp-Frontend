import { useEffect, useState } from "react";
import api from "../api";
import {
  Box, Heading, Input, Select, Button, FormControl, FormLabel,
  VStack, Spinner, Flex, Alert, AlertIcon, AlertDescription, Text,
  useColorModeValue, IconButton,
} from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";

const EditStaffPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [staff, setStaff]           = useState(null);
  const [roles, setRoles]           = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]     = useState("");

  const cardBg      = useColorModeValue("white", "gray.800");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.500", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const fetchStaff = async () => {
    try {
      const res = await api.get(`/staff/${id}`);
      setStaff(res.data);
    } catch (err) {
      setErrorMsg("Failed to fetch staff details.");
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get("/role");
      setRoles(res.data.filter(r => r.status === 1) || []);
    } catch (err) {
      setRoles([]);
    }
  };

  useEffect(() => {
    Promise.all([fetchStaff(), fetchRoles()]).finally(() => setPageLoading(false));
  }, [id]);

  const validate = () => {
    if (!staff.name?.trim()) return "Name is required";
    if (!/^[a-zA-Z\s]+$/.test(staff.name)) return "Name can only contain letters";
    if (!staff.email?.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staff.email)) return "Enter a valid email";
    if (!staff.mobile?.trim()) return "Mobile is required";
    if (!/^[0-9]{10}$/.test(staff.mobile)) return "Mobile must be exactly 10 digits";
    if (!staff.role) return "Please select a role";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");
    const validationError = validate();
    if (validationError) { setErrorMsg(validationError); return; }
    try {
      setSaving(true);
      await api.put(`/staff/${id}`, {
        name: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        role: staff.role?._id || staff.role,
      });
      setSuccessMsg("Staff updated successfully!");
      // redirect after short delay so user sees success message
      setTimeout(() => navigate("/admin/staff"), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Failed to update staff.");
    } finally {
      setSaving(false);
    }
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 10) setStaff({ ...staff, mobile: val });
  };

  if (pageLoading) {
    return (
      <Flex justify="center" align="center" h="60vh">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  return (
    <Box maxW="500px" mx="auto" p={6} bg={cardBg} borderRadius="md" boxShadow="md">

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
        <Heading size="lg" color={textColor}>✏️ Edit Staff</Heading>
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

      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>

          <FormControl>
            <FormLabel fontSize="sm" color={textColor}>Name</FormLabel>
            <Input
              placeholder="Name"
              value={staff?.name || ""}
              onChange={e => setStaff({ ...staff, name: e.target.value })}
              maxLength={50}
            />
            <Text fontSize="xs" color={subColor} textAlign="right">
              {staff?.name?.length || 0}/50
            </Text>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm" color={textColor}>Email</FormLabel>
            <Input
              placeholder="Email"
              type="email"
              value={staff?.email || ""}
              onChange={e => setStaff({ ...staff, email: e.target.value })}
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm" color={textColor}>Mobile</FormLabel>
            <Input
              placeholder="10 digit mobile"
              value={staff?.mobile || ""}
              onChange={handleMobileChange}
              maxLength={10}
            />
            <Text fontSize="xs" color={subColor} textAlign="right">
              {staff?.mobile?.length || 0}/10
            </Text>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm" color={textColor}>Role</FormLabel>
            <Select
              placeholder="Select Role"
              value={staff?.role?._id || staff?.role || ""}
              onChange={e => setStaff({ ...staff, role: e.target.value })}
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
              isLoading={saving}
              loadingText="Saving..."
            >
              Update Staff
            </Button>
          </Flex>

        </VStack>
      </form>
    </Box>
  );
};

export default EditStaffPage;