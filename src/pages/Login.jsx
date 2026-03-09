import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useColorModeValue } from "@chakra-ui/react";

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pageBg   = useColorModeValue("#f4f6f8", "#0f1117");
  const cardBg   = useColorModeValue("#fff", "#1a1d27");
  const titleClr = useColorModeValue("#1e293b", "#ffffff");
  const labelClr = useColorModeValue("#374151", "#e2e8f0");
  const inputBg  = useColorModeValue("#ffffff", "#2d3748");
  const inputClr = useColorModeValue("#1a202c", "#ffffff");
  const inputBdr = useColorModeValue("1px solid #ccc", "1px solid #4a5568");
  const errBg    = useColorModeValue("#fef2f2", "#2d1a1a");
  const errClr   = useColorModeValue("#b91c1c", "#fc8181");
  const errBdr   = useColorModeValue("1px solid #fca5a5", "1px solid #c53030");

  const validate = () => {
    if (!email.trim()) return "Email is required";
    if (email.length > 100) return "Email must be under 100 characters";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password.length > 50) return "Password must be under 50 characters";
    if (!/^[a-zA-Z0-9@#$%^&*!_\-\.]+$/.test(password)) return "Password contains invalid characters";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const userData = res.data?.data || res.data?.staff || res.data;
      if (!userData) throw new Error("Invalid response from server");
      login(userData);
      setSuccess("Login successful! Redirecting...");
      const redirectTo = searchParams.get("redirect") || "/admin";
      console.log("🔍 Full URL:", window.location.href);
      console.log("🔍 searchParams redirect:", searchParams.get("redirect"));
      console.log("🔍 Redirecting to:", redirectTo);
      setTimeout(() => window.location.href = redirectTo, 1200);
    } catch (adminErr) {
      setError(adminErr.response?.data?.message || adminErr.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => { if (e.target.value.length <= 100) setEmail(e.target.value); };
  const handlePasswordChange = (e) => {
    const val = e.target.value.replace(/\s/g, "");
    if (val.length <= 50) setPassword(val);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg }}>
      <form onSubmit={handleSubmit} style={{ width: "350px", padding: "30px", background: cardBg, borderRadius: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px", fontSize: "22px", fontWeight: "bold", color: titleClr }}>🔐 Login</h2>

        {success && (
          <div style={{ color: "#166534", fontSize: "13px", marginBottom: "12px", textAlign: "center", background: "#f0fdf4", padding: "10px", borderRadius: "6px", border: "1px solid #86efac" }}>
            ✅ {success}
          </div>
        )}

        {error && (
          <div style={{ color: errClr, fontSize: "13px", marginBottom: "12px", textAlign: "center", background: errBg, padding: "10px", borderRadius: "6px", border: errBdr }}>
            ❌ {error}
          </div>
        )}

        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: labelClr, marginBottom: "5px" }}>Email</label>
        <input
          type="email" placeholder="Enter your email" value={email}
          onChange={handleEmailChange} required maxLength={100}
          style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "6px", border: inputBdr, fontSize: "14px", boxSizing: "border-box", outline: "none", background: inputBg, color: inputClr }}
        />

        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: labelClr, marginBottom: "5px" }}>Password</label>
        <div style={{ position: "relative", marginBottom: "15px" }}>
          <input
            type={showPassword ? "text" : "password"} placeholder="Enter your password"
            value={password} onChange={handlePasswordChange} required maxLength={50}
            style={{ width: "100%", padding: "10px 40px 10px 10px", borderRadius: "6px", border: inputBdr, fontSize: "14px", boxSizing: "border-box", outline: "none", background: inputBg, color: inputClr }}
          />
          <span onClick={() => setShowPassword(!showPassword)}
            style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {showPassword ? <AiOutlineEyeInvisible size={20} color="#888" /> : <AiOutlineEye size={20} color="#888" />}
          </span>
        </div>

        <button type="submit" disabled={loading || !!success}
          style={{ width: "100%", padding: "10px", background: success ? "#16a34a" : "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "15px", fontWeight: "600", opacity: loading ? 0.7 : 1, transition: "background 0.3s" }}>
          {loading ? "Logging in..." : success ? "Redirecting..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;