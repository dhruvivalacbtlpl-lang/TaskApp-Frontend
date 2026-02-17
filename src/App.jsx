import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import AdminProfile from "./pages/AdminProfile";
import StaffPage from "./pages/StaffPage";
import CreateStaffPage from "./pages/CreateStaffPage";
import RolesPage from "./pages/RolesPage";
import PermissionsPage from "./pages/PermissionsPage";
import AdminLayout from "./layout/AdminLayout";
import CreatePermissionPage from "./pages/CreatePermissionPage";
import UpdateRole from "./pages/UpdateRole";
import CreateRole from "./pages/CreateRole";
import EditTask from "./pages/tasks/EditTask";
import CreateTask from "./pages/tasks/CreateTask";
import TaskList from "./pages/tasks/TaskList";
import CreateTaskStatus from "./pages/taskstatus/CreateTaskStatus";
import TaskStatusList from "./pages/taskstatus/TaskStatusList";
import EditTaskStatus from "./pages/taskstatus/EditTaskStatus";


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Admin layout */}
        <Route
          path="/admin"
          element={<AdminLayout />}
        >
          <Route index element={<div>Dashboard Overview</div>} />
          <Route path="profile" element={<AdminProfile />} />

          <Route path="staff">
            <Route index element={<StaffPage />} />
            <Route path="create" element={<CreateStaffPage />} />
          </Route>

          <Route path="roles" element={<RolesPage />} />
          <Route path="roles/create" element={<CreateRole />} />
          <Route path="roles/edit/:id" element={<UpdateRole />} />

          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="permissions/create" element={<CreatePermissionPage />} />
          <Route path="permissions/edit/:id" element={<CreatePermissionPage />} />

          <Route path="tasks">
            <Route index element={<TaskList />} />
            <Route path="create" element={<CreateTask />} />
            <Route path="edit/:id" element={<EditTask />} />

          </Route>
          <Route path="task-status">
            <Route index element={<TaskStatusList />} />
            <Route path="create" element={<CreateTaskStatus />} />
            <Route path="edit/:id" element={<EditTaskStatus />}
/>
          </Route>

        </Route>


        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;