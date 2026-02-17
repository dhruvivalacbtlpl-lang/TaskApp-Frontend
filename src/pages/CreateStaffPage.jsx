// src/pages/CreateStaffPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Heading,
  Input,
  Select,
  Button,
  VStack,
  Spinner,
  Flex,
  Text,
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

  // Page protection
  useEffect(() => {
    if (!isAdmin && !hasPermission("Staff_create")) {
      navigate("/admin/staff");
    }
  }, []);

  // Fetch roles
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const res = await axios.get("http://localhost:5000/api/role");
      if (res.data && Array.isArray(res.data)) {
        // Only active roles
        const activeRoles = res.data.filter((r) => r.status === 1);
        setRoles(activeRoles);
      } else {
        setRoles([]);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      setRolesError("Unable to load roles. Please try again.");
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !mobile || !role) {
      alert("All fields required");
      return;
    }

    try {
      setLoading(true);
      await axios.post("http://localhost:5000/api/staff/create", {
        name,
        email,
        mobile,
        role,
      });
      navigate("/admin/staff");
    } catch (err) {
      console.error("Error creating staff:", err);
      alert("Failed to create staff. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="500px" mx="auto" mt="10" p="6" bg="white" borderRadius="md" boxShadow="md">
      <Heading size="lg" mb="6">
        Create Staff
      </Heading>

      {rolesLoading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" />
        </Flex>
      ) : rolesError ? (
        <Text color="red.500">{rolesError}</Text>
      ) : roles.length === 0 ? (
        <Text>No roles available. Please create roles first.</Text>
      ) : (
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder="Mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />

            <Select
              placeholder="Select Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
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
