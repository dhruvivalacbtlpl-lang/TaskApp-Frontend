import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]                   = useState(null);
  const [projects, setProjects]           = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMembers, setProjectMembers]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // SuperAdmin: list of all companies + selected company filter
  const [companies, setCompanies]                   = useState([]);
  const [selectedCompany, setSelectedCompany]       = useState(null); // null = all companies

  const projectsFetchedForUser = useRef(null);
  const profileFetched         = useRef(false);

  const refreshProfile = async () => {
    try {
      const res = await api.get("/auth/profile");
      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error("Profile refresh failed:", err);
      setUser(null);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const res  = await api.get("/projects");
      const list = res.data || [];
      setProjects(list);
      setSelectedProject(prev => {
        if (!prev) return null;
        return list.find(p => p._id === prev._id) || null;
      });
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  // SuperAdmin: fetch all companies
  const fetchCompanies = async () => {
    try {
      const res = await api.get("/company/all");
      setCompanies(res.data || []);
    } catch {
      setCompanies([]);
    }
  };

  useEffect(() => {
    if (profileFetched.current) return;
    profileFetched.current = true;
    refreshProfile();
  }, []);

  const userId        = user?._id?.toString() || null;
  const isSuperAdmin  = !!user?.isSuperAdmin;

  useEffect(() => {
    if (!userId) {
      projectsFetchedForUser.current = null;
      setProjects([]);
      setSelectedProject(null);
      setCompanies([]);
      setSelectedCompany(null);
      return;
    }
    if (projectsFetchedForUser.current !== userId) {
      projectsFetchedForUser.current = userId;
      fetchProjects();
      if (isSuperAdmin) fetchCompanies();
    }
  }, [userId, isSuperAdmin]);

  const login = (userData, token) => {
    setUser(userData);
    profileFetched.current = true;
    if (token) localStorage.setItem("token", token);
  };

  const logout = () => {
    setUser(null);
    setProjects([]);
    setSelectedProject(null);
    setCompanies([]);
    setSelectedCompany(null);
    profileFetched.current         = false;
    projectsFetchedForUser.current = null;
    localStorage.removeItem("token");
  };

  const hasPermission = (perm) => {
    if (!user || !user.role) return false;
    // SuperAdmin bypasses ALL permission checks
    if (user.isSuperAdmin) return true;
    if (user.role.name?.toLowerCase() === "admin" || user.isOwner) return true;
    return user.role.permissions?.some(p => p?.toLowerCase().trim() === perm.toLowerCase().trim());
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, hasPermission, refreshProfile,
      projects, setProjects, projectsLoading,
      selectedProject, projectMembers,
      selectProject: (p) => setSelectedProject(typeof p === "string" ? projects.find(x => x._id === p) || null : p),
      refreshProjects: fetchProjects,
      // SuperAdmin extras
      isSuperAdmin,
      companies,
      selectedCompany,
      selectCompany: (c) => setSelectedCompany(c),
      refreshCompanies: fetchCompanies,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);