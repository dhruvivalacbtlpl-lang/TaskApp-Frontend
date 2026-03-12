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
import BulkUploadTasks from "./pages/tasks/Bulkuploadtask";
import CreateTaskStatus from "./pages/taskstatus/CreateTaskStatus";
import TaskStatusList from "./pages/taskstatus/TaskStatusList";
import EditTaskStatus from "./pages/taskstatus/EditTaskStatus";
import EditStaffPage from "./pages/EditStaffPage";
import Dashboard from "./pages/Dashboard";
import ProjectsPage from "./pages/project/ProjectsPage";
import CreateProject from "./pages/project/CreateProject";
import EditProject from "./pages/project/EditProject";
import ProjectDetail from "./pages/project/ProjectDetail";
import TeamPage from "./pages/Team/TeamPage";
import IssuesPage from "./pages/tasks/IssuesPage";
import DocumentsPage from "./pages/documents/Documentspage";
import DocumentEditor from "./pages/documents/Documenteditor";
import DocumentViewer from "./pages/documents/DocumentViewer";
import GoPage from "./pages/GoPage";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<AdminProfile />} />

          <Route path="staff">
            <Route index element={<StaffPage />} />
            <Route path="create" element={<CreateStaffPage />} />
            <Route path="edit/:id" element={<EditStaffPage />} />
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
            <Route path="bulk-upload" element={<BulkUploadTasks />} />
          </Route>

          <Route path="task-status">
            <Route index element={<TaskStatusList />} />
            <Route path="create" element={<CreateTaskStatus />} />
            <Route path="edit/:id" element={<EditTaskStatus />} />
          </Route>

          <Route path="projects">
            <Route index element={<ProjectsPage />} />
            <Route path="create" element={<CreateProject />} />
            <Route path="edit/:id" element={<EditProject />} />
            <Route path=":id/detail" element={<ProjectDetail />} />
          </Route>

          <Route path="team" element={<TeamPage />} />
          <Route path="issues" element={<IssuesPage />} />

          <Route path="documents">
            <Route index element={<DocumentsPage />} />
            <Route path="editor" element={<DocumentEditor />} />
            <Route path="editor/:id" element={<DocumentEditor />} />
            <Route path="view/:id" element={<DocumentViewer />} />
          </Route>
        </Route>

        <Route path="/go" element={<GoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 