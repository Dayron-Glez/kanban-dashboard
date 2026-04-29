import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import "../tailwind.css"
import { AuthProvider, AuthGuard, LoginPage, RegisterPage } from "@/features/auth"
import MainLayout from "./layouts/MainLayout"
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

          {/* Privadas */}
          <Route element={<AuthGuard />}>
            <Route element={<MainLayout />}>
              <Route path="/projects" element={<div />} />
              <Route path="/projects/:id" element={<KanbanBoard />} />
            </Route>
          </Route>

          {/* Raíz → redirige según sesión (AuthGuard lo gestiona) */}
          <Route path="/" element={<Navigate to="/projects" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
