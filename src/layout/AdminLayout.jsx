import {
  Box, Flex, Text, Button, VStack, HStack, Select,
  IconButton, useColorMode, useColorModeValue,
} from "@chakra-ui/react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import api from "../api";
import {
  MdDashboard, MdPeople, MdVpnKey, MdSecurity,
  MdCheckBox, MdLabel, MdPerson, MdLogout, MdAssignment,
  MdFolder, MdDarkMode, MdLightMode, MdBugReport,
} from "react-icons/md";
import { brand } from "../theme";

// ─────────────────────────────────────────────
// 🔍 Debug — remove after confirming colors work
// ─────────────────────────────────────────────
console.log("✅ AdminLayout using brand colors:", brand);

function AdminLayout() {
  const navigate = useNavigate();
  const { hasPermission, user, logout, projects, selectedProject, selectProject } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();

  const topbarBg       = useColorModeValue("white", "gray.800");
  const topbarBorder   = useColorModeValue("#f0f0f0", "#2d3748");
  const contentBg      = useColorModeValue("gray.50", "gray.900");
  const selectBg       = useColorModeValue("gray.50", "gray.700");
  const selectColor    = useColorModeValue("gray.700", "white");
  const iconColor      = useColorModeValue("gray.600", "gray.300");
  const iconHoverBg    = useColorModeValue("gray.100", "gray.700");
  const iconHoverColor = useColorModeValue("gray.800", "white");

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
    background: isActive ? "rgba(255,255,255,0.22)" : "transparent",
    color: "white",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    transition: "background 0.15s",
  });

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  return (
    <Flex minH="100vh">

      {/* ── SIDEBAR ───────────────────────────────────────── */}
      <Box
        w="220px"
        bg="brand.500"
        color="white"
        p="5"
        flexShrink={0}
        boxShadow="2px 0 8px rgba(0,0,0,0.15)"
        display="flex"
        flexDirection="column"
      >
        {/* Logo */}
        <Flex align="center" gap="2" mb="8">
          <MdAssignment size={24} />
          <Text fontSize="xl" fontWeight="bold">Task Manager</Text>
        </Flex>

        {/* Nav Links */}
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

          {(isAdmin || hasPermission("issue_read")) && (
            <NavLink to="/admin/issues" style={linkStyle}>
              <MdBugReport size={18} /> Issues
            </NavLink>
          )}
        </VStack>
      </Box>

      {/* ── MAIN ──────────────────────────────────────────── */}
      <Flex flex="1" direction="column" bg={contentBg} minW={0}>

        {/* TOPBAR */}
        <Flex
          h="64px"
          bg={topbarBg}
          px={6}
          align="center"
          justify="space-between"
          boxShadow="0 1px 3px rgba(0,0,0,0.08)"
          borderBottom={`1px solid ${topbarBorder}`}
          flexShrink={0}
        >
          {/* LEFT — project selector */}
          <Flex align="center" gap={2}>
            {projects.length > 0 && (
              <>
                <MdFolder size={16} color="brand.500" />
                <Select
                  size="sm"
                  w="160px"
                  value={selectedProject?._id || ""}
                  onChange={(e) => selectProject(e.target.value)}
                  borderRadius="lg"
                  borderColor="gray.200"
                  bg={selectBg}
                  fontSize="sm"
                  fontWeight="500"
                  color={selectColor}
                  _focus={{ borderColor: brand.primary, bg: topbarBg }}
                  _hover={{ borderColor: "gray.300" }}
                >
                  <option value="">All Projects</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </Select>
              </>
            )}
          </Flex>

          {/* RIGHT */}
          <HStack spacing={2}>
            <NotificationBell />

            <IconButton
              size="sm"
              variant="ghost"
              icon={colorMode === "light" ? <MdDarkMode size={18} /> : <MdLightMode size={18} />}
              onClick={toggleColorMode}
              aria-label="Toggle dark mode"
              color={iconColor}
              _hover={{ bg: iconHoverBg, color: iconHoverColor }}
            />

            <Button
              size="sm"
              variant="ghost"
              leftIcon={<MdPerson size={16} />}
              color={iconColor}
              _hover={{ bg: iconHoverBg, color: iconHoverColor }}
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
