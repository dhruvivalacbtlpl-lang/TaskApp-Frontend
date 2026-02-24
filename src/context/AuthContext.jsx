import api from "../api"; // ✅ fixed from axios
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ PROJECT STATE — added to existing context
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);

  // ✅ LOAD PROFILE
  const refreshProfile = async () => {
    try {
      const res = await api.get("/auth/profile", { withCredentials: true });
      setUser(res.data);
    } catch (err) {
      console.error("Profile fetch error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOAD PROJECTS — only after user is loaded
  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data || []);
    } catch (err) {
      console.error("Projects fetch error:", err);
      setProjects([]);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  // ✅ fetch projects when user logs in
  useEffect(() => {
    if (user) fetchProjects();
    if (!user) {
      // reset project state on logout
      setProjects([]);
      setSelectedProject(null);
      setProjectMembers([]);
    }
  }, [user]);

  // ✅ SELECT PROJECT
  const selectProject = (projectId) => {
    if (!projectId) {
      setSelectedProject(null);
      setProjectMembers([]);
      return;
    }
    const found = projects.find(p => p._id === projectId);
    setSelectedProject(found || null);
    setProjectMembers(found?.members || []);
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    setSelectedProject(null);
    setProjectMembers([]);
    setProjects([]);
  };

  // ✅ SAFE PERMISSION CHECK
  const hasPermission = (perm) => {
    if (!user || !user.role) return false;
    if (user.role.name?.toLowerCase() === "admin") return true;
    if (!user.role.permissions) return false;
    return user.role.permissions.some(
      (p) => p?.toLowerCase().trim() === perm.toLowerCase().trim()
    );
  };

  return (
    <AuthContext.Provider
      value={{
        // auth
        user, loading, login, logout, hasPermission, refreshProfile,
        // projects
        projects, setProjects, selectedProject, projectMembers, selectProject,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}