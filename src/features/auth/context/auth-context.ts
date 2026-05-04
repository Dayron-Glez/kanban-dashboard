import { createContext } from "react"
import type { Session, User } from "@supabase/supabase-js"

export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
