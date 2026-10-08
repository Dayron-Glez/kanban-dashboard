import { createAuthClient } from "better-auth/react"

// La API se sirve bajo /api del propio dominio (Vercel en producción, el proxy
// de Vite en local), así que la cookie de sesión es de primera parte y no hace
// falta indicar la URL: se usa la de la página.
export const authClient = createAuthClient({ basePath: "/api/auth" })

/** El usuario de la sesión, con lo que usa la web. */
export interface SessionUser {
  id: string
  name: string
  email: string
  image?: string | null
}
