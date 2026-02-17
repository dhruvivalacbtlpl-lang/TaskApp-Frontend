import React, { useState, useEffect } from "react";
import axios from "axios";

const StaffManager = () => {
  const [staffList, setStaffList] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch staff list
  const fetchStaff = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/staff");
      setStaffList(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch staff");
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Create staff
  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (!name || !email || !mobile) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/staff/create", {
        name,
        email,
        mobile,
      });
      setMessage(res.data.message);
      setStaffList((prev) => [...prev, res.data.staff]); // Add to UI instantly
      setName("");
      setEmail("");
      setMobile("");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to create staff");
    } finally {
      setLoading(false);
    }
  };

  // Delete staff
  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/staff/${id}`);
      setStaffList((prev) => prev.filter((s) => s._id !== id));
      setMessage("Staff deleted successfully");
    } catch (err) {
      console.error(err);
      setError("Failed to delete staff");
    }
  };

  return (
    <div style={styles.container}>
      <h2>Staff Manager</h2>

      {/* Create Staff Form */}
      <form onSubmit={handleCreate} style={styles.form}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Creating..." : "Create Staff"}
        </button>
      </form>

      {/* Success/Error messages */}
      {message && <p style={{ color: "green", marginTop: 10 }}>{message}</p>}
      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}

      {/* Staff List */}
      <h3 style={{ marginTop: 30 }}>Staff List</h3>
      {staffList.length === 0 ? (
        <p>No staff available.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff._id}>
                <td>{staff.name}</td>
                <td>{staff.email}</td>
                <td>{staff.mobile}</td>
                <td>
                  <button
                    onClick={() => handleDelete(staff._id)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    maxWidth: 700,
    margin: "50px auto",
    padding: 20,
    border: "1px solid #ddd",
    borderRadius: 8,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 15,
  },
  input: {
    padding: 10,
    fontSize: 16,
    borderRadius: 4,
    border: "1px solid #ccc",
  },
  button: {
    padding: 12,
    fontSize: 16,
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 20,
  },
  deleteButton: {
    padding: "5px 10px",
    backgroundColor: "#f44336",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
};

export default StaffManager;
