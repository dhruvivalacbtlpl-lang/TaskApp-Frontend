import { Link } from "react-router-dom";

function Sidebar({ children }) {
  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h3 style={styles.logo}>Admin</h3>

        <Link to="/staff" style={styles.link}>
          Staff
        </Link>
      </div>

      {/* Main content */}
      <div style={styles.content}>{children}</div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
  },
  sidebar: {
    width: "220px",
    background: "#f8f9fa",
    padding: "20px",
    borderRight: "1px solid #ddd",
  },
  logo: {
    marginBottom: "30px",
  },
  link: {
    display: "block",
    padding: "10px",
    textDecoration: "none",
    color: "#333",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: "30px",
    background: "#fff",
  },
};

export default Sidebar;
