import { useState, useEffect } from "react";
import {
  Box, Flex, Text, VStack, HStack, Select,
  IconButton, useColorMode, useColorModeValue, Tooltip,
  Divider, Menu, MenuButton, MenuList, MenuItem, Avatar, Badge,
} from "@chakra-ui/react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import UsageBanner from "../components/UsageBanner";
import api from "../api";
import {
  MdDashboard, MdPeople, MdVpnKey, MdSecurity,
  MdCheckBox, MdLabel, MdPerson, MdLogout, MdAssignment,
  MdFolder, MdFolderOpen, MdDarkMode, MdLightMode, MdBugReport,
  MdKeyboardArrowDown, MdChevronLeft, MdChevronRight, MdDescription,
  MdBusiness, MdSettings, MdDomain, MdCreditCard, MdHistory, MdCardMembership,
} from "react-icons/md";
import { brand } from "../theme";

const COLLAPSED_W = "70px";
const EXPANDED_W = "240px";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { colorMode, toggleColorMode } = useColorMode();
  const {
    hasPermission, user, logout,
    projects = [], selectedProject, selectProject,
    isSuperAdmin,
    companies = [], selectedCompany, selectCompany,
  } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const projectRoutes = [
    "/admin/projects", "/admin/tasks", "/admin/task-status",
    "/admin/issues", "/admin/team", "/admin/documents",
  ];
  const isProjectGroupActive = projectRoutes.some(p => location.pathname.startsWith(p));
  const [projectsOpen, setProjectsOpen] = useState(isProjectGroupActive);

  const isOwner = user?.isOwner;
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  useEffect(() => {
    if (isSuperAdmin || !user) return;
    if (location.pathname.includes("/subscription/expired")) return;

    const checkSub = async () => {
      try {
        const r = await api.get("/subscription/my");
        if (r.data?.isExpired) {
          navigate("/admin/subscription/expired");
        }
      } catch (err) {
        if (err?.response?.data?.code === "SUBSCRIPTION_EXPIRED") {
          navigate("/admin/subscription/expired");
        }
      }
    };
    checkSub();
  }, [location.pathname, isSuperAdmin, user, navigate]);

  const sidebarBg = useColorModeValue(brand.sidebar || "#1A202C", "gray.900");
  const topbarBg = useColorModeValue("white", "gray.800");
  const topbarBorder = useColorModeValue("#e2e8f0", "#2d3748");
  const contentBg = useColorModeValue("#F7FAFC", "#171923");

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } finally {
      logout();
      navigate("/");
    }
  };

  return (
    <Flex h="100vh" w="100vw" overflow="hidden">
      {/* ── SIDEBAR (Fixed Height, Internal Scroll) ────────────────────────── */}
      <Box
        w={sidebarOpen ? EXPANDED_W : COLLAPSED_W}
        h="100vh"
        bg={sidebarBg}
        color="white"
        transition="width 0.3s ease"
        py="5"
        px="3"
        zIndex="20"
        boxShadow="xl"
        overflowY="auto"
        overflowX="hidden"
        css={{
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '10px' },
        }}
      >
        <Flex justify={sidebarOpen ? "space-between" : "center"} align="center" mb="8" px="2">
          {sidebarOpen && (
            <HStack spacing={2}>
              <MdAssignment size={24} color={brand.primary} />
              <Text fontWeight="800" fontSize="lg" letterSpacing="wider">TASKAPP</Text>
            </HStack>
          )}
          <IconButton
            size="sm" variant="ghost" color="whiteAlpha.700"
            _hover={{ bg: "whiteAlpha.200", color: "white" }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            icon={sidebarOpen ? <MdChevronLeft size={22}/> : <MdChevronRight size={22}/>}
          />
        </Flex>

        <VStack align="stretch" spacing="1">
          <NavItem to="/admin" icon={MdDashboard} label="Dashboard" sidebarOpen={sidebarOpen} end />

          {isSuperAdmin && (
            <>
              <Divider borderColor="whiteAlpha.300" my="2" />
              {sidebarOpen && (
                <Text fontSize="xs" fontWeight="bold" color="yellow.400" ml="2" mb="1">SUPERADMIN</Text>
              )}
              <NavItem to="/admin/companies" icon={MdDomain} label="Companies" sidebarOpen={sidebarOpen} />
              <NavItem to="/admin/subscriptions" icon={MdCardMembership} label="Subscriptions" sidebarOpen={sidebarOpen} />
              <NavItem to="/admin/subscription/audit-log" icon={MdHistory} label="Audit Logs" sidebarOpen={sidebarOpen} />
            </>
          )}

          {!isSuperAdmin && (isOwner || isAdmin) && (
            <>
              <Divider borderColor="whiteAlpha.300" my="2" />
              {sidebarOpen && (
                <Text fontSize="xs" fontWeight="bold" color="whiteAlpha.500" ml="2" mb="1">SUBSCRIPTION</Text>
              )}
              <NavItem to="/admin/subscription/current" icon={MdCreditCard} label="My Plan" sidebarOpen={sidebarOpen} />
            </>
          )}

          <Divider borderColor="whiteAlpha.300" my="2" />
          {sidebarOpen && (
            <Text fontSize="xs" fontWeight="bold" color="whiteAlpha.500" ml="2" mb="1">MANAGEMENT</Text>
          )}

          {(isSuperAdmin || isAdmin || hasPermission("staff_read")) && (
            <NavItem to="/admin/staff" icon={MdPeople} label="Staff" sidebarOpen={sidebarOpen} />
          )}
          {(isAdmin || hasPermission("role_read")) && (
            <NavItem to="/admin/roles" icon={MdVpnKey} label="Roles" sidebarOpen={sidebarOpen} />
          )}
          {(isAdmin || hasPermission("permissions_read")) && (
            <NavItem to="/admin/permissions" icon={MdSecurity} label="Permissions" sidebarOpen={sidebarOpen} />
          )}

          <Divider borderColor="whiteAlpha.300" my="2" />

          <Box>
            <Flex
              align="center" p="12px" cursor="pointer" borderRadius="lg"
              _hover={{ bg: "whiteAlpha.200" }}
              onClick={() => { if (!sidebarOpen) setSidebarOpen(true); setProjectsOpen(!projectsOpen); }}
            >
              <MdFolder size={22} />
              {sidebarOpen && (
                <>
                  <Text ml="3" flex="1" fontSize="14px" fontWeight="500">Project Hub</Text>
                  <MdKeyboardArrowDown
                    style={{ transform: projectsOpen ? "rotate(0)" : "rotate(-90deg)", transition: "0.2s" }}
                  />
                </>
              )}
            </Flex>

            {projectsOpen && sidebarOpen && (
              <VStack align="stretch" pl="10" mt="1" spacing="1">
                {(isSuperAdmin || isAdmin || hasPermission("project_read")) && (
                  <SubNavItem to="/admin/projects" icon={MdFolderOpen} label="All Projects" />
                )}
                {(isSuperAdmin || isAdmin || hasPermission("project_read")) && (
                  <SubNavItem to="/admin/team" icon={MdPeople} label="Project Team" />
                )}
                {(isSuperAdmin || isAdmin || hasPermission("task_read")) && (
                  <SubNavItem to="/admin/tasks" icon={MdCheckBox} label="Tasks" />
                )}
                {(isSuperAdmin || isAdmin || hasPermission("taskstatus_read")) && (
                  <SubNavItem to="/admin/task-status" icon={MdLabel} label="Task Status" />
                )}
                {(isSuperAdmin || isAdmin || hasPermission("issues_read")) && (
                  <SubNavItem to="/admin/issues" icon={MdBugReport} label="Issues" />
                )}
                {(isSuperAdmin || isAdmin || hasPermission("document_read")) && (
                  <SubNavItem to="/admin/documents" icon={MdDescription} label="Documents" />
                )}
              </VStack>
            )}
          </Box>
        </VStack>
      </Box>

      {/* ── MAIN AREA (Locked Height) ──────────────────────────────────────── */}
      <Flex flex="1" direction="column" h="100vh" overflow="hidden">
        
        {/* TOPBAR (Sticky) */}
        <Flex
          h="70px"
          minH="70px"
          bg={topbarBg}
          borderBottom="1px solid"
          borderColor={topbarBorder}
          px="6"
          align="center"
          justify="space-between"
          boxShadow="sm"
          zIndex="15"
        >
          <HStack spacing={4}>
            {isSuperAdmin ? (
              <HStack spacing={3}>
                <Badge colorScheme="yellow" fontSize="xs" px="2" py="1" borderRadius="md">SUPERADMIN</Badge>
                <Select
                  size="sm" w="220px" variant="filled" borderRadius="md"
                  value={selectedCompany?._id || ""}
                  onChange={e => {
                    const found = companies.find(c => c._id === e.target.value) || null;
                    selectCompany(found);
                  }}
                >
                  <option value="">All Companies</option>
                  {companies.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </Select>
              </HStack>
            ) : (
              projects?.length > 0 ? (
                <Select
                  size="sm" w="250px" variant="filled" borderRadius="md"
                  value={selectedProject?._id || ""}
                  onChange={e => selectProject(e.target.value)}
                >
                  <option value="">Global Overview (All Projects)</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </Select>
              ) : (
                <Text fontSize="sm" color="gray.400" fontWeight="medium">No active projects found</Text>
              )
            )}
          </HStack>

          <HStack spacing="4">
            <NotificationBell />
            <IconButton
              size="md" variant="ghost"
              icon={colorMode === "light" ? <MdDarkMode size={20}/> : <MdLightMode size={20}/>}
              onClick={toggleColorMode} aria-label="Toggle Color Mode"
            />
            <Menu>
              <MenuButton>
                <HStack spacing={3}>
                  <Avatar size="sm" name={user?.name} src={user?.avatar} />
                  <VStack align="start" spacing={0} display={{ base: "none", md: "flex" }}>
                    <Text fontSize="sm" fontWeight="bold">{user?.name}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {isSuperAdmin ? "Super Admin" : user?.role?.name}
                    </Text>
                  </VStack>
                </HStack>
              </MenuButton>
              <MenuList border="none" boxShadow="xl" zIndex="25">
                <MenuItem icon={<MdPerson size={18}/>} onClick={() => navigate("/admin/profile")}>My Profile</MenuItem>
                {!isSuperAdmin && (
                  <>
                    <MenuItem icon={<MdBusiness size={18}/>} onClick={() => navigate("/admin/company-profile")}>Company Profile</MenuItem>
                    {(isAdmin || isOwner) && (
                      <MenuItem icon={<MdSettings size={18}/>} onClick={() => navigate("/admin/company-settings")}>Company Settings</MenuItem>
                    )}
                    {(isAdmin || isOwner) && (
                      <MenuItem icon={<MdCreditCard size={18}/>} onClick={() => navigate("/admin/subscription/current")}>My Subscription</MenuItem>
                    )}
                  </>
                )}
                <Divider />
                <MenuItem icon={<MdLogout size={18}/>} color="red.500" onClick={handleLogout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>

        {/* ── CONTENT AREA (The only scrolling part) ── */}
        <Box 
          flex="1" 
          bg={contentBg} 
          overflowY="auto" 
          position="relative"
          css={{
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)', borderRadius: '10px' },
          }}
        >
          {!isSuperAdmin && (
            <Box px="8" pt="5" pb="0">
              <UsageBanner />
            </Box>
          )}
          <Box p="8" pt={!isSuperAdmin ? "4" : "8"}>
            <Outlet />
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}

// Helpers
function NavItem({ to, icon: Icon, label, sidebarOpen, end }) {
  return (
    <Tooltip label={label} placement="right" isDisabled={sidebarOpen} hasArrow>
      <NavLink to={to} end={end}
        style={({ isActive }) => ({
          display: "flex", alignItems: "center", padding: "12px",
          borderRadius: "10px", textDecoration: "none",
          background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
          color: isActive ? "white" : "rgba(255,255,255,0.7)",
          fontWeight: isActive ? "600" : "400", transition: "0.2s",
        })}>
        <Icon size={22} />
        {sidebarOpen && <Text ml="3" fontSize="14px">{label}</Text>}
      </NavLink>
    </Tooltip>
  );
}

function SubNavItem({ to, icon: Icon, label }) {
  return (
    <NavLink to={to}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: "10px",
        padding: "8px 0px", fontSize: "13px",
        color: isActive ? "white" : "rgba(255,255,255,0.6)",
        fontWeight: isActive ? "600" : "400", transition: "0.2s",
      })}>
      <Icon size={16} />
      <Text>{label}</Text>
    </NavLink>
  );
}

export default AdminLayout;