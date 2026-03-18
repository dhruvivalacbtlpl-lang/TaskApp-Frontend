import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Text, Button, Badge, VStack, HStack,
  SimpleGrid, useColorModeValue, Spinner, Center, useToast,
  Switch, FormLabel, Divider, Icon, List, ListItem, ListIcon,
} from "@chakra-ui/react";
import { MdCheck, MdClose, MdStar } from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const CYCLE_LABELS = {
  monthly:    "Monthly",
  quarterly:  "3 Months",
  halfYearly: "6 Months",
  yearly:     "Yearly",
};

const CYCLE_SAVINGS = {
  monthly:    null,
  quarterly:  "Save 10%",
  halfYearly: "Save 15%",
  yearly:     "Save 20%",
};

const FEATURE_LABELS = {
  staff:           "Staff members",
  projects:        "Projects",
  teamMembers:     "Team members per project",
  tasks:           "Tasks per period",
  issues:          "Issues per period",
  documents:       "Documents",
  taskStatuses:    "Task statuses",
  bulkUpload:      "Bulk upload rows",
  devices:         "Concurrent devices",
};

function formatLimit(val) {
  if (val === -1)  return "Unlimited";
  if (val === 0)   return "Not included";
  return val.toLocaleString();
}

function PlanCard({ plan, billingCycle, currentPlanId, onSelect, loading }) {
  const isCurrent  = currentPlanId === plan._id;
  const isPro      = plan.name === "pro";
  const price      = plan.pricing?.[billingCycle] || 0;
  const isFree     = price === 0;

  const cardBg    = useColorModeValue("white",    "gray.800");
  const border    = useColorModeValue("gray.200", "gray.600");
  const subText   = useColorModeValue("gray.500", "gray.400");

  return (
    <Box
      bg={cardBg}
      border="2px solid"
      borderColor={isPro ? plan.color || "purple.400" : isCurrent ? "blue.400" : border}
      borderRadius="2xl"
      p={6}
      position="relative"
      boxShadow={isPro ? "0 8px 32px rgba(139,92,246,0.15)" : "sm"}
      transition="transform 0.2s"
      _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
    >
      {isPro && (
        <Badge
          position="absolute" top="-3" left="50%" transform="translateX(-50%)"
          colorScheme="purple" px={4} py={1} borderRadius="full" fontSize="xs"
          fontWeight="700" textTransform="uppercase" letterSpacing="wide"
        >
          ⭐ Most Popular
        </Badge>
      )}
      {isCurrent && (
        <Badge
          position="absolute" top="-3" right="4"
          colorScheme="green" px={3} py={1} borderRadius="full" fontSize="xs"
        >
          Current Plan
        </Badge>
      )}

      <VStack align="start" spacing={4}>
        {/* Plan name + price */}
        <Box>
          <HStack mb={1}>
            <Box w={3} h={3} borderRadius="full" bg={plan.color || "gray.400"} />
            <Text fontWeight="800" fontSize="lg" textTransform="uppercase" letterSpacing="wide">
              {plan.displayName}
            </Text>
          </HStack>
          <Text fontSize="xs" color={subText} mb={3}>{plan.description}</Text>
          <HStack align="baseline" spacing={1}>
            <Text fontSize="3xl" fontWeight="900">${price}</Text>
            <Text fontSize="sm" color={subText}>/ {CYCLE_LABELS[billingCycle]?.toLowerCase()}</Text>
          </HStack>
          {CYCLE_SAVINGS[billingCycle] && !isFree && (
            <Badge colorScheme="green" fontSize="xs" mt={1}>{CYCLE_SAVINGS[billingCycle]}</Badge>
          )}
        </Box>

        <Divider />

        {/* Feature limits */}
        <VStack align="start" spacing={2} w="full">
          {Object.entries(FEATURE_LABELS).map(([key, label]) => {
            const val     = plan.limits?.[key];
            const enabled = val !== 0 && val !== undefined;
            return (
              <HStack key={key} spacing={2} w="full">
                <Icon
                  as={enabled ? MdCheck : MdClose}
                  color={enabled ? "green.400" : "gray.300"}
                  boxSize={4}
                  flexShrink={0}
                />
                <Text fontSize="sm" color={enabled ? undefined : subText} flex={1}>{label}</Text>
                <Text fontSize="sm" fontWeight="600" color={val === -1 ? "green.500" : undefined}>
                  {formatLimit(val)}
                </Text>
              </HStack>
            );
          })}

          {/* Feature flags */}
          <HStack spacing={2} w="full">
            <Icon as={plan.features?.notifications ? MdCheck : MdClose}
              color={plan.features?.notifications ? "green.400" : "gray.300"} boxSize={4} flexShrink={0} />
            <Text fontSize="sm" color={plan.features?.notifications ? undefined : subText} flex={1}>
              Notifications
            </Text>
          </HStack>
          <HStack spacing={2} w="full">
            <Icon as={plan.features?.prioritySupport ? MdCheck : MdClose}
              color={plan.features?.prioritySupport ? "green.400" : "gray.300"} boxSize={4} flexShrink={0} />
            <Text fontSize="sm" color={plan.features?.prioritySupport ? undefined : subText} flex={1}>
              Priority support
            </Text>
          </HStack>
        </VStack>

        <Button
          w="full"
          colorScheme={isPro ? "purple" : isCurrent ? "gray" : "blue"}
          variant={isCurrent ? "outline" : "solid"}
          isDisabled={isCurrent || isFree}
          isLoading={loading === plan._id}
          onClick={() => !isCurrent && !isFree && onSelect(plan._id)}
          borderRadius="xl"
          fontWeight="700"
        >
          {isCurrent ? "Current Plan" : isFree ? "Free Forever" : `Get ${plan.displayName}`}
        </Button>
      </VStack>
    </Box>
  );
}

export default function PricingPage() {
  const [plans,        setPlans]        = useState([]);
  const [currentSub,   setCurrentSub]   = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading,      setLoading]      = useState(true);
  const [purchasing,   setPurchasing]   = useState(null);

  const toast    = useToast();
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();

  const bg      = useColorModeValue("gray.50",  "gray.900");
  const subText = useColorModeValue("gray.600", "gray.400");

  useEffect(() => {
    const load = async () => {
      try {
        const [plansRes, subRes] = await Promise.all([
          api.get("/subscription/plans"),
          !isSuperAdmin ? api.get("/subscription/my") : Promise.resolve({ data: null }),
        ]);
        setPlans(plansRes.data || []);
        setCurrentSub(subRes?.data?.subscription || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isSuperAdmin]);

  const handleSelect = async (planId) => {
    setPurchasing(planId);
    try {
      await api.post("/subscription/purchase", { planId, billingCycle });
      toast({ title: "Plan activated!", status: "success", duration: 3000, borderRadius: "xl" });
      navigate("/admin/subscription/current");
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Purchase failed",
        status: "error", duration: 4000, borderRadius: "xl",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const cycles = ["monthly", "quarterly", "halfYearly", "yearly"];

  if (loading) return <Center h="60vh"><Spinner size="xl" /></Center>;

  return (
    <Box bg={bg} minH="100vh" px={{ base: 4, md: 8 }} py={10}>
      {/* Header */}
      <VStack spacing={3} mb={10} textAlign="center">
        <Badge colorScheme="purple" px={4} py={1} borderRadius="full" fontSize="sm">
          Subscription Plans
        </Badge>
        <Heading size="xl" fontWeight="900">Choose the right plan for your team</Heading>
        <Text color={subText} maxW="500px">
          Start free, upgrade when you're ready. All plans include core features.
          Cancel or change anytime.
        </Text>
      </VStack>

      {/* Billing cycle toggle */}
      <Flex justify="center" mb={10}>
        <HStack
          bg={useColorModeValue("white", "gray.800")}
          borderRadius="2xl"
          p={1}
          border="1px solid"
          borderColor={useColorModeValue("gray.200", "gray.600")}
          spacing={1}
        >
          {cycles.map(cycle => (
            <Button
              key={cycle}
              size="sm"
              borderRadius="xl"
              variant={billingCycle === cycle ? "solid" : "ghost"}
              colorScheme={billingCycle === cycle ? "purple" : "gray"}
              onClick={() => setBillingCycle(cycle)}
              position="relative"
            >
              {CYCLE_LABELS[cycle]}
              {CYCLE_SAVINGS[cycle] && (
                <Badge
                  position="absolute" top="-2" right="-2"
                  colorScheme="green" fontSize="8px" px={1} borderRadius="full"
                >
                  {CYCLE_SAVINGS[cycle]}
                </Badge>
              )}
            </Button>
          ))}
        </HStack>
      </Flex>

      {/* Plan cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} maxW="1000px" mx="auto">
        {plans.map(plan => (
          <PlanCard
            key={plan._id}
            plan={plan}
            billingCycle={billingCycle}
            currentPlanId={currentSub?.plan?._id || currentSub?.plan}
            onSelect={handleSelect}
            loading={purchasing}
          />
        ))}
      </SimpleGrid>

      <Text textAlign="center" mt={10} fontSize="sm" color={subText}>
        💳 No real payment required — this is a demo. Real payment integration coming soon.
      </Text>
    </Box>
  );
}