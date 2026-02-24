import { useEffect, useState } from "react";
import api from "../api";
import {
  Box, Heading, Text, Stack, Avatar, Button,
  Flex, Divider, Badge, Spinner, Alert, AlertIcon,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { MdArrowBack, MdPerson, MdEmail, MdPhone } from "react-icons/md";
import { useAuth } from "../context/AuthContext";

function AdminProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  useEffect(() => {
    api.get("/auth/profile")
      .then((res) => setProfile(res.data))
      .catch((err) => setErrorMsg("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Flex justify="center" align="center" h="60vh">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  return (
    <Box>
      {/* Back Button */}
      <Button
        mb={6} colorScheme="blue" variant="outline" size="sm"
        leftIcon={<MdArrowBack size={16} />}
        onClick={() => navigate("/admin")}
      >
        Back to Dashboard
      </Button>

      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />{errorMsg}
        </Alert>
      )}

      {/* Profile Card */}
      <Box bg="white" maxW="620px" mx="auto" p={8} borderRadius="lg" boxShadow="md" border="1px solid" borderColor="gray.200">
        <Flex align="center" mb={6}>
          <Avatar size="xl" name={profile?.name} mr={4} bg="blue.600" color="white" />
          <Box>
            <Heading size="md" color="gray.800">{profile?.name}</Heading>
            <Badge colorScheme={isAdmin ? "blue" : "green"} fontSize="sm" mt={1}>
              {profile?.role?.name || "Staff"}
            </Badge>
          </Box>
        </Flex>

        <Divider mb={6} />

        <Stack spacing={5}>
          <Flex align="center" gap={3}>
            <Box bg="blue.50" p={2} borderRadius="md"><MdPerson size={20} color="#3b82f6" /></Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Full Name</Text>
              <Text color="gray.800" fontWeight="500">{profile?.name || "—"}</Text>
            </Box>
          </Flex>

          <Flex align="center" gap={3}>
            <Box bg="green.50" p={2} borderRadius="md"><MdEmail size={20} color="#10b981" /></Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Email</Text>
              <Text color="gray.800" fontWeight="500">{profile?.email || "—"}</Text>
            </Box>
          </Flex>

          <Flex align="center" gap={3}>
            <Box bg="purple.50" p={2} borderRadius="md"><MdPhone size={20} color="#8b5cf6" /></Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Mobile</Text>
              <Text color="gray.800" fontWeight="500">{profile?.mobile || "—"}</Text>
            </Box>
          </Flex>
        </Stack>
      </Box>
    </Box>
  );
}

export default AdminProfile;