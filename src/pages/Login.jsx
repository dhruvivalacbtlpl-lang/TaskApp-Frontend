import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useColorModeValue } from "@chakra-ui/react";

const SUPERADMIN_EMAIL = "admin@taskapp.com";

function Login() {
  const { login } = useAuth();
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [loading,      setLoading]      = useState(false);

  const [companies,         setCompanies]         = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loadingCompanies,  setLoadingCompanies]  = useState(false);
  const [emailChecked,      setEmailChecked]      = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pageBg   = useColorModeValue("#f4f6f8", "#0f1117");
  const cardBg   = useColorModeValue("#fff",    "#1a1d27");
  const titleClr = useColorModeValue("#1e293b", "#ffffff");
  const labelClr = useColorModeValue("#374151", "#e2e8f0");
  const inputBg  = useColorModeValue("#ffffff", "#2d3748");
  const inputClr = useColorModeValue("#1a202c", "#ffffff");
  const inputBdr = useColorModeValue("1px solid #ccc", "1px solid #4a5568");
  const errBg    = useColorModeValue("#fef2f2", "#2d1a1a");
  const errClr   = useColorModeValue("#b91c1c", "#fc8181");
  const errBdr   = useColorModeValue("1px solid #fca5a5", "1px solid #c53030");

  // ✅ Show deactivated message if redirected from api.js interceptor
  useEffect(() => {
    const msg = localStorage.getItem("deactivated_msg");
    if (msg) {
      setError(msg);
      localStorage.removeItem("deactivated_msg");
    }
  }, []);

  const isSuperAdminEmail = email.trim().toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();

  const handleEmailBlur = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (isSuperAdminEmail) {
      setCompanies([]); setSelectedCompanyId(""); setEmailChecked(false); return;
    }
    setLoadingCompanies(true); setCompanies([]); setSelectedCompanyId(""); setEmailChecked(false);
    try {
      const res  = await api.get(`/auth/companies?email=${encodeURIComponent(email)}`);
      const list = res.data?.companies || [];
      setCompanies(list);
      if (list.length === 1) setSelectedCompanyId(list[0]._id);
      setEmailChecked(true);
    } catch {
      setEmailChecked(true);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const validate = () => {
    if (!email.trim())   return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
    if (!password)       return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (!isSuperAdminEmail && companies.length > 1 && !selectedCompanyId)
      return "Please select a company";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const payload = { email, password };
      if (!isSuperAdminEmail && selectedCompanyId) payload.companyId = selectedCompanyId;

      const res      = await api.post("/auth/login", payload);
      const userData = res.data?.data || res.data?.staff || res.data;
      if (!userData) throw new Error("Invalid response from server");

      // ✅ No token needed — backend sets httpOnly cookie
      login(userData);
      setSuccess("Login successful! Redirecting...");
      const redirectTo = searchParams.get("redirect") || "/admin";
      setTimeout(() => (window.location.href = redirectTo), 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px", borderRadius: "6px", border: inputBdr,
    fontSize: "14px", boxSizing: "border-box", outline: "none",
    background: inputBg, color: inputClr,
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:pageBg }}>
      <form onSubmit={handleSubmit} style={{ width:"380px", padding:"30px", background:cardBg, borderRadius:"10px", boxShadow:"0 10px 25px rgba(0,0,0,0.15)" }}>
        <h2 style={{ textAlign:"center", marginBottom:"20px", fontSize:"22px", fontWeight:"bold", color:titleClr }}>
          🔐 Login
        </h2>

        {success && (
          <div style={{ color:"#166534", fontSize:"13px", marginBottom:"12px", textAlign:"center", background:"#f0fdf4", padding:"10px", borderRadius:"6px", border:"1px solid #86efac" }}>
            ✅ {success}
          </div>
        )}
        {error && (
          <div style={{ color:errClr, fontSize:"13px", marginBottom:"12px", textAlign:"center", background:errBg, padding:"10px", borderRadius:"6px", border:errBdr }}>
            ❌ {error}
          </div>
        )}

        <label style={{ display:"block", fontSize:"13px", fontWeight:"600", color:labelClr, marginBottom:"5px" }}>Email</label>
        <input
          type="email" placeholder="Enter your email" value={email}
          onChange={e => { setEmail(e.target.value); setEmailChecked(false); setCompanies([]); setSelectedCompanyId(""); }}
          onBlur={handleEmailBlur} required
          style={{ ...inputStyle, marginBottom:"15px" }}
        />

        {isSuperAdminEmail && (
          <div style={{ fontSize:"13px", color:"#92400e", background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:"6px", padding:"8px 12px", marginBottom:"12px", display:"flex", alignItems:"center", gap:"8px" }}>
            ⭐ <span>Logging in as <strong>Super Admin</strong></span>
          </div>
        )}

        {!isSuperAdminEmail && loadingCompanies && (
          <p style={{ fontSize:"12px", color:"#888", marginBottom:"12px" }}>🔍 Looking up companies...</p>
        )}
        {!isSuperAdminEmail && emailChecked && companies.length === 0 && (
          <div style={{ fontSize:"12px", color:errClr, background:errBg, border:errBdr, borderRadius:"6px", padding:"8px 10px", marginBottom:"12px" }}>
            ⚠️ No account found for this email.
          </div>
        )}
        {!isSuperAdminEmail && companies.length === 1 && (
          <div style={{ fontSize:"13px", color:"#166534", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:"6px", padding:"8px 10px", marginBottom:"12px", display:"flex", alignItems:"center", gap:"8px" }}>
            {companies[0].logo
              ? <img src={companies[0].logo} alt="" style={{ width:"22px", height:"22px", borderRadius:"4px", objectFit:"cover" }}/>
              : <span>🏢</span>}
            <span>Logging into <strong>{companies[0].name}</strong></span>
          </div>
        )}
        {!isSuperAdminEmail && companies.length > 1 && (
          <>
            <label style={{ display:"block", fontSize:"13px", fontWeight:"600", color:labelClr, marginBottom:"5px" }}>Select Company</label>
            <div style={{ marginBottom:"15px", display:"flex", flexDirection:"column", gap:"8px" }}>
              {companies.map(c => (
                <div key={c._id} onClick={() => setSelectedCompanyId(c._id)}
                  style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 12px", borderRadius:"8px", cursor:"pointer",
                    border: selectedCompanyId === c._id ? "2px solid #924485" : inputBdr,
                    background: selectedCompanyId === c._id ? (inputBg === "#ffffff" ? "#fdf4ff" : "#2d1f30") : inputBg, transition:"all 0.2s" }}>
                  {c.logo
                    ? <img src={c.logo} alt="" style={{ width:"28px", height:"28px", borderRadius:"6px", objectFit:"cover" }}/>
                    : <div style={{ width:"28px", height:"28px", borderRadius:"6px", background:"#924485", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"12px", fontWeight:"bold" }}>{c.name.charAt(0).toUpperCase()}</div>}
                  <div>
                    <div style={{ fontSize:"13px", fontWeight:"600", color:inputClr }}>{c.name}</div>
                    <div style={{ fontSize:"11px", color:"#888" }}>{c.email}</div>
                  </div>
                  {selectedCompanyId === c._id && <span style={{ marginLeft:"auto", color:"#924485", fontWeight:"bold" }}>✓</span>}
                </div>
              ))}
            </div>
          </>
        )}

        <label style={{ display:"block", fontSize:"13px", fontWeight:"600", color:labelClr, marginBottom:"5px" }}>Password</label>
        <div style={{ position:"relative", marginBottom:"20px" }}>
          <input
            type={showPassword ? "text" : "password"} placeholder="Enter your password"
            value={password} onChange={e => setPassword(e.target.value)} required
            style={{ ...inputStyle, padding:"10px 40px 10px 10px" }}
          />
          <span onClick={() => setShowPassword(!showPassword)}
            style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", cursor:"pointer", display:"flex", alignItems:"center" }}>
            {showPassword ? <AiOutlineEyeInvisible size={20} color="#888"/> : <AiOutlineEye size={20} color="#888"/>}
          </span>
        </div>

        <button type="submit" disabled={loading || !!success}
          style={{ width:"100%", padding:"10px", background:success ? "#16a34a" : "#924485", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"15px", fontWeight:"600", opacity:loading ? 0.7 : 1, transition:"background 0.3s", marginBottom:"16px" }}>
          {loading ? "Logging in..." : success ? "Redirecting..." : "Login"}
        </button>

        <div style={{ textAlign:"center", borderTop:"1px solid #e2e8f0", paddingTop:"16px" }}>
          <p style={{ fontSize:"13px", color:"#64748b", marginBottom:"8px" }}>New to TaskApp?</p>
          <button type="button" onClick={() => navigate("/signup")}
            style={{ width:"100%", padding:"9px", background:"transparent", border:"2px solid #924485", color:"#924485", borderRadius:"6px", cursor:"pointer", fontSize:"14px", fontWeight:"600" }}>
            🏢 Create Your Company
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;