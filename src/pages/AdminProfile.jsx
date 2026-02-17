import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Heading,
  Text,
  Stack,
  Avatar,
  Button,
  Flex,
  Divider,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

function AdminProfile() {
  const [admin, setAdmin] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/auth/profile", {
        withCredentials: true,
      })
      .then((res) => setAdmin(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <Box bg="gray.100" minH="100vh" p={8}>
      {/* Back Button */}
      <Button
        mb={6}
        colorScheme="blue"
        variant="outline"
        size="sm"
        onClick={() => navigate("/admin")}
      >
        ← Back to Dashboard
      </Button>

      {/* Profile Card */}
      <Box
        bg="white"
        maxW="620px"
        mx="auto"
        p={8}
        borderRadius="lg"
        boxShadow="md"
        border="1px solid"
        borderColor="gray.200"
      >
        <Flex align="center" mb={6}>
          <Avatar
            size="lg"
            name={admin.name}
            mr={4}
            bg="blue.600"
            color="white"
          />
          <Box>
            <Heading size="md" color="gray.800">
              {admin.name}
            </Heading>
            <Text color="blue.600" fontSize="sm" fontWeight="medium">
              Administrator
            </Text>
          </Box>
        </Flex>

        <Divider mb={4} />

        <Stack spacing={4}>
          <Flex>
            <Text w="120px" color="gray.500" fontWeight="semibold">
              Email
            </Text>
            <Text color="gray.800">{admin.email}</Text>
          </Flex>

          <Flex>
            <Text w="120px" color="gray.500" fontWeight="semibold">
              Mobile
            </Text>
            <Text color="gray.800">{admin.mobile}</Text>
          </Flex>
        </Stack>
      </Box>
    </Box>
  );
}

export default AdminProfile;
