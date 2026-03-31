import { useState, useRef, useEffect } from "react";
import {
  Box, Badge, Text, VStack, HStack, Button, Flex,
} from "@chakra-ui/react";
import { IoMdNotifications, IoMdLock } from "react-icons/io";
import { MdWorkspacePremium } from "react-icons/md";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../context/AuthContext";

// ── Locked bell — shown to free-plan users ────────────────────────────────────
function LockedBell() {
  const [showTip, setShowTip] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowTip(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <Box position="relative" display="inline-block" ref={ref}>
      {/* Greyed-out locked bell */}
      <Box
        as="button"
        onClick={() => setShowTip((p) => !p)}
        position="relative"
        p={2}
        cursor="pointer"
        bg="none"
        border="none"
        display="flex"
        alignItems="center"
        justifyContent="center"
        opacity={0.45}
        _hover={{ opacity: 0.65 }}
        aria-label="Notifications — Pro plan required"
      >
        <IoMdNotifications size={26} color="#a0aec0" />
        <Box
          position="absolute"
          bottom="-1px"
          right="-3px"
          bg="gray.200"
          _dark={{ bg: "gray.600" }}
          borderRadius="full"
          p="2px"
          lineHeight={0}
        >
          <IoMdLock size={10} color="#718096" />
        </Box>
      </Box>

      {/* Upgrade nudge popup */}
      {showTip && (
        <Box
          position="absolute"
          right={0}
          top="110%"
          width="230px"
          bg="white"
          _dark={{ bg: "gray.800", borderColor: "gray.600" }}
          borderRadius="xl"
          boxShadow="xl"
          border="1px solid #e2e8f0"
          zIndex={9999}
          p={4}
        >
          <Flex align="center" gap={2} mb={2}>
            <Box bg="yellow.100" _dark={{ bg: "yellow.900" }} p={1.5} borderRadius="lg">
              <MdWorkspacePremium size={18} color="#D4A017" />
            </Box>
            <Text fontWeight="700" fontSize="sm" color="gray.800" _dark={{ color: "white" }}>
              Pro Plan Required
            </Text>
          </Flex>

          <Text
            fontSize="xs"
            color="gray.500"
            _dark={{ color: "gray.400" }}
            mb={3}
            lineHeight="1.6"
          >
            Upgrade to <strong>Pro</strong> to unlock real-time notifications
            and stay on top of every update.
          </Text>

          <Button
            size="sm"
            w="full"
            bg="linear-gradient(135deg, #D4A017 0%, #f6c90e 100%)"
            color="white"
            fontWeight="700"
            borderRadius="lg"
            _hover={{ opacity: 0.88 }}
            leftIcon={<MdWorkspacePremium size={15} />}
            onClick={() => {
              // ── Change this path to wherever your billing/upgrade page lives ──
              window.location.href = "/settings/billing";
            }}
          >
            Upgrade to Pro
          </Button>
        </Box>
      )}
    </Box>
  );
}

// ── Active bell — shown to Pro users ─────────────────────────────────────────
function ActiveBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen]                   = useState(false);
  const ref                               = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useSocket("notification", (data) => {
    if (data.userId !== user?._id?.toString()) return;
    setNotifications((prev) => [
      {
        id:      Date.now(),
        message: data.message,
        read:    false,
        time:    new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  });

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const clearAll = () => {
    setNotifications([]);
    setOpen(false);
  };

  return (
    <Box position="relative" display="inline-block" ref={ref}>
      {/* Golden bell */}
      <Box
        as="button"
        onClick={() => setOpen((p) => !p)}
        position="relative"
        p={2}
        cursor="pointer"
        bg="none"
        border="none"
        _hover={{ opacity: 0.7 }}
        display="flex"
        alignItems="center"
        justifyContent="center"
        aria-label="Notifications"
      >
        <IoMdNotifications size={26} color="#D4A017" />
        {unreadCount > 0 && (
          <Badge
            colorScheme="red"
            borderRadius="full"
            position="absolute"
            top="-2px"
            right="-4px"
            fontSize="0.6rem"
            minW="18px"
            textAlign="center"
          >
            {unreadCount}
          </Badge>
        )}
      </Box>

      {/* Dropdown */}
      {open && (
        <Box
          position="absolute"
          right={0}
          top="110%"
          width="300px"
          bg="white"
          _dark={{ bg: "gray.800", borderColor: "gray.600" }}
          borderRadius="md"
          boxShadow="lg"
          border="1px solid #e2e8f0"
          zIndex={9999}
        >
          {/* Header */}
          <HStack
            justify="space-between"
            px={4}
            py={3}
            borderBottom="1px solid #e2e8f0"
          >
            <HStack spacing={2}>
              <Text fontWeight="bold" fontSize="sm">
                Notifications
              </Text>
              <Badge colorScheme="yellow" borderRadius="full" fontSize="9px" px={2}>
                PRO
              </Badge>
            </HStack>
            <HStack spacing={2}>
              {unreadCount > 0 && (
                <Button size="xs" variant="ghost" onClick={markAllRead}>
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button size="xs" variant="ghost" colorScheme="red" onClick={clearAll}>
                  Clear
                </Button>
              )}
            </HStack>
          </HStack>

          {/* List */}
          <VStack spacing={0} maxH="300px" overflowY="auto" align="stretch">
            {notifications.length === 0 ? (
              <Text fontSize="sm" color="gray.400" textAlign="center" py={6}>
                No notifications yet
              </Text>
            ) : (
              notifications.map((n) => (
                <Box
                  key={n.id}
                  px={4}
                  py={3}
                  bg={n.read ? "white" : "yellow.50"}
                  _dark={{
                    bg: n.read ? "gray.800" : "yellow.900",
                    _hover: { bg: "gray.700" },
                  }}
                  borderBottom="1px solid #f0f0f0"
                  _hover={{ bg: "gray.50" }}
                >
                  <Text fontSize="sm">{n.message}</Text>
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {n.time}
                  </Text>
                </Box>
              ))
            )}
          </VStack>
        </Box>
      )}
    </Box>
  );
}

// ── Default export — uses hasFeature("notifications") from your AuthContext ───
export default function NotificationBell() {
  const { user, hasFeature, isSuperAdmin } = useAuth();

  // SuperAdmins always get full access; everyone else needs the feature flag
  const canUseNotifications = isSuperAdmin || hasFeature("notifications");

  if (!canUseNotifications) return <LockedBell />;
  return <ActiveBell user={user} />;
}