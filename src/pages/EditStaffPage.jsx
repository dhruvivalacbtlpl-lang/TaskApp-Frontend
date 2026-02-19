import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Heading, Input, Select, Button,
  VStack, Spinner, Flex, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";

const EditStaffPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [staff, setStaff] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/staff/${id}`);
      setStaff(res.data);
    } catch (err) {
      setErrorMsg("Failed to fetch staff details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const res = await axios.get("/role");
      setRoles(res.data.filter((r) => r.status === 1) || []);
    } catch (err) {
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!staff.name || !staff.email || !staff.mobile || !staff.role) {
      setErrorMsg("All fields are required.");
      return;
    }

    try {
      setLoading(true);
      await axios.put(`/staff/${id}`, { ...staff, role: staff.role });
      setSuccessMsg("Staff updated successfully!");
      setTimeout(() => navigate("/admin/staff"), 1500);
    } catch (err) {
      setErrorMsg("Failed to update staff. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !staff) {
    return (
      <Flex justify="center" align="center" h="80vh"><Spinner size="xl" /></Flex>
    );
  }

  return (
    <Box maxW="500px" mx="auto" mt="10" p={6} bg="white" borderRadius="md" boxShadow="md">
      <Heading size="lg" mb="6">Edit Staff</Heading>

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

      {rolesLoading ? (
        <Flex justify="center" py={10}><Spinner size="lg" /></Flex>
      ) : (
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <Input placeholder="Name" value={staff.name}
              onChange={(e) => setStaff({ ...staff, name: e.target.value })} />
            <Input placeholder="Email" type="email" value={staff.email}
              onChange={(e) => setStaff({ ...staff, email: e.target.value })} />
            <Input placeholder="Mobile" value={staff.mobile}
              onChange={(e) => setStaff({ ...staff, mobile: e.target.value })} />
            <Select placeholder="Select Role"
              value={staff.role?._id || staff.role || ""}
              onChange={(e) => setStaff({ ...staff, role: e.target.value })}>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </Select>
            <Button type="submit" colorScheme="blue" width="100%" isLoading={loading}>
              Update Staff
            </Button>
          </VStack>
        </form>
      )}
    </Box>
  );
};

export default EditStaffPage;