import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user,             setUser]             = useState(null);
  const [projects,         setProjects]         = useState([]);
  const [selectedProject,  setSelectedProject]  = useState(null);
  const [projectMembers,   setProjectMembers]   = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [projectsLoading,  setProjectsLoading]  = useState(false);

  // SuperAdmin extras
  const [companies,        setCompanies]        = useState([]);
  const [selectedCompany,  setSelectedCompany]  = useState(null);

  // Subscription info (for owner/non-superadmin)
  const [subscription,     setSubscription]     = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const [subLoading,       setSubLoading]       = useState(false);

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

  const fetchCompanies = async () => {
    try {
      const res = await api.get("/company/all");
      setCompanies(res.data || []);
    } catch {
      setCompanies([]);
    }
  };

  // Fetch subscription for non-superadmin users
  const fetchSubscription = async () => {
    setSubLoading(true);
    try {
      const res = await api.get("/subscription/my");
      setSubscription(res.data?.subscription || null);
      setSubscriptionPlan(res.data?.plan || null);
    } catch {
      setSubscription(null);
      setSubscriptionPlan(null);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    if (profileFetched.current) return;
    profileFetched.current = true;
    refreshProfile();
  }, []);

  const userId       = user?._id?.toString() || null;
  const isSuperAdmin = !!user?.isSuperAdmin;

  useEffect(() => {
    if (!userId) {
      projectsFetchedForUser.current = null;
      setProjects([]);
      setSelectedProject(null);
      setCompanies([]);
      setSelectedCompany(null);
      setSubscription(null);
      setSubscriptionPlan(null);
      return;
    }
    if (projectsFetchedForUser.current !== userId) {
      projectsFetchedForUser.current = userId;
      fetchProjects();
      if (isSuperAdmin) {
        fetchCompanies();
      } else {
        fetchSubscription();
      }
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
    setSubscription(null);
    setSubscriptionPlan(null);
    profileFetched.current         = false;
    projectsFetchedForUser.current = null;
    localStorage.removeItem("token");
  };

  const hasPermission = (perm) => {
    if (!user || !user.role) return false;
    if (user.isSuperAdmin) return true;
    if (user.role.name?.toLowerCase() === "admin" || user.isOwner) return true;
    return user.role.permissions?.some(p => p?.toLowerCase().trim() === perm.toLowerCase().trim());
  };

  // Helper: check if a feature is available in current plan
  const hasFeature = (feature) => {
    if (isSuperAdmin) return true;
    return subscriptionPlan?.features?.[feature] === true;
  };

  // Helper: get limit for a resource from current plan
  const getLimit = (resource) => {
    if (isSuperAdmin) return -1;
    return subscriptionPlan?.limits?.[resource] ?? -1;
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, hasPermission, refreshProfile,
      projects, setProjects, projectsLoading,
      selectedProject, projectMembers,
      selectProject: (p) => setSelectedProject(
        typeof p === "string" ? projects.find(x => x._id === p) || null : p
      ),
      refreshProjects: fetchProjects,
      // SuperAdmin extras
      isSuperAdmin,
      companies,
      selectedCompany,
      selectCompany:    (c) => setSelectedCompany(c),
      refreshCompanies: fetchCompanies,
      // Subscription
      subscription,
      subscriptionPlan,
      subLoading,
      refreshSubscription: fetchSubscription,
      hasFeature,
      getLimit,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);