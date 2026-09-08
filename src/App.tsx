import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import "../tailwind.css"
import { AuthProvider, AuthGuard, LoginPage, RegisterPage } from "@/features/auth"
import {
  ProjectsPage,
  ProjectMembersPage,
  ProjectSettingsPage,
  ProjectsProvider,
} from "@/features/project"
import { HomePage } from "@/features/home"
import { AnalyticsPage } from "@/features/analytics"
import { InviteAcceptPage } from "@/features/invite"
import { NotFoundPage } from "@/shared"
import AppLayout from "./layouts/AppLayout"
import KanbanLayout from "./layouts/MainLayout"
import ProjectTasksView from "./features/board/components/ProjectTasksView"

export default App

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite/:token" element={<InviteAcceptPage />} />

          {/* Privadas — todas dentro del mismo shell */}
          <Route element={<AuthGuard />}>
            <Route
              element={
                <ProjectsProvider>
                  <AppLayout />
                </ProjectsProvider>
              }
            >
              {/* Nivel global: sin proyecto activo */}
              <Route path="/home" element={<HomePage />} />
              <Route path="/projects" element={<ProjectsPage />} />

              {/* Nivel de proyecto */}
              <Route element={<KanbanLayout />}>
                <Route path="/projects/:id" element={<ProjectTasksView />} />
                <Route path="/projects/:id/analytics" element={<AnalyticsPage />} />
                <Route path="/projects/:id/members" element={<ProjectMembersPage />} />
                <Route path="/projects/:id/settings" element={<ProjectSettingsPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
