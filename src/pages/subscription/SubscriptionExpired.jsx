/**
 * SubscriptionExpired.jsx
 * Shown when a company's subscription/trial expires.
 * Path: /admin/subscription/expired
 *
 * - Owner sees plan cards + upgrade button
 * - Non-owner staff sees a "contact your owner" message
 */

import { useEffect, useState } from "react";
import {
  Box, Flex, VStack, HStack, Text, Heading, Button,
  Badge, Spinner, SimpleGrid, useColorModeValue, Divider,
} from "@chakra-ui/react";
import { MdLockOutline, MdCheckCircle, MdLogout } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

export default function SubscriptionExpired() {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [plans,    setPlans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [upgrading, setUpgrading] = useState(null);
  const [cycle,    setCycle]    = useState("monthly");

  const isOwner = user?.isOwner;
  const bg      = useColorModeValue("#F7FAFC", "#171923");
  const cardBg  = useColorModeValue("white", "gray.800");
  const border  = useColorModeValue("gray.200", "gray.700");

  // Superadmin should never land here
  useEffect(() => {
    if (isSuperAdmin) { navigate("/admin"); return; }
    fetchPlans();
  }, [isSuperAdmin]); // eslint-disable-line

  const fetchPlans = async () => {
    try {
      const res = await api.get("/subscription/plans");
      // Show only paid plans (exclude free)
      setPlans((res.data || []).filter(p => p.name !== "free"));
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    setUpgrading(planId);
    try {
      await api.post("/subscription/purchase", { planId, billingCycle: cycle });
      navigate("/admin");
      window.location.reload(); // refresh auth context
    } catch (err) {
      alert(err.response?.data?.message || "Upgrade failed. Please try again.");
    } finally {
      setUpgrading(null);
    }
  };

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } finally {
      logout();
      navigate("/login");
    }
  };

  return (
    <Flex minH="100vh" bg={bg} direction="column" align="center" justify="center" p={6}>
      {/* Lock icon + heading */}
      <VStack spacing={4} mb={10} textAlign="center">
        <Box
          w="72px" h="72px" borderRadius="full"
          bg="red.50" display="flex" alignItems="center" justifyContent="center"
        >
          <MdLockOutline size={38} color="#E53E3E" />
        </Box>
        <Heading size="xl" fontWeight="900">Your subscription has expired</Heading>
        <Text color="gray.500" maxW="480px">
          {isOwner
            ? "Choose a plan below to restore full access for your team."
            : "Your company's subscription has expired. Please contact your company owner to upgrade."}
        </Text>

        {!isOwner && (
          <Button
            leftIcon={<MdLogout />} colorScheme="red" variant="outline"
            onClick={handleLogout} mt={4}
          >
            Logout
          </Button>
        )}
      </VStack>

      {/* Plans — only show to owner */}
      {isOwner && (
        <>
          {/* Billing cycle toggle */}
          <HStack mb={8} spacing={0} borderRadius="lg" overflow="hidden"
            border="1px solid" borderColor={border}>
            {["monthly", "quarterly", "halfYearly", "yearly"].map(c => (
              <Button
                key={c} size="sm" borderRadius={0}
                bg={cycle === c ? "purple.500" : cardBg}
                color={cycle === c ? "white" : "gray.500"}
                _hover={{ bg: cycle === c ? "purple.600" : "gray.100" }}
                onClick={() => setCycle(c)}
                fontWeight={cycle === c ? "700" : "400"}
                px={4}
              >
                {c === "halfYearly" ? "6 Months" : c.charAt(0).toUpperCase() + c.slice(1)}
              </Button>
            ))}
          </HStack>

          {loading ? (
            <Spinner size="xl" color="purple.500" />
          ) : (
            <SimpleGrid columns={{ base: 1, md: plans.length }} spacing={6} maxW="900px" w="full">
              {plans.map(plan => (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  cycle={cycle}
                  onUpgrade={() => handleUpgrade(plan._id)}
                  isUpgrading={upgrading === plan._id}
                  cardBg={cardBg}
                  border={border}
                />
              ))}
            </SimpleGrid>
          )}

          <Button
            variant="ghost" color="gray.400" mt={8} size="sm"
            leftIcon={<MdLogout />} onClick={handleLogout}
          >
            Logout instead
          </Button>
        </>
      )}
    </Flex>
  );
}

function PlanCard({ plan, cycle, onUpgrade, isUpgrading, cardBg, border }) {
  const price = plan.pricing?.[cycle] ?? 0;
  const isPro = plan.name === "pro";

  const LIMIT_LABELS = {
    staff: "Staff", projects: "Projects", tasks: "Tasks",
    issues: "Issues", documents: "Documents", taskStatuses: "Task Statuses",
    devices: "Devices",
  };

  return (
    <Box
      bg={cardBg} border="2px solid" borderRadius="2xl" p={7}
      borderColor={isPro ? "purple.400" : border}
      boxShadow={isPro ? "0 0 0 4px rgba(128,90,213,0.15)" : "sm"}
      position="relative"
    >
      {isPro && (
        <Badge
          colorScheme="purple" position="absolute" top={-3} left="50%"
          transform="translateX(-50%)" px={4} py={1} borderRadius="full" fontSize="xs"
        >
          Most Popular
        </Badge>
      )}

      <VStack align="start" spacing={1} mb={4}>
        <HStack>
          <Text fontWeight="800" fontSize="xl">{plan.displayName}</Text>
          <Badge colorScheme={isPro ? "purple" : "blue"} borderRadius="md">{plan.name}</Badge>
        </HStack>
        <Text fontSize="sm" color="gray.500">{plan.description}</Text>
      </VStack>

      <HStack align="baseline" mb={6}>
        <Text fontSize="4xl" fontWeight="900" color={isPro ? "purple.500" : "gray.700"}>
          ${price}
        </Text>
        <Text fontSize="sm" color="gray.400">
          / {cycle === "halfYearly" ? "6 months" : cycle.replace("ly", "")}
        </Text>
      </HStack>

      <Divider mb={5} />

      <VStack align="start" spacing={2} mb={8}>
        {Object.entries(plan.limits || {}).map(([key, val]) => (
          LIMIT_LABELS[key] && (
            <HStack key={key} spacing={2}>
              <MdCheckCircle color={isPro ? "#805AD5" : "#38A169"} size={16} />
              <Text fontSize="sm">
                {val === -1 ? "Unlimited" : val} {LIMIT_LABELS[key]}
              </Text>
            </HStack>
          )
        ))}
        {plan.features?.bulkUpload && (
          <HStack spacing={2}>
            <MdCheckCircle color="#805AD5" size={16} />
            <Text fontSize="sm">Bulk Upload</Text>
          </HStack>
        )}
        {plan.features?.prioritySupport && (
          <HStack spacing={2}>
            <MdCheckCircle color="#805AD5" size={16} />
            <Text fontSize="sm">Priority Support</Text>
          </HStack>
        )}
      </VStack>

      <Button
        w="full" colorScheme={isPro ? "purple" : "blue"} size="lg"
        isLoading={isUpgrading} loadingText="Upgrading..."
        onClick={onUpgrade} borderRadius="xl" fontWeight="700"
      >
        Choose {plan.displayName}
      </Button>
    </Box>
  );
}