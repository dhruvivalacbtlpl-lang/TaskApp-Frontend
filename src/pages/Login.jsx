import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /* ================= VALIDATION ================= */
  const validate = () => {
    if (!email.trim()) return "Email is required";

    if (email.length > 100) return "Email must be under 100 characters";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";

    if (!password) return "Password is required";

    if (password.length < 6) return "Password must be at least 6 characters";

    if (password.length > 50) return "Password must be under 50 characters";

    // ✅ Bug 4 fixed — added . and more common chars
    const passwordRegex = /^[a-zA-Z0-9@#$%^&*!_\-\.]+$/;
    if (!passwordRegex.test(password)) return "Password contains invalid characters";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });

      // ✅ Bug 1 fixed — handle both response formats safely
      const userData = res.data?.data || res.data?.staff || res.data;
      if (!userData) throw new Error("Invalid response from server");

      login(userData);
      navigate("/admin");
    } catch (adminErr) {
      const message = adminErr.response?.data?.message
        || adminErr.response?.data?.error
        || "Login failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= INPUT HANDLERS ================= */
  const handleEmailChange = (e) => {
    if (e.target.value.length <= 100) setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value.replace(/\s/g, ""); // no spaces
    if (val.length <= 50) setPassword(val);
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2 style={styles.title}>🔐 Login</h2>

        {error && (
          <div style={styles.errorBox}>❌ {error}</div>
        )}

        <label style={styles.label}>Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={handleEmailChange}
          required
          maxLength={100}
          style={styles.input}
        />

        <label style={styles.label}>Password</label>
        <div style={styles.passwordBox}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={handlePasswordChange}
            required
            maxLength={50}
            style={styles.inputPassword}
          />
          {/* ✅ Bug 2 fixed — correct eye icon position */}
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            {showPassword
              ? <AiOutlineEyeInvisible size={20} color="#888" />
              : <AiOutlineEye size={20} color="#888" />
            }
          </span>
        </div>

        {/* character counter */}
        <span style={styles.charCount}>
          {password.length}/50
        </span>

        <button
          type="submit"
          style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f6f8",
  },
  card: {
    width: "350px",
    padding: "30px",
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
    fontSize: "22px",
    fontWeight: "bold",
    color: "#1e293b",
  },
  errorBox: {
    color: "#b91c1c",
    fontSize: "13px",
    marginBottom: "12px",
    textAlign: "center",
    background: "#fef2f2",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #fca5a5",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "5px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  },
  passwordBox: {
    position: "relative",
    marginBottom: "4px",
  },
  inputPassword: {
    width: "100%",
    padding: "10px 40px 10px 10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  },
  // ✅ Bug 2 fixed — moved charCount outside passwordBox
  charCount: {
    display: "block",
    textAlign: "right",
    fontSize: "11px",
    color: "#9ca3af",
    marginBottom: "15px",
  },
  eyeIcon: {
    position: "absolute",
    right: "10px",
    top: "50%", // ✅ fixed from 35%
    transform: "translateY(-50%)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  button: {
    width: "100%",
    padding: "10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    marginTop: "4px",
  },
};