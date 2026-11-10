import { Route, Routes } from "react-router-dom";
import { AdminRoute } from "@/auth/AdminRoute";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { NotFoundPage } from "@/components/NotFoundPage";
import { AdminPage } from "@/features/admin/AdminPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { ProjectDetailPage } from "@/features/tasks/ProjectDetailPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
