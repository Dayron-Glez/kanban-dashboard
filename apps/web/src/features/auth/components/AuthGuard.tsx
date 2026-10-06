import { Navigate, Outlet } from "react-router"
import { useAuth } from "../context/useAuth"

export function AuthGuard() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
