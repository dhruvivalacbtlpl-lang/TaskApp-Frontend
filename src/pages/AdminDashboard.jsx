import { Box, Flex, Text } from "@chakra-ui/react";

function AdminDashboard() {
  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb="6">
        Dashboard Overview
      </Text>

      <Flex gap="6" wrap="wrap">
        {/* Total Tasks */}
        <Box bg="white" p="6" borderRadius="lg" boxShadow="md" w="250px">
          <Text fontSize="3xl" fontWeight="bold" color="blue.600">
            25
          </Text>
          <Text color="gray.600">Total Tasks</Text>
        </Box>

        {/* In Progress */}
        <Box bg="white" p="6" borderRadius="lg" boxShadow="md" w="250px">
          <Text fontSize="3xl" fontWeight="bold" color="orange.500">
            10
          </Text>
          <Text color="gray.600">In Progress</Text>
        </Box>

        {/* Completed */}
        <Box bg="white" p="6" borderRadius="lg" boxShadow="md" w="250px">
          <Text fontSize="3xl" fontWeight="bold" color="green.500">
            15
          </Text>
          <Text color="gray.600">Completed</Text>
        </Box>
      </Flex>
    </Box>
  );
}

export default AdminDashboard;
