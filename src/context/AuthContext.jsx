import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 LOAD PROFILE
  const refreshProfile = async () => {
    try {
      const res = await axios.get(
        "/auth/profile",
        { withCredentials: true }
      );

      setUser(res.data);
    } catch (err) {
      console.error("Profile fetch error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  // ✅ SAFE PERMISSION CHECK
  const hasPermission = (perm) => {
    if (!user || !user.role) return false;

    // Admin full access
    if (user.role.name?.toLowerCase() === "admin") return true;

    if (!user.role.permissions) return false;

    return user.role.permissions.some(
      (p) => p?.toLowerCase().trim() === perm.toLowerCase().trim()
    );
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, hasPermission, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
