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
  useToast,
} from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";

const EditStaffPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [staff, setStaff] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Fetch staff
  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/staff/${id}`);
      setStaff(res.data);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to fetch staff", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const res = await axios.get("http://localhost:5000/api/role");
      setRoles(res.data.filter((r) => r.status === 1) || []);
    } catch (err) {
      console.error(err);
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, [id]);

  // Update staff
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staff.name || !staff.email || !staff.mobile || !staff.role) {
      toast({ title: "All fields are required", status: "warning" });
      return;
    }

    try {
      setLoading(true);
      await axios.put(`http://localhost:5000/api/staff/${id}`, {
        ...staff,
        role: staff.role, // role is just the _id
      });
      toast({ title: "Staff updated successfully", status: "success" });
      navigate("/admin/staff");
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to update staff", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !staff) {
    return (
      <Flex justify="center" align="center" h="80vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box maxW="500px" mx="auto" mt="10" p={6} bg="white" borderRadius="md" boxShadow="md">
      <Heading size="lg" mb="6">
        Edit Staff
      </Heading>

      {rolesLoading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" />
        </Flex>
      ) : (
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <Input
              placeholder="Name"
              value={staff.name}
              onChange={(e) => setStaff({ ...staff, name: e.target.value })}
            />
            <Input
              placeholder="Email"
              type="email"
              value={staff.email}
              onChange={(e) => setStaff({ ...staff, email: e.target.value })}
            />
            <Input
              placeholder="Mobile"
              value={staff.mobile}
              onChange={(e) => setStaff({ ...staff, mobile: e.target.value })}
            />
            <Select
              placeholder="Select Role"
              value={staff.role?._id || staff.role || ""}
              onChange={(e) => setStaff({ ...staff, role: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
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
