import { Outlet, useNavigate } from "react-router-dom";
import axios from "axios";

function StaffLayout() {
  const navigate = useNavigate(); // ✅ MUST initialize

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:5000/api/auth/logout",
        {},
        { withCredentials: true }
      );

      // Clear frontend auth state
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("role");

      // Redirect to login
      navigate("/", { replace: true });

    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>Staff Panel</h2>

        <button
          style={styles.link}
          onClick={() => navigate("/staff")}
        >
          Dashboard
        </button>

        <button
          style={styles.logout}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

export default StaffLayout;

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
  },
  sidebar: {
    width: "220px",
    background: "#1e293b",
    color: "#fff",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  },
  logo: {
    marginBottom: "30px",
  },
  link: {
    background: "transparent",
    border: "none",
    color: "#fff",
    padding: "10px 0",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "15px",
  },
  logout: {
    marginTop: "auto",
    background: "#ef4444",
    border: "none",
    padding: "8px",
    borderRadius: "5px",
    cursor: "pointer",
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: "30px",
    background: "#f8fafc",
  },
};
