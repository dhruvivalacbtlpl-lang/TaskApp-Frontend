import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Flex,
  Spinner,
  Avatar,
  Stack,
  Divider,
  Button,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function StaffProfile() {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchStaffProfile();
  }, []);

  const fetchStaffProfile = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/auth/profile", {
        withCredentials: true,
      });

      setStaff(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch staff profile:", err);
      setError("Could not load profile. Please login again.");
      setLoading(false);
    }
  };

  if (loading)
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" />
      </Flex>
    );

  if (error)
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Text color="red.500">{error}</Text>
      </Flex>
    );

  return (
    <Box bg="gray.50" minH="100vh" p={8}>
      {/* Back to Dashboard */}
      <Flex mb={6}>
        <Button colorScheme="blue" onClick={() => navigate("/staff/dashboard")}>
          &larr; Back to Dashboard
        </Button>
      </Flex>

      <Flex direction="column" align="center" mb={6}>
        <Avatar
          name={staff.name}
          size="xl"
          mb={3}
          bg="blue.400"
          color="white"
        />
        <Heading size="md">{staff.name}</Heading>
        <Text color="gray.600">{staff.role || "Staff"}</Text>
      </Flex>

      {/* Smaller Profile Card */}
      <Box
        bg="white"
        p={5}
        borderRadius="md"
        shadow="md"
        maxW="400px"
        mx="auto"
      >
        <Heading size="sm" mb={4}>
          Profile Details
        </Heading>

        <Stack spacing={2}>
          <Flex justify="space-between">
            <Text fontWeight="600">Email:</Text>
            <Text>{staff.email}</Text>
          </Flex>
          <Divider />
          <Flex justify="space-between">
            <Text fontWeight="600">Mobile:</Text>
            <Text>{staff.mobile || "N/A"}</Text>
          </Flex>
          <Divider />
          <Flex justify="space-between">
            <Text fontWeight="600">Role:</Text>
            <Text>{staff.role || "Staff"}</Text>
          </Flex>
          <Divider />
          <Flex justify="space-between">
            <Text fontWeight="600">Joined At:</Text>
            <Text>{new Date(staff.createdAt).toLocaleDateString()}</Text>
          </Flex>
        </Stack>
      </Box>
    </Box>
  );
}

export default StaffProfile;
