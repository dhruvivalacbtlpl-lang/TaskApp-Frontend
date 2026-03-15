import { createContext, useContext, useState, useEffect } from "react";
import api from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]); 
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const res = await api.get("/auth/profile");
      // Mapping response: res.data should contain the user and their company's projects
      const userData = res.data.user || res.data;
      const projectData = res.data.projects || [];
      
      setUser(userData);
      setProjects(projectData);
    } catch (err) {
      console.error("Profile refresh failed:", err);
      // Don't clear user here to prevent flickering on temporary network issues
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await refreshProfile();
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = (data) => {
    setUser(data.user);
    setProjects(data.projects || []);
  };

  const logout = () => {
    setUser(null);
    setProjects([]);
    setSelectedProject(null);
    localStorage.clear();
  };

  const selectProject = (projectId) => {
    const found = projects.find((p) => p._id === projectId);
    setSelectedProject(found || null);
  };

  const hasPermission = (perm) => {
    // Super-admin check
    if (user?.role?.name?.toLowerCase() === "admin") return true;
    // Standard permission check
    return user?.permissions?.includes(perm) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        projects,
        selectedProject,
        loading,
        login,
        logout,
        selectProject,
        hasPermission,
        refreshProfile,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);