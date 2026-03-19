import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Text, Button, Badge, VStack, HStack,
  SimpleGrid, useColorModeValue, Spinner, Center, useToast,
  Divider, Icon, Checkbox, CheckboxGroup, Stack,
} from "@chakra-ui/react";
import {
  MdCheck, MdClose, MdStar, MdPeople, MdFolder, MdCheckBox,
  MdBugReport, MdDescription, MdUploadFile, MdDevices,
  MdNotifications, MdSupportAgent, MdLabel,
} from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

// ── Billing cycle options ──────────────────────────────────────────────────────
const CYCLES = [
  { value: "monthly",    label: "Monthly",  save: null        },
  { value: "quarterly",  label: "3 Months", save: "Save 10%"  },
  { value: "halfYearly", label: "6 Months", save: "Save 15%"  },
  { value: "yearly",     label: "Yearly",   save: "Save 20%"  },
];

// ── Feature rows with icons ────────────────────────────────────────────────────
const LIMIT_FEATURES = [
  { key: "staff",        label: "Staff Members",          icon: MdPeople      },
  { key: "projects",     label: "Projects",               icon: MdFolder      },
  { key: "teamMembers",  label: "Team Members",           icon: MdPeople      },
  { key: "tasks",        label: "Tasks",                  icon: MdCheckBox    },
  { key: "issues",       label: "Issues",                 icon: MdBugReport   },
  { key: "documents",    label: "Documents",              icon: MdDescription },
  { key: "taskStatuses", label: "Task Statuses",          icon: MdLabel       },
  { key: "bulkUpload",   label: "Bulk Upload Rows",       icon: MdUploadFile  },
  { key: "devices",      label: "Concurrent Devices",     icon: MdDevices     },
];

const FLAG_FEATURES = [
  { key: "notifications",   label: "Notifications",    icon: MdNotifications },
  { key: "bulkUpload",      label: "Bulk Upload",       icon: MdUploadFile    },
  { key: "prioritySupport", label: "Priority Support",  icon: MdSupportAgent  },
];

const formatLimit = (val) => {
  if (val === -1) return "Unlimited";
  if (val === 0)  return null; // not included — show X
  return val.toLocaleString();
};

// ── Single Plan Card ───────────────────────────────────────────────────────────
function PlanCard({ plan, billingCycle, currentPlanId, onSelect, purchasing }) {
  const isCurrent = currentPlanId === plan._id;
  const isPro     = plan.name === "pro";
  const price     = plan.pricing?.[billingCycle] || 0;
  const isFree    = price === 0;

  const cardBg    = useColorModeValue("white",    "gray.800");
  const border    = useColorModeValue("gray.200", "gray.600");
  const subText   = useColorModeValue("gray.500", "gray.400");
  const featureBg = useColorModeValue("gray.50",  "gray.700");

  const accentColor = plan.color || "#8b5cf6";

  return (
    <Box
      bg={cardBg}
      border="2px solid"
      borderColor={isCurrent ? "purple.400" : isPro ? accentColor : border}
      borderRadius="2xl"
      overflow="hidden"
      position="relative"
      boxShadow={isPro ? "0 8px 32px rgba(139,92,246,0.2)" : "sm"}
      _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
      transition="all 0.2s"
    >
      {/* Top color bar */}
      <Box h="4px" bg={accentColor} />

      {/* Popular badge */}
      {isPro && (
        <Box position="absolute" top="12px" right="12px">
          <Badge colorScheme="purple" borderRadius="full" px={3} py={1} fontSize="xs">
            ⭐ Popular
          </Badge>
        </Box>
      )}
      {isCurrent && (
        <Box position="absolute" top="12px" left="12px">
          <Badge colorScheme="green" borderRadius="full" px={3} py={1} fontSize="xs">
            Current
          </Badge>
        </Box>
      )}

      <Box p={6}>
        {/* Plan name + price */}
        <VStack align="start" spacing={1} mb={5}>
          <HStack spacing={2} mt={isCurrent || isPro ? 6 : 0}>
            <Box w={3} h={3} borderRadius="full" bg={accentColor} />
            <Text fontWeight="800" fontSize="lg" textTransform="uppercase" letterSpacing="wide">
              {plan.displayName}
            </Text>
          </HStack>
          <Text fontSize="xs" color={subText}>{plan.description}</Text>

          <HStack align="baseline" spacing={1} mt={2}>
            <Text fontSize="3xl" fontWeight="900" color={isFree ? "green.500" : "purple.500"}>
              {isFree ? "Free" : `$${price}`}
            </Text>
            {!isFree && (
              <Text fontSize="sm" color={subText}>
                / {CYCLES.find(c => c.value === billingCycle)?.label?.toLowerCase()}
              </Text>
            )}
          </HStack>
        </VStack>

        <Divider mb={4} />

        {/* Limit features as checkboxes */}
        <Text fontSize="xs" fontWeight="700" color={subText}
          textTransform="uppercase" letterSpacing="wide" mb={3}>
          Limits
        </Text>
        <VStack align="stretch" spacing={2} mb={4}>
          {LIMIT_FEATURES.map(({ key, label, icon: Ic }) => {
            const val      = plan.limits?.[key];
            const display  = formatLimit(val);
            const included = val !== 0 && val !== undefined;
            return (
              <HStack key={key} spacing={3}
                p={2} borderRadius="lg"
                bg={included ? featureBg : "transparent"}
                opacity={included ? 1 : 0.5}>
                <Icon
                  as={included ? MdCheck : MdClose}
                  color={included ? "green.400" : "gray.300"}
                  boxSize={4} flexShrink={0}
                />
                <Icon as={Ic} color={included ? accentColor : "gray.300"}
                  boxSize={3.5} flexShrink={0} />
                <Text fontSize="xs" flex={1} color={included ? undefined : subText}>
                  {label}
                </Text>
                {display && (
                  <Badge
                    fontSize="9px"
                    colorScheme={display === "Unlimited" ? "green" : "purple"}
                    variant="subtle"
                    borderRadius="full"
                    px={2}
                    flexShrink={0}
                  >
                    {display}
                  </Badge>
                )}
              </HStack>
            );
          })}
        </VStack>

        <Divider mb={4} />

        {/* Feature flags as checkboxes */}
        <Text fontSize="xs" fontWeight="700" color={subText}
          textTransform="uppercase" letterSpacing="wide" mb={3}>
          Features
        </Text>
        <VStack align="stretch" spacing={2} mb={6}>
          {FLAG_FEATURES.map(({ key, label, icon: Ic }) => {
            const enabled = plan.features?.[key];
            return (
              <HStack key={key} spacing={3}
                p={2} borderRadius="lg"
                bg={enabled ? featureBg : "transparent"}
                opacity={enabled ? 1 : 0.5}>
                <Checkbox
                  isChecked={!!enabled}
                  isReadOnly
                  colorScheme="purple"
                  size="sm"
                  flexShrink={0}
                  sx={{
                    ".chakra-checkbox__control": {
                      borderColor: enabled ? accentColor : "gray.300",
                      bg: enabled ? accentColor : "transparent",
                    }
                  }}
                />
                <Icon as={Ic} color={enabled ? accentColor : "gray.300"}
                  boxSize={3.5} flexShrink={0} />
                <Text fontSize="xs" color={enabled ? undefined : subText}>{label}</Text>
              </HStack>
            );
          })}
        </VStack>

        {/* CTA Button */}
        <Button
          w="full"
          size="md"
          borderRadius="xl"
          fontWeight="700"
          colorScheme={isCurrent ? "gray" : "purple"}
          variant={isCurrent ? "outline" : "solid"}
          isDisabled={isCurrent || isFree}
          isLoading={purchasing === plan._id}
          onClick={() => !isCurrent && !isFree && onSelect(plan._id)}
          bg={!isCurrent && !isFree ? accentColor : undefined}
          _hover={!isCurrent && !isFree ? { opacity: 0.9 } : undefined}
        >
          {isCurrent ? "Current Plan" : isFree ? "Free Forever" : `Get ${plan.displayName}`}
        </Button>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function PricingPage() {
  const [plans,        setPlans]        = useState([]);
  const [currentSub,   setCurrentSub]   = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading,      setLoading]      = useState(true);
  const [purchasing,   setPurchasing]   = useState(null);

  const toast    = useToast();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const bg      = useColorModeValue("gray.50",  "gray.900");
  const cardBg  = useColorModeValue("white",    "gray.800");
  const border  = useColorModeValue("gray.200", "gray.700");
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
      toast({
        title: "Plan activated!",
        description: "Your subscription is now active.",
        status: "success", duration: 3000, borderRadius: "xl",
      });
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

  if (loading) return <Center h="60vh"><Spinner size="xl" color="purple.500" /></Center>;

  return (
    <Box bg={bg} minH="100vh" px={{ base: 4, md: 8 }} py={10}>

      {/* ── Header ── */}
      <VStack spacing={3} mb={10} textAlign="center">
        <Badge colorScheme="purple" px={4} py={1} borderRadius="full" fontSize="sm">
          Subscription Plans
        </Badge>
        <Heading size="xl" fontWeight="900">
          Choose the right plan for your team
        </Heading>
        <Text color={subText} maxW="520px" fontSize="md">
          Start free, upgrade when you're ready. All plans include core features.
          No hidden fees — cancel anytime.
        </Text>
      </VStack>

      {/* ── Billing cycle selector ── */}
      <Flex justify="center" mb={10}>
        <Box
          bg={cardBg}
          borderRadius="2xl"
          p={1.5}
          border="1px solid"
          borderColor={border}
          display="inline-flex"
          gap={1}
        >
          {CYCLES.map(cycle => (
            <Box key={cycle.value} position="relative">
              <Button
                size="sm"
                borderRadius="xl"
                px={4}
                variant={billingCycle === cycle.value ? "solid" : "ghost"}
                colorScheme={billingCycle === cycle.value ? "purple" : "gray"}
                onClick={() => setBillingCycle(cycle.value)}
                fontWeight={billingCycle === cycle.value ? "700" : "500"}
              >
                {cycle.label}
              </Button>
              {cycle.save && (
                <Badge
                  position="absolute"
                  top="-8px"
                  right="-4px"
                  colorScheme="green"
                  fontSize="8px"
                  px={1.5}
                  borderRadius="full"
                  zIndex={1}
                >
                  {cycle.save}
                </Badge>
              )}
            </Box>
          ))}
        </Box>
      </Flex>

      {/* ── Plan cards ── */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} maxW="1100px" mx="auto">
        {plans.map(plan => (
          <PlanCard
            key={plan._id}
            plan={plan}
            billingCycle={billingCycle}
            currentPlanId={currentSub?.plan?._id || currentSub?.plan}
            onSelect={handleSelect}
            purchasing={purchasing}
          />
        ))}
      </SimpleGrid>

      {/* ── Footer note ── */}
      <Text textAlign="center" mt={10} fontSize="sm" color={subText}>
        💳 No real payment required — demo mode. Real payment integration coming soon.
      </Text>
    </Box>
  );
}