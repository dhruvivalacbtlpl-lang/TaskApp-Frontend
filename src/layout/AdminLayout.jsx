import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell"; // ✅ import

function AdminLayout() {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const linkStyle = ({ isActive }) => ({
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    textDecoration: "none",
    background: isActive ? "#1e40af" : "transparent",
    color: "white",
    fontWeight: "500",
  });

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  return (
    <Flex minH="100vh">
      {/* SIDEBAR */}
      <Box w="220px" bg="blue.600" color="white" p="5">
        <Text fontSize="xl" fontWeight="bold" mb="8">
          Task Manager
        </Text>

        <VStack align="stretch" spacing="3">
          <NavLink to="/admin" end style={linkStyle}>
            Dashboard
          </NavLink>

          {(isAdmin || hasPermission("Staff_read")) && (
            <NavLink to="/admin/staff" style={linkStyle}>
              Staff
            </NavLink>
          )}

          {(isAdmin || hasPermission("role_read")) && (
            <NavLink to="/admin/roles" style={linkStyle}>
              Roles
            </NavLink>
          )}

          {(isAdmin || hasPermission("permissions_read")) && (
            <NavLink to="/admin/permissions" style={linkStyle}>
              Permissions
            </NavLink>
          )}

          {(isAdmin || hasPermission("task_read")) && (
            <NavLink to="/admin/tasks" style={linkStyle}>
              Tasks
            </NavLink>
          )}

          {(isAdmin || hasPermission("taskstatus_read")) && (
            <NavLink to="/admin/task-status" style={linkStyle}>
              Task Status
            </NavLink>
          )}
        </VStack>
      </Box>

      {/* MAIN */}
      <Flex flex="1" direction="column" bg="gray.100">
        {/* TOPBAR */}
        <Flex
          h="60px"
          bg="white"
          px="6"
          align="center"
          justify="space-between"
          boxShadow="sm"
        >
          <Text>{user?.name || "Admin User"}</Text>

          <HStack spacing="3">
            {/* ✅ Notification bell — sits between name and Profile button */}
            <NotificationBell />

            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => navigate("/admin/profile")}
            >
              Profile
            </Button>

            <Button size="sm" colorScheme="red" onClick={handleLogout}>
              Logout
            </Button>
          </HStack>
        </Flex>

        <Box p="6" flex="1">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}

export default AdminLayout;
  