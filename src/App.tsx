import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import "../tailwind.css"
import { AuthProvider, AuthGuard, LoginPage, RegisterPage } from "@/features/auth"
import { ProjectsPage, ProjectSettingsPage } from "@/features/project"
import { AnalyticsPage } from "@/features/analytics"
import { InviteAcceptPage } from "@/features/invite"
import AppLayout from "./layouts/AppLayout"
import KanbanLayout from "./layouts/MainLayout"
import KanbanBoard from "./features/board/components/KanbanBoard"

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

          {/* Privadas */}
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/projects" element={<ProjectsPage />} />
              <Route element={<KanbanLayout />}>
                <Route path="/projects/:id" element={<KanbanBoard />} />
                <Route path="/projects/:id/analytics" element={<AnalyticsPage />} />
                <Route path="/projects/:id/settings" element={<ProjectSettingsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/projects" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
