import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // 🔥 LOAD PROFILE
  const refreshProfile = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/auth/profile",
        { withCredentials: true }
      );
      setUser(res.data);
    } catch (err) {
      console.error(err);
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

  const hasPermission = (perm) => {
    if (!user || !user.role) return false;

    // ADMIN FULL ACCESS
    if (user.role.name?.toLowerCase() === "admin") return true;

    return user?.role?.permissions?.includes(perm.toLowerCase());
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, hasPermission, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
