import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const projectsFetchedForUser = useRef(null);
  const profileFetched = useRef(false);

  // Corrected refreshProfile to ensure state is replaced properly
  const refreshProfile = async () => {
    try {
      const res = await api.get("/auth/profile");
      setUser(res.data); // res.data should contain the company object
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
      const res = await api.get("/projects");
      const list = res.data || [];
      setProjects(list);
      setSelectedProject(prev => {
        if (!prev) return null;
        return list.find(p => p._id === prev._id) || null;
      });
    } catch (err) {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    if (profileFetched.current) return;
    profileFetched.current = true;
    refreshProfile();
  }, []);

  const userId = user?._id?.toString() || null;
  useEffect(() => {
    if (userId && projectsFetchedForUser.current !== userId) {
      projectsFetchedForUser.current = userId;
      fetchProjects();
    } else if (!userId) {
      projectsFetchedForUser.current = null;
      setProjects([]);
      setSelectedProject(null);
    }
  }, [userId]);

  const login = (userData, token) => {
    setUser(userData);
    profileFetched.current = true;
    if (token) localStorage.setItem("token", token);
  };

  const logout = () => {
    setUser(null);
    setProjects([]);
    setSelectedProject(null);
    profileFetched.current = false;
    projectsFetchedForUser.current = null;
    localStorage.removeItem("token");
  };

  const hasPermission = (perm) => {
    if (!user || !user.role) return false;
    if (user.role.name?.toLowerCase() === "admin" || user.isOwner) return true;
    return user.role.permissions?.some(p => p?.toLowerCase().trim() === perm.toLowerCase().trim());
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, hasPermission, refreshProfile,
      projects, setProjects, projectsLoading,
      selectedProject, projectMembers,
      selectProject: (p) => setSelectedProject(p), 
      refreshProjects: fetchProjects,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);