import { useState } from "react";
import {
  Box, Badge, Text, VStack, HStack, Button,
} from "@chakra-ui/react";
import { IoMdNotifications } from "react-icons/io";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../context/AuthContext";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const unreadCount = notifications.filter((n) => !n.read).length;

  useSocket("notification", (data) => {
    if (data.userId !== user?._id?.toString()) return;

    const newNotif = {
      id: Date.now(),
      message: data.message,
      read: false,
      time: new Date().toLocaleTimeString(),
    };

    setNotifications((prev) => [newNotif, ...prev]);
  });

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    setOpen(false);
  };

  return (
    <Box position="relative" display="inline-block">
      {/* ✅ Golden bell icon */}
      <Box
        as="button"
        onClick={() => setOpen((prev) => !prev)}
        position="relative"
        p={2}
        cursor="pointer"
        bg="none"
        border="none"
        _hover={{ opacity: 0.7 }}
        display="flex"
        alignItems="center"
        justifyContent="center"
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

      {/* DROPDOWN */}
      {open && (
        <Box
          position="absolute"
          right={0}
          top="110%"
          width="300px"
          bg="white"
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
            <Text fontWeight="bold" fontSize="sm">
              Notifications
            </Text>
            <HStack spacing={2}>
              {unreadCount > 0 && (
                <Button size="xs" variant="ghost" onClick={markAllRead}>
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={clearAll}
                >
                  Clear
                </Button>
              )}
            </HStack>
          </HStack>

          {/* Notification List */}
          <VStack spacing={0} maxH="300px" overflowY="auto" align="stretch">
            {notifications.length === 0 ? (
              <Text
                fontSize="sm"
                color="gray.400"
                textAlign="center"
                py={6}
              >
                No notifications yet
              </Text>
            ) : (
              notifications.map((n) => (
                <Box
                  key={n.id}
                  px={4}
                  py={3}
                  bg={n.read ? "white" : "brand.50"}
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