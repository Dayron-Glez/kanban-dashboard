import type { IncomingHttpHeaders } from "node:http"

export interface AuthUser {
  id: string
  email: string
}

/** El usuario de la sesión que traen las cabeceras (la cookie), o null si no hay. */
export type SessionResolver = (headers: IncomingHttpHeaders) => Promise<AuthUser | null>

export const SESSION_RESOLVER = Symbol("SESSION_RESOLVER")
