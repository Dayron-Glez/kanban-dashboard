import type { ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { authClient } from "../lib/authClient"
import { AuthContext } from "./auth-context"

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { data, isPending } = authClient.useSession()
  const queryClient = useQueryClient()

  const signOut = async () => {
    await authClient.signOut()
    // La caché de un usuario no puede verla el siguiente que entre.
    queryClient.clear()
  }

  return (
    <AuthContext.Provider value={{ user: data?.user ?? null, loading: isPending, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
