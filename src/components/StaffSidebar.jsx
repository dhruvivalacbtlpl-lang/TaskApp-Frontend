import { Link } from "react-router-dom";

function StaffSidebar({ children }) {
  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h3 style={styles.logo}>Staff</h3>
        <Link to="/staff/dashboard" style={styles.link}>Dashboard</Link>
        <Link to="/staff/profile" style={styles.link}>Profile</Link>
      </div>
      <div style={styles.content}>{children}</div>
    </div>
  );
}

const styles = {
  container: { display: "flex", minHeight: "100vh" },
  sidebar: { width: "220px", background: "#f8f9fa", padding: "20px", borderRight: "1px solid #ddd" },
  logo: { marginBottom: "30px", fontWeight: "700", fontSize: "18px" },
  link: { display: "block", padding: "10px", marginBottom: "10px", textDecoration: "none", color: "#333", fontWeight: "600" },
  content: { flex: 1, padding: "30px", background: "#fff" },
};

export default StaffSidebar;
