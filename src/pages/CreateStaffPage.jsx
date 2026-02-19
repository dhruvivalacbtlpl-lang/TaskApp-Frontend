import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Heading, Input, Select, Button,
  VStack, Spinner, Flex, Text, Alert, AlertIcon, AlertDescription,
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
      const res = await axios.get("/role");
      if (res.data && Array.isArray(res.data)) {
        setRoles(res.data.filter((r) => r.status === 1));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name || !email || !mobile || !role) {
      setErrorMsg("All fields are required.");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/staff/create", { name, email, mobile, role });
      setSuccessMsg(`Staff created successfully! Login credentials sent to ${email}`);
      setName(""); setEmail(""); setMobile(""); setRole("");
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Failed to create staff. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="500px" mx="auto" mt="10" p="6" bg="white" borderRadius="md" boxShadow="md">
      <Heading size="lg" mb="6">Create Staff</Heading>

      {/* ✅ Success Message */}
      {successMsg && (
        <Alert status="success" borderRadius="md" mb={4}>
          <AlertIcon />
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* ✅ Error Message */}
      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          <AlertDescription>{errorMsg}</AlertDescription>
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
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <Select placeholder="Select Role" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </Select>
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