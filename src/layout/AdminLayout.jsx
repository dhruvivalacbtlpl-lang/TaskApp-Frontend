import {
  Box, Flex, Text, Button, VStack, HStack,
} from "@chakra-ui/react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import api from "../api";
import {
  MdDashboard, MdPeople, MdVpnKey, MdSecurity,
  MdCheckBox, MdLabel, MdPerson, MdLogout, MdAssignment, MdFolder,
} from "react-icons/md";

function AdminLayout() {
  const navigate = useNavigate();
  const { hasPermission, user, logout } = useAuth();

  // ✅ Bug 2 fixed — call backend logout to clear cookie
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      logout();
      localStorage.clear();
      navigate("/");
    }
  };

  const linkStyle = ({ isActive }) => ({
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    textDecoration: "none",
    background: isActive ? "#1e40af" : "transparent",
    color: "white",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  });

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  return (
    <Flex minH="100vh">
      {/* SIDEBAR */}
      <Box w="220px" bg="blue.600" color="white" p="5">
        <Flex align="center" gap="2" mb="8">
          <MdAssignment size={24} />
          <Text fontSize="xl" fontWeight="bold">Task Manager</Text>
        </Flex>

        <VStack align="stretch" spacing="2">
          <NavLink to="/admin" end style={linkStyle}>
            <MdDashboard size={18} /> Dashboard
          </NavLink>

          {(isAdmin || hasPermission("Staff_read")) && (
            <NavLink to="/admin/staff" style={linkStyle}>
              <MdPeople size={18} /> Staff
            </NavLink>
          )}

          {/* ✅ Bug 1 fixed — show projects to all logged in users */}
          <NavLink to="/admin/projects" style={linkStyle}>
            <MdFolder size={18} /> Projects
          </NavLink>

          {(isAdmin || hasPermission("role_read")) && (
            <NavLink to="/admin/roles" style={linkStyle}>
              <MdVpnKey size={18} /> Roles
            </NavLink>
          )}

          {(isAdmin || hasPermission("permissions_read")) && (
            <NavLink to="/admin/permissions" style={linkStyle}>
              <MdSecurity size={18} /> Permissions
            </NavLink>
          )}

          {(isAdmin || hasPermission("task_read")) && (
            <NavLink to="/admin/tasks" style={linkStyle}>
              <MdCheckBox size={18} /> Tasks
            </NavLink>
          )}

          {(isAdmin || hasPermission("taskstatus_read")) && (
            <NavLink to="/admin/task-status" style={linkStyle}>
              <MdLabel size={18} /> Task Status
            </NavLink>
          )}
        </VStack>
      </Box>

      {/* MAIN */}
      <Flex flex="1" direction="column" bg="gray.100">
        {/* TOPBAR */}
        <Flex h="60px" bg="white" px="6" align="center"
          justify="space-between" boxShadow="sm">
          <Flex align="center" gap="2">
            <MdPerson size={20} color="#4A5568" />
            <Text fontWeight="500" color="gray.700">
              {user?.name || "Admin User"}
            </Text>
          </Flex>

          <HStack spacing="3">
            <NotificationBell />
            <Button size="sm" colorScheme="blue"
              leftIcon={<MdPerson size={16} />}
              onClick={() => navigate("/admin/profile")}>
              Profile
            </Button>
            <Button size="sm" colorScheme="red"
              leftIcon={<MdLogout size={16} />}
              onClick={handleLogout}>
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