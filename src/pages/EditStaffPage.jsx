import { useEffect, useState } from "react";
import api from "../api"; // ✅ Bug 4,5,6 fixed
import {
  Box, Heading, Input, Select, Button, FormControl, FormLabel,
  VStack, Spinner, Flex, Alert, AlertIcon, AlertDescription, Text,
} from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";

const EditStaffPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [staff, setStaff] = useState(null);
  const [roles, setRoles] = useState([]);
  const [pageLoading, setPageLoading] = useState(true); // ✅ Bug 7 fixed — separate loading
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchStaff = async () => {
    try {
      const res = await api.get(`/staff/${id}`); // ✅ fixed
      setStaff(res.data);
    } catch (err) {
      setErrorMsg("Failed to fetch staff details.");
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get("/role"); // ✅ fixed
      setRoles(res.data.filter((r) => r.status === 1) || []);
    } catch (err) {
      setRoles([]);
    }
  };

  useEffect(() => {
    // ✅ Bug 7 fixed — fetch both then stop loading
    Promise.all([fetchStaff(), fetchRoles()]).finally(() => setPageLoading(false));
  }, [id]);

  // ✅ validation
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
    setErrorMsg("");
    setSuccessMsg("");

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setSaving(true);
      await api.put(`/staff/${id}`, { // ✅ fixed
        name: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        role: staff.role?._id || staff.role,
      });
      setSuccessMsg("Staff updated successfully!");
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
    return <Flex justify="center" align="center" h="60vh"><Spinner size="xl" color="blue.500" /></Flex>;
  }

  return (
    <Box maxW="500px" mx="auto" p={6} bg="white" borderRadius="md" boxShadow="md">
      <Heading size="lg" mb="6">✏️ Edit Staff</Heading>

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
            <FormLabel fontSize="sm">Name</FormLabel>
            <Input placeholder="Name" value={staff?.name || ""}
              onChange={(e) => setStaff({ ...staff, name: e.target.value })}
              maxLength={50} />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Email</FormLabel>
            <Input placeholder="Email" type="email" value={staff?.email || ""}
              onChange={(e) => setStaff({ ...staff, email: e.target.value })} />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Mobile</FormLabel>
            <Input placeholder="10 digit mobile" value={staff?.mobile || ""}
              onChange={handleMobileChange} maxLength={10} />
            <Text fontSize="xs" color="gray.400" textAlign="right">
              {staff?.mobile?.length || 0}/10
            </Text>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Role</FormLabel>
            <Select placeholder="Select Role"
              value={staff?.role?._id || staff?.role || ""}
              onChange={(e) => setStaff({ ...staff, role: e.target.value })}>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </Select>
          </FormControl>

          <Button type="submit" colorScheme="blue" width="100%" isLoading={saving}>
            Update Staff
          </Button>
        </VStack>
      </form>
    </Box>
  );
};

export default EditStaffPage;