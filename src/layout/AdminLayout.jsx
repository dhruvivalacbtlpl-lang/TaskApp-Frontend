import { useState, useEffect } from "react";
import {
  Box, Flex, Text, Button, VStack, HStack, Select,
  IconButton, useColorMode, useColorModeValue, Tooltip,
} from "@chakra-ui/react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import api from "../api";
import {
  MdDashboard, MdPeople, MdVpnKey, MdSecurity,
  MdCheckBox, MdLabel, MdPerson, MdLogout, MdAssignment,
  MdFolder, MdFolderOpen, MdDarkMode, MdLightMode, MdBugReport,
  MdKeyboardArrowDown, MdChevronLeft, MdChevronRight,
  MdDescription,
} from "react-icons/md";
import { brand } from "../theme";

const COLLAPSED_W = "64px";
const EXPANDED_W  = "230px";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user, logout, projects, selectedProject, selectProject, refreshProfile } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();

  const isProjectGroupActive = [
    "/admin/projects", "/admin/tasks", "/admin/task-status",
    "/admin/issues", "/admin/team", "/admin/documents"
  ].some(p => location.pathname.startsWith(p));

  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(isProjectGroupActive);

  // ✅ Handle redirect param from email links when user is already logged in
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      const target = redirect.startsWith("/admin") ? redirect : `/admin${redirect}`;
      navigate(target, { replace: true });
    }
  }, []);

  // Re-fetch profile on every route change so permissions are always fresh
  useEffect(() => {
    refreshProfile();
  }, [location.pathname]);

  const topbarBg       = useColorModeValue("white", "gray.800");
  const topbarBorder   = useColorModeValue("#f0f0f0", "#2d3748");
  const contentBg      = useColorModeValue("gray.50", "gray.900");
  const selectBg       = useColorModeValue("gray.50", "gray.700");
  const selectColor    = useColorModeValue("gray.700", "white");
  const iconColor      = useColorModeValue("gray.600", "gray.300");
  const iconHoverBg    = useColorModeValue("blue.50", "blue.900");
  const iconHoverColor = useColorModeValue("blue.600", "blue.300");

  const sidebarBg = colorMode === "dark"
    ? `color-mix(in srgb, ${brand.sidebar} 60%, #000000 40%)`
    : brand.sidebar;

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); }
    catch (err) { console.error("Logout error:", err); }
    finally { logout(); localStorage.clear(); navigate("/"); }
  };

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const canSeeProjects   = isAdmin || hasPermission("project_read");
  const canSeeTasks      = isAdmin || hasPermission("task_read");
  const canSeeTaskStatus = isAdmin || hasPermission("taskstatus_read");
  const canSeeIssues     = isAdmin || hasPermission("issues_read");
  const canSeeDocuments  = isAdmin || hasPermission("document_read");

  const canSeeProjectsGroup =
    canSeeProjects || canSeeTasks || canSeeTaskStatus || canSeeIssues || canSeeDocuments;

  const NavItem = ({ to, icon: Icon, label, end: endProp }) => (
    <Tooltip
      label={label} placement="right"
      isDisabled={sidebarOpen}
      hasArrow bg="gray.800" color="white" fontSize="sm"
    >
      <NavLink
        to={to} end={endProp}
        style={({ isActive }) => ({
          display: "flex", alignItems: "center",
          gap: "10px",
          padding: sidebarOpen ? "9px 12px" : "9px 0px",
          justifyContent: sidebarOpen ? "flex-start" : "center",
          borderRadius: "7px", textDecoration: "none",
          background: isActive ? "rgba(255,255,255,0.2)" : "transparent",
          color: isActive ? "white" : "rgba(255,255,255,0.82)",
          fontWeight: isActive ? "600" : "400",
          fontSize: "14px", transition: "all 0.15s",
          overflow: "hidden", whiteSpace: "nowrap",
        })}
      >
        <Icon size={19} style={{ flexShrink: 0 }} />
        {sidebarOpen && <span>{label}</span>}
      </NavLink>
    </Tooltip>
  );

  const subItems = [
    canSeeProjects   && { to: "/admin/projects", icon: MdFolder,      label: "All Projects", end: true },
    (isAdmin || hasPermission("project_read")) && { to: "/admin/team", icon: MdPeople, label: "Team" },
    canSeeTasks      && { to: "/admin/tasks",       icon: MdCheckBox,    label: "Tasks" },
    canSeeTaskStatus && { to: "/admin/task-status", icon: MdLabel,       label: "Task Status" },
    canSeeIssues     && { to: "/admin/issues",      icon: MdBugReport,   label: "Issues" },
    canSeeDocuments  && { to: "/admin/documents",   icon: MdDescription, label: "Documents" },
  ].filter(Boolean);

  return (
    <Flex minH="100vh">

      {/* ── SIDEBAR ── */}
      <Box
        w={sidebarOpen ? EXPANDED_W : COLLAPSED_W}
        bg={sidebarBg}
        color="white"
        py="5"
        px={sidebarOpen ? "3" : "1"}
        flexShrink={0}
        boxShadow="2px 0 12px rgba(0,0,0,0.2)"
        display="flex"
        flexDirection="column"
        transition="width 0.25s ease, padding 0.25s ease"
        overflow="hidden"
      >
        {/* Logo + Toggle */}
        <Flex align="center" justify={sidebarOpen ? "space-between" : "center"} mb="8" px="2">
          {sidebarOpen && (
            <Flex align="center" gap="2">
              <MdAssignment size={22} />
              <Text fontSize="lg" fontWeight="bold" letterSpacing="tight" whiteSpace="nowrap">
                Task Manager
              </Text>
            </Flex>
          )}
          <Box
            as="button"
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "26px", height: "26px", borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              cursor: "pointer", color: "white", flexShrink: 0,
              transition: "background 0.15s",
            }}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <MdChevronLeft size={16} /> : <MdChevronRight size={16} />}
          </Box>
        </Flex>

        {/* Nav links */}
        <VStack align="stretch" spacing="1" overflowY="auto" overflowX="hidden">

          <NavItem to="/admin" icon={MdDashboard} label="Dashboard" end />

          {(isAdmin || hasPermission("staff_read")) && (
            <NavItem to="/admin/staff" icon={MdPeople} label="Staff" />
          )}

          {(isAdmin || hasPermission("role_read")) && (
            <NavItem to="/admin/roles" icon={MdVpnKey} label="Roles" />
          )}

          {(isAdmin || hasPermission("permissions_read")) && (
            <NavItem to="/admin/permissions" icon={MdSecurity} label="Permissions" />
          )}

          {/* Projects accordion */}
          {canSeeProjectsGroup && (
            <Box>
              <Tooltip
                label="Projects" placement="right"
                isDisabled={sidebarOpen}
                hasArrow bg="gray.800" color="white" fontSize="sm"
              >
                <Box
                  as="button"
                  w="100%"
                  onClick={() => {
                    if (!sidebarOpen) setSidebarOpen(true);
                    setProjectsOpen(v => !v);
                  }}
                  style={{
                    display: "flex", alignItems: "center",
                    gap: "10px",
                    padding: sidebarOpen ? "9px 12px" : "9px 0px",
                    justifyContent: sidebarOpen ? "flex-start" : "center",
                    borderRadius: "7px", cursor: "pointer",
                    background: isProjectGroupActive ? "rgba(255,255,255,0.2)" : "transparent",
                    color: isProjectGroupActive ? "white" : "rgba(255,255,255,0.82)",
                    fontWeight: isProjectGroupActive ? "600" : "400",
                    fontSize: "14px", transition: "all 0.15s",
                    border: "none", width: "100%", textAlign: "left",
                    overflow: "hidden", whiteSpace: "nowrap",
                  }}
                >
                  {projectsOpen && sidebarOpen
                    ? <MdFolderOpen size={19} style={{ flexShrink: 0 }} />
                    : <MdFolder size={19} style={{ flexShrink: 0 }} />
                  }
                  {sidebarOpen && (
                    <>
                      <Text flex={1} fontSize="14px">Projects</Text>
                      <Box style={{
                        transform: projectsOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.2s ease",
                        display: "flex", flexShrink: 0,
                      }}>
                        <MdKeyboardArrowDown size={18} />
                      </Box>
                    </>
                  )}
                </Box>
              </Tooltip>

              {/* Sub-items */}
              {sidebarOpen && (
                <Box
                  overflow="hidden"
                  maxH={projectsOpen ? "400px" : "0px"}
                  opacity={projectsOpen ? 1 : 0}
                  transition="max-height 0.25s ease, opacity 0.2s ease"
                >
                  <Flex mt="1" ml="3">
                    <Box
                      w="2px" mx="2" borderRadius="full" flexShrink={0}
                      style={{ background: "rgba(255,255,255,0.25)" }}
                    />
                    <VStack align="stretch" spacing="0.5" flex={1} py="1">
                      {subItems.map(({ to, icon: Icon, label, end: endProp }) => (
                        <NavLink
                          key={to}
                          to={to}
                          end={endProp}
                          style={({ isActive }) => ({
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "7px 10px", borderRadius: "6px",
                            textDecoration: "none",
                            background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                            color: isActive ? "white" : "rgba(255,255,255,0.7)",
                            fontWeight: isActive ? "600" : "400",
                            fontSize: "13px", transition: "all 0.15s",
                          })}
                        >
                          <Icon size={14} style={{ flexShrink: 0 }} />
                          {label}
                        </NavLink>
                      ))}
                    </VStack>
                  </Flex>
                </Box>
              )}
            </Box>
          )}

        </VStack>
      </Box>

      {/* ── MAIN ── */}
      <Flex flex="1" direction="column" bg={contentBg} minW={0}>

        {/* TOPBAR */}
        <Flex
          h="64px" bg={topbarBg} px={6} align="center"
          justify="space-between"
          boxShadow="0 1px 3px rgba(0,0,0,0.08)"
          borderBottom={`1px solid ${topbarBorder}`}
          flexShrink={0}
        >
          <Flex align="center" gap={2}>
            {projects.length > 0 && (
              <>
                <MdFolder size={16} color={brand.primary} />
                <Select
                  size="sm" w="160px"
                  value={selectedProject?._id || ""}
                  onChange={(e) => selectProject(e.target.value)}
                  borderRadius="lg" borderColor="gray.200"
                  bg={selectBg} fontSize="sm" fontWeight="500"
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

          <HStack spacing={2}>
            <NotificationBell />
            <IconButton
              size="sm" variant="ghost"
              icon={colorMode === "light" ? <MdDarkMode size={18} /> : <MdLightMode size={18} />}
              onClick={toggleColorMode} aria-label="Toggle dark mode"
              color={iconColor} _hover={{ bg: iconHoverBg, color: iconHoverColor }}
            />
            <Button
              size="sm" variant="ghost" leftIcon={<MdPerson size={16} />}
              color={iconColor} _hover={{ bg: iconHoverBg, color: iconHoverColor }}
              onClick={() => navigate("/admin/profile")}
            >
              Profile
            </Button>
            <Button
              size="sm" colorScheme="red" variant="outline"
              leftIcon={<MdLogout size={16} />} onClick={handleLogout}
            >
              Logout
            </Button>
          </HStack>
        </Flex>

        <Box p="6" flex="1" overflowY="auto">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}

export default AdminLayout;