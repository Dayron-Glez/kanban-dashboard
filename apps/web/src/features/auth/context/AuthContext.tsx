import { useEffect, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/shared/supabase"
import { AuthContext } from "./auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // La caché de un usuario no puede verla el siguiente que entre.
      if (event === "SIGNED_OUT") queryClient.clear()
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
