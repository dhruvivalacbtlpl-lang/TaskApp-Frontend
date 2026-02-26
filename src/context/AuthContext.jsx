import api from "../api";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const [projects, setProjects]               = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMembers, setProjectMembers]   = useState([]);

  // ── Load profile ────────────────────────────────────────────────────────────
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

  // ── Load projects ───────────────────────────────────────────────────────────
  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await api.get("/projects");
      const list = res.data || [];
      setProjects(list);

      // Re-sync selectedProject in case members changed
      setSelectedProject(prev => {
        if (!prev) return null;
        const updated = list.find(p => p._id === prev._id);
        return updated || null;
      });
    } catch (err) {
      console.error("Projects fetch error:", err);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Alias for components that call refreshProjects()
  const refreshProjects = fetchProjects;

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProjects();
    } else {
      setProjects([]);
      setSelectedProject(null);
      setProjectMembers([]);
    }
  }, [user]);

  // ── Select project ──────────────────────────────────────────────────────────
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

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    setSelectedProject(null);
    setProjectMembers([]);
    setProjects([]);
  };

  // ── Permission check ────────────────────────────────────────────────────────
  // Supported permission keys (add document_* and issue_* here):
  //   Staff:       Staff_read, Staff_create, Staff_update, Staff_delete
  //   Roles:       role_read, role_create, role_update, role_delete
  //   Permissions: permissions_read, permissions_create, permissions_update, permissions_delete
  //   Projects:    project_read, project_create, project_update, project_delete
  //   Tasks:       task_read, task_create, task_update, task_delete
  //   Task Status: taskstatus_read, taskstatus_create, taskstatus_update, taskstatus_delete
  //   Issues:      issue_read, issue_create, issue_update, issue_delete
  //   Documents:   document_read, document_create, document_update, document_delete
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
        projects, setProjects, projectsLoading,
        selectedProject, projectMembers,
        selectProject, refreshProjects,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}