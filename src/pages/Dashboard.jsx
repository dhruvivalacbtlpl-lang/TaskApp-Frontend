import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
} from "@chakra-ui/react";
import apiRequest from "../api";

function Dashboard() {
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const data = await apiRequest("/api/users");
    setStaff(data);
  };

  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    window.location = "/";
  };

  return (
    <Box bg="gray.50" minH="100vh" p={8}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Admin Dashboard</Heading>
        <Button colorScheme="red" onClick={logout}>
          Logout
        </Button>
      </Flex>

      {/* Staff Table */}
      <Box bg="white" p={6} borderRadius="md" shadow="md">
        <Heading size="md" mb={4}>
          Staff List
        </Heading>

        <Table variant="simple">
          <Thead bg="gray.100">
            <Tr>
              <Th>#</Th>
              <Th>Name</Th>
              <Th>Email</Th>
            </Tr>
          </Thead>

          <Tbody>
            {staff.length === 0 ? (
              <Tr>
                <Td colSpan="3" textAlign="center">
                  No staff found
                </Td>
              </Tr>
            ) : (
              staff.map((s, i) => (
                <Tr key={s._id}>
                  <Td>{i + 1}</Td>
                  <Td>{s.name}</Td>
                  <Td>{s.email}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

export default Dashboard;
