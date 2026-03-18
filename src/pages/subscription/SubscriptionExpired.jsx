import {
  Box, Flex, VStack, Heading, Text, Button, HStack,
  useColorModeValue, Icon, Badge,
} from "@chakra-ui/react";
import { MdLockOutline, MdRefresh, MdLogout } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

export default function SubscriptionExpired() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const bg      = useColorModeValue("gray.50",  "gray.900");
  const cardBg  = useColorModeValue("white",    "gray.800");
  const subText = useColorModeValue("gray.500", "gray.400");
  const border  = useColorModeValue("gray.200", "gray.700");

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } finally {
      logout();
      navigate("/login");
    }
  };

  return (
    <Box bg={bg} minH="100vh" display="flex" alignItems="center" justifyContent="center" p={6}>
      <Box
        bg={cardBg}
        border="1px solid"
        borderColor={border}
        borderRadius="3xl"
        p={{ base: 8, md: 14 }}
        maxW="520px"
        w="full"
        textAlign="center"
        boxShadow="xl"
      >
        {/* Icon */}
        <Flex justify="center" mb={6}>
          <Box
            w="80px" h="80px" borderRadius="full"
            bg="red.50" _dark={{ bg: "red.900" }}
            display="flex" alignItems="center" justifyContent="center"
            border="2px solid" borderColor="red.200"
          >
            <Icon as={MdLockOutline} boxSize={9} color="red.500" />
          </Box>
        </Flex>

        <Badge colorScheme="red" px={4} py={1} borderRadius="full" fontSize="sm" mb={4}>
          Subscription Expired
        </Badge>

        <Heading size="lg" fontWeight="900" mb={3}>
          Your plan has expired
        </Heading>

        <Text color={subText} mb={2} fontSize="md">
          Your access to all features has been temporarily suspended.
          Renew your subscription to continue using the platform.
        </Text>

        <Text color={subText} fontSize="sm" mb={8}>
          Your data is safe — nothing has been deleted. Renew now to pick up right where you left off.
        </Text>

        {/* What's locked */}
        <Box
          bg={useColorModeValue("red.50", "red.900")}
          borderRadius="xl" p={4} mb={8} textAlign="left"
          border="1px solid" borderColor="red.200"
        >
          <Text fontWeight="700" fontSize="sm" color="red.600" _dark={{ color: "red.300" }} mb={2}>
            🔒 Currently blocked:
          </Text>
          {[
            "Creating tasks, issues & projects",
            "Managing staff & team",
            "Uploading documents",
            "All write actions",
          ].map(item => (
            <Text key={item} fontSize="sm" color="red.500" _dark={{ color: "red.400" }}>
              • {item}
            </Text>
          ))}
        </Box>

        <VStack spacing={3}>
          <Button
            w="full"
            colorScheme="purple"
            size="lg"
            borderRadius="xl"
            leftIcon={<MdRefresh />}
            fontWeight="700"
            onClick={() => navigate("/admin/subscription/pricing")}
          >
            Renew Subscription
          </Button>
          <Button
            w="full"
            variant="outline"
            size="md"
            borderRadius="xl"
            leftIcon={<MdLogout />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </VStack>

        <Text fontSize="xs" color={subText} mt={6}>
          Need help? Contact support or ask your SuperAdmin to renew your plan.
        </Text>
      </Box>
    </Box>
  );
}