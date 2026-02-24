import {
  Box, Flex, Text, Button, VStack, HStack, Select, Avatar, Divider,
} from "@chakra-ui/react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import api from "../api";
import {
  MdDashboard, MdPeople, MdVpnKey, MdSecurity,
  MdCheckBox, MdLabel, MdPerson, MdLogout, MdAssignment, MdFolder,
} from "react-icons/md";
import { MdBugReport } from "react-icons/md";

function AdminLayout() {
  const navigate = useNavigate();
  const {
    hasPermission, user, logout,
    projects, selectedProject, selectProject,
  } = useAuth();

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
    fontSize: "14px",
  });

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  return (
    <Flex minH="100vh">
      {/* SIDEBAR */}
      <Box w="220px" bg="blue.600" color="white" p="5" flexShrink={0}>
        <Flex align="center" gap="2" mb="8">
          <MdAssignment size={24} />
          <Text fontSize="xl" fontWeight="bold">Task Manager</Text>
        </Flex>

        <VStack align="stretch" spacing="1">
          <NavLink to="/admin" end style={linkStyle}>
            <MdDashboard size={18} /> Dashboard
          </NavLink>

          {(isAdmin || hasPermission("Staff_read")) && (
            <NavLink to="/admin/staff" style={linkStyle}>
              <MdPeople size={18} /> Staff
            </NavLink>
          )}

          {(isAdmin || hasPermission("project_read")) && (
            <NavLink to="/admin/projects" style={linkStyle}>
              <MdFolder size={18} /> Projects
            </NavLink>
          )}

          {(isAdmin || hasPermission("project_read")) && (
            <NavLink to="/admin/team" style={linkStyle}>
              <MdPeople size={18} /> Team
            </NavLink>
          )}

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
          <NavLink to="/admin/issues" style={linkStyle}>
            <MdBugReport size={18} /> Issues
          </NavLink>
        </VStack>
      </Box>

      {/* MAIN */}
      <Flex flex="1" direction="column" bg="gray.50" minW={0}>

        {/* TOPBAR */}
        <Flex
          h="64px"
          bg="white"
          px={6}
          align="center"
          justify="space-between"
          boxShadow="0 1px 3px rgba(0,0,0,0.08)"
          borderBottom="1px solid #f0f0f0"
          flexShrink={0}
        >
          {/* LEFT — user info */}
          <Flex align="center" gap={3}>
            <Avatar
              size="sm"
              name={user?.name || "Admin"}
              bg="blue.500"
              color="white"
            />
            <Box>
              <Text fontSize="sm" fontWeight="600" color="gray.800" lineHeight="1.2">
                {user?.name || "Admin User"}
              </Text>
              <Text fontSize="xs" color="gray.400" lineHeight="1.2">
                {user?.role?.name || "Administrator"}
              </Text>
            </Box>

            {/* DIVIDER */}
            {projects.length > 0 && (
              <Box h="32px" w="1px" bg="gray.200" mx={2} />
            )}

            {/* PROJECT DROPDOWN */}
            {projects.length > 0 && (
              <Flex align="center" gap={2}>
                <MdFolder size={16} color="#3b82f6" />
                <Select
                  size="sm"
                  w="160px"
                  value={selectedProject?._id || ""}
                  onChange={(e) => selectProject(e.target.value)}
                  borderRadius="lg"
                  borderColor="gray.200"
                  bg="gray.50"
                  fontSize="sm"
                  fontWeight="500"
                  color="gray.700"
                  _focus={{ borderColor: "blue.400", bg: "white" }}
                  _hover={{ borderColor: "gray.300" }}
                >
                  <option value="">All Projects</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </Select>
              </Flex>
            )}
          </Flex>

          {/* RIGHT — actions */}
          <HStack spacing={2}>
            <NotificationBell />

            <Button
              size="sm"
              variant="ghost"
              leftIcon={<MdPerson size={16} />}
              color="gray.600"
              _hover={{ bg: "blue.50", color: "blue.600" }}
              onClick={() => navigate("/admin/profile")}
            >
              Profile
            </Button>

            <Button
              size="sm"
              colorScheme="red"
              variant="outline"
              leftIcon={<MdLogout size={16} />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </HStack>
        </Flex>

        {/* PAGE CONTENT */}
        <Box p="6" flex="1" overflowY="auto">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}

export default AdminLayout;