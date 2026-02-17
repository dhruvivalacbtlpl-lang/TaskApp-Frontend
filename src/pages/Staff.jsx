import { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../layout/AdminLayout";

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [editId, setEditId] = useState(null);

  const load = async () => {
    const res = await api.get("/api/users/staff");
    setStaff(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (editId) {
      await api.put(`/api/users/staff/${editId}`, form);
    } else {
      await api.post("/api/users/staff", form);
    }
    setForm({ name: "", email: "", phone: "", password: "" });
    setEditId(null);
    load();
  };

  return (
    <AdminLayout>
      <h2>Staff</h2>

      <div className="form">
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
        {!editId && (
          <input placeholder="Password" type="password"
            value={form.password}
            onChange={e=>setForm({...form,password:e.target.value})}/>
        )}
        <button onClick={submit}>{editId ? "Update" : "Create"}</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {staff.map(s => (
            <tr key={s._id}>
              <td>{s.name}</td>
              <td>{s.email}</td>
              <td>{s.phone}</td>
              <td>
                <button onClick={() => api.patch(`/api/users/staff/${s._id}/status`).then(load)}>
                  {s.status}
                </button>
              </td>
              <td>
                <button onClick={() => { setForm(s); setEditId(s._id); }}>Edit</button>
                <button onClick={() => api.delete(`/api/users/staff/${s._id}`).then(load)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  );
}
