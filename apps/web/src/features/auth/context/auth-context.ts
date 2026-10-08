import { createContext } from "react"
import type { SessionUser } from "../lib/authClient"

export interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
