import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Text, Badge, VStack, HStack, SimpleGrid,
  Progress, Spinner, Center, Button, Divider, useColorModeValue,
  useToast, Avatar, Icon, Card, CardBody,
} from "@chakra-ui/react";
import {
  MdStar, MdRefresh, MdDevices, MdCalendarToday,
  MdUpgrade, MdCheckCircle, MdWarning,
} from "react-icons/md";
import api from "../../api";
import { useNavigate } from "react-router-dom";

const USAGE_LABELS = {
  staff:        "Staff",
  projects:     "Projects",
  teamMembers:  "Team Members",
  tasks:        "Tasks",
  issues:       "Issues",
  documents:    "Documents",
  taskStatuses: "Task Statuses",
};

function UsageBar({ label, used, limit, color = "blue" }) {
  const isUnlimited = limit === -1;
  const pct         = isUnlimited ? 0 : limit === 0 ? 100 : Math.min((used / limit) * 100, 100);
  const isWarning   = pct >= 80 && !isUnlimited;
  const isDanger    = pct >= 100 && !isUnlimited;
  const subText     = useColorModeValue("gray.500", "gray.400");

  return (
    <Box>
      <Flex justify="space-between" mb={1}>
        <Text fontSize="sm" fontWeight="600">{label}</Text>
        <Text fontSize="sm" color={isDanger ? "red.500" : isWarning ? "orange.500" : subText}>
          {isUnlimited ? "Unlimited" : limit === 0 ? "Not available" : `${used} / ${limit}`}
        </Text>
      </Flex>
      {!isUnlimited && limit !== 0 && (
        <Progress
          value={pct}
          size="sm"
          colorScheme={isDanger ? "red" : isWarning ? "orange" : color}
          borderRadius="full"
          bg={useColorModeValue("gray.100", "gray.700")}
        />
      )}
      {isUnlimited && (
        <Box h={2} bg={useColorModeValue("green.100", "green.900")} borderRadius="full">
          <Box w="100%" h="full" bg="green.400" borderRadius="full" opacity={0.5} />
        </Box>
      )}
    </Box>
  );
}

export default function SubscriptionPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const toast    = useToast();
  const navigate = useNavigate();

  const cardBg  = useColorModeValue("white",    "gray.800");
  const border  = useColorModeValue("gray.100", "gray.700");
  const subText = useColorModeValue("gray.500", "gray.400");
  const bg      = useColorModeValue("gray.50",  "gray.900");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/subscription/my");
      setData(r.data);
    } catch (err) {
      toast({ title: "Failed to load subscription", status: "error", duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Center h="60vh"><Spinner size="xl" /></Center>;
  if (!data)   return <Center h="60vh"><Text>No subscription data found.</Text></Center>;

  const { subscription, plan, usage, isExpired, isFree, deviceCount } = data;

  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <Box bg={bg} minH="100vh" p={{ base: 4, md: 6 }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Box>
          <Heading size="lg" fontWeight="900">My Subscription</Heading>
          <Text color={subText} fontSize="sm">Monitor your plan usage and limits</Text>
        </Box>
        <HStack>
          <Button size="sm" leftIcon={<MdRefresh />} variant="outline" onClick={load} borderRadius="lg">
            Refresh
          </Button>
          <Button size="sm" leftIcon={<MdUpgrade />} colorScheme="purple"
            onClick={() => navigate("/admin/subscription/pricing")} borderRadius="lg">
            {isFree ? "Upgrade Plan" : "Change Plan"}
          </Button>
        </HStack>
      </Flex>

      {/* Expiry warning */}
      {isExpired && (
        <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="xl" p={4} mb={6}
          _dark={{ bg: "red.900", borderColor: "red.700" }}>
          <HStack>
            <Icon as={MdWarning} color="red.500" boxSize={5} />
            <Text fontWeight="700" color="red.600" _dark={{ color: "red.300" }}>
              Your subscription has expired! Renew now to restore full access.
            </Text>
            <Button size="sm" colorScheme="red" ml="auto"
              onClick={() => navigate("/admin/subscription/pricing")}>
              Renew Now
            </Button>
          </HStack>
        </Box>
      )}

      {!isExpired && daysLeft !== null && daysLeft <= 7 && (
        <Box bg="orange.50" border="1px solid" borderColor="orange.200" borderRadius="xl" p={4} mb={6}
          _dark={{ bg: "orange.900", borderColor: "orange.700" }}>
          <HStack>
            <Icon as={MdWarning} color="orange.500" boxSize={5} />
            <Text fontWeight="600" color="orange.600" _dark={{ color: "orange.300" }}>
              Your plan expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}. Consider renewing soon.
            </Text>
          </HStack>
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb={6}>
        {/* Current plan card */}
        <Card bg={cardBg} border="1px solid" borderColor={border} borderRadius="2xl">
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <Text fontWeight="700" fontSize="md">Current Plan</Text>
              <Badge
                px={3} py={1} borderRadius="full" fontSize="sm"
                style={{ background: plan?.color + "22", color: plan?.color, border: `1px solid ${plan?.color}44` }}
              >
                {plan?.displayName || "Free"}
              </Badge>
            </HStack>
            <VStack align="start" spacing={3}>
              <HStack>
                <Icon as={MdCalendarToday} color={subText} />
                <Text fontSize="sm">
                  <Text as="span" fontWeight="600">Started:</Text> {formatDate(subscription?.startDate)}
                </Text>
              </HStack>
              <HStack>
                <Icon as={MdCalendarToday} color={subText} />
                <Text fontSize="sm">
                  <Text as="span" fontWeight="600">Expires:</Text>{" "}
                  {isFree ? "Never" : formatDate(subscription?.endDate)}
                </Text>
              </HStack>
              {!isFree && daysLeft !== null && (
                <Badge colorScheme={daysLeft <= 7 ? "red" : "green"} borderRadius="full" px={3}>
                  {daysLeft} days remaining
                </Badge>
              )}
              {subscription?.billingCycle && (
                <HStack>
                  <Text fontSize="sm" color={subText}>Billing:</Text>
                  <Text fontSize="sm" fontWeight="600" textTransform="capitalize">
                    {subscription.billingCycle}
                  </Text>
                </HStack>
              )}
              {subscription?.amount > 0 && (
                <HStack>
                  <Text fontSize="sm" color={subText}>Amount paid:</Text>
                  <Text fontSize="sm" fontWeight="600">${subscription.amount}</Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Device sessions card */}
        <Card bg={cardBg} border="1px solid" borderColor={border} borderRadius="2xl">
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <Text fontWeight="700" fontSize="md">Device Sessions</Text>
              <Icon as={MdDevices} color={subText} boxSize={5} />
            </HStack>
            <VStack align="start" spacing={3}>
              <HStack>
                <Text fontSize="3xl" fontWeight="900" color="blue.500">
                  {deviceCount}
                </Text>
                <Text fontSize="sm" color={subText}>
                  / {plan?.limits?.devices === -1 ? "∞" : plan?.limits?.devices || 1} devices
                </Text>
              </HStack>
              <Text fontSize="xs" color={subText}>
                Active login sessions across all devices. Sessions expire after 7 days of inactivity.
              </Text>
              <Progress
                value={plan?.limits?.devices === -1 ? 0
                  : (deviceCount / (plan?.limits?.devices || 1)) * 100}
                size="sm" colorScheme="blue" borderRadius="full"
                bg={useColorModeValue("gray.100", "gray.700")}
                w="full"
              />
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Usage bars */}
      <Card bg={cardBg} border="1px solid" borderColor={border} borderRadius="2xl" mb={5}>
        <CardBody>
          <HStack justify="space-between" mb={5}>
            <Text fontWeight="700" fontSize="md">Usage This Period</Text>
            <Text fontSize="xs" color={subText}>Resets on plan renewal</Text>
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
            {Object.entries(USAGE_LABELS).map(([key, label]) => (
              <UsageBar
                key={key}
                label={label}
                used={usage?.[key] || 0}
                limit={plan?.limits?.[key] ?? -1}
              />
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Features included */}
      <Card bg={cardBg} border="1px solid" borderColor={border} borderRadius="2xl">
        <CardBody>
          <Text fontWeight="700" fontSize="md" mb={4}>Features Included</Text>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
            {[
              { label: "Notifications",    enabled: plan?.features?.notifications    },
              { label: "Bulk Upload",      enabled: plan?.features?.bulkUpload       },
              { label: "Priority Support", enabled: plan?.features?.prioritySupport  },
            ].map(({ label, enabled }) => (
              <HStack key={label} spacing={2}>
                <Icon as={enabled ? MdCheckCircle : MdWarning}
                  color={enabled ? "green.400" : "gray.300"} boxSize={4} />
                <Text fontSize="sm" color={enabled ? undefined : subText}>{label}</Text>
              </HStack>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>
    </Box>
  );
}