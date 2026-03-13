import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useColorModeValue } from "@chakra-ui/react";

function Signup() {
  const navigate = useNavigate();

  // ── Company fields ──────────────────────────────────────────────────────────
  const [companyName,    setCompanyName]    = useState("");
  const [companyEmail,   setCompanyEmail]   = useState("");
  const [companyPhone,   setCompanyPhone]   = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");

  // ── Owner fields ────────────────────────────────────────────────────────────
  const [ownerName,     setOwnerName]     = useState("");
  const [ownerEmail,    setOwnerEmail]    = useState("");
  const [ownerMobile,   setOwnerMobile]   = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showPassword,  setShowPassword]  = useState(false);

  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Theme ───────────────────────────────────────────────────────────────────
  const pageBg   = useColorModeValue("#f4f6f8", "#0f1117");
  const cardBg   = useColorModeValue("#fff",    "#1a1d27");
  const titleClr = useColorModeValue("#1e293b", "#ffffff");
  const labelClr = useColorModeValue("#374151", "#e2e8f0");
  const inputBg  = useColorModeValue("#ffffff", "#2d3748");
  const inputClr = useColorModeValue("#1a202c", "#ffffff");
  const inputBdr = useColorModeValue("1px solid #ccc", "1px solid #4a5568");
  const secBg    = useColorModeValue("#f8f4fb", "#1e1730");
  const secBdr   = useColorModeValue("1px solid #e2d0ef", "1px solid #4a3060");
  const errBg    = useColorModeValue("#fef2f2", "#2d1a1a");
  const errClr   = useColorModeValue("#b91c1c", "#fc8181");
  const errBdr   = useColorModeValue("1px solid #fca5a5", "1px solid #c53030");

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (!companyName.trim())  return "Company name is required";
    if (!companyEmail.trim()) return "Company email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) return "Enter a valid company email";
    if (!ownerName.trim())    return "Your name is required";
    if (!ownerEmail.trim())   return "Your email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return "Enter a valid email address";
    if (!ownerPassword)       return "Password is required";
    if (ownerPassword.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await api.post("/auth/signup", {
        companyName:    companyName.trim(),
        companyEmail:   companyEmail.trim(),
        companyPhone:   companyPhone.trim(),
        companyAddress: companyAddress.trim(),
        companyWebsite: companyWebsite.trim(),
        ownerName:      ownerName.trim(),
        ownerEmail:     ownerEmail.trim(),
        ownerMobile:    ownerMobile.trim(),
        ownerPassword,
      });
      setSuccess("Company created! Check your email for login details. Redirecting...");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: "6px",
    border: inputBdr, fontSize: "13px", boxSizing: "border-box",
    outline: "none", background: inputBg, color: inputClr,
  };
  const labelStyle = {
    display: "block", fontSize: "12px", fontWeight: "600",
    color: labelClr, marginBottom: "4px",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg, padding: "30px 16px" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "520px", padding: "32px", background: cardBg, borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}>

        <h2 style={{ textAlign: "center", marginBottom: "6px", fontSize: "22px", fontWeight: "bold", color: titleClr }}>🏢 Create Your Company</h2>
        <p style={{ textAlign: "center", fontSize: "13px", color: "#94a3b8", marginBottom: "24px" }}>Set up your workspace and get started</p>

        {success && (
          <div style={{ color: "#166534", fontSize: "13px", marginBottom: "14px", textAlign: "center", background: "#f0fdf4", padding: "10px", borderRadius: "6px", border: "1px solid #86efac" }}>
            ✅ {success}
          </div>
        )}
        {error && (
          <div style={{ color: errClr, fontSize: "13px", marginBottom: "14px", textAlign: "center", background: errBg, padding: "10px", borderRadius: "6px", border: errBdr }}>
            ❌ {error}
          </div>
        )}

        {/* ── Company Section ── */}
        <div style={{ background: secBg, border: secBdr, borderRadius: "8px", padding: "18px", marginBottom: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "#924485", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px" }}>
            🏢 Company Details
          </p>

          <label style={labelStyle}>Company Name *</label>
          <input style={{ ...inputStyle, marginBottom: "12px" }} placeholder="Acme Corp" value={companyName} onChange={e => setCompanyName(e.target.value)} required />

          <label style={labelStyle}>Company Email *</label>
          <input type="email" style={{ ...inputStyle, marginBottom: "12px" }} placeholder="contact@acme.com" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} required />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} placeholder="+91 9876543210" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Website</label>
              <input style={inputStyle} placeholder="https://acme.com" value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} />
            </div>
          </div>

          <label style={labelStyle}>Address</label>
          <input style={inputStyle} placeholder="123 Main Street, City" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
        </div>

        {/* ── Owner Section ── */}
        <div style={{ background: secBg, border: secBdr, borderRadius: "8px", padding: "18px", marginBottom: "24px" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "#924485", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px" }}>
            👤 Your Account (Company Owner)
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle} placeholder="John Doe" value={ownerName} onChange={e => setOwnerName(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Mobile</label>
              <input style={inputStyle} placeholder="+91 9876543210" value={ownerMobile} onChange={e => setOwnerMobile(e.target.value)} />
            </div>
          </div>

          <label style={labelStyle}>Your Email *</label>
          <input type="email" style={{ ...inputStyle, marginBottom: "12px" }} placeholder="you@acme.com" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} required />

          <label style={labelStyle}>Password *</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              style={{ ...inputStyle, paddingRight: "40px" }}
              placeholder="Min 6 characters"
              value={ownerPassword}
              onChange={e => setOwnerPassword(e.target.value.replace(/\s/g, ""))}
              required
            />
            <span onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", display: "flex", alignItems: "center" }}>
              {showPassword ? <AiOutlineEyeInvisible size={18} color="#888" /> : <AiOutlineEye size={18} color="#888" />}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !!success}
          style={{ width: "100%", padding: "11px", background: success ? "#16a34a" : "linear-gradient(135deg, #924485, #931678)", color: "#fff", border: "none", borderRadius: "8px", cursor: loading || success ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: "600", opacity: loading ? 0.75 : 1, marginBottom: "14px" }}
        >
          {loading ? "Creating Company..." : success ? "Redirecting..." : "🚀 Create Company & Account"}
        </button>

        <p style={{ textAlign: "center", fontSize: "13px", color: "#64748b" }}>
          Already have an account?{" "}
          <span onClick={() => navigate("/login")} style={{ color: "#924485", fontWeight: "600", cursor: "pointer" }}>
            Login here
          </span>
        </p>
      </form>
    </div>
  );
}

export default Signup;