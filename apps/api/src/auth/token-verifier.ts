import { errors, jwtVerify, type JWTVerifyGetKey } from "jose"

export interface AuthUser {
  id: string
  email: string | null
}

export type TokenVerifier = (token: string) => Promise<AuthUser>

export const TOKEN_VERIFIER = Symbol("TOKEN_VERIFIER")

export class InvalidTokenError extends Error {}

/**
 * Verifica un token de sesión de Supabase Auth: firma (con las claves públicas
 * del proyecto), emisor, audiencia y caducidad. No hace falta ningún secreto.
 */
export const createSupabaseVerifier =
  (keys: JWTVerifyGetKey, supabaseUrl: string): TokenVerifier =>
  async (token) => {
    try {
      const { payload } = await jwtVerify(token, keys, {
        issuer: `${supabaseUrl}/auth/v1`,
        // Los tokens de usuario llevan aud "authenticated"; la clave anónima no.
        audience: "authenticated",
      })
      if (!payload.sub) throw new InvalidTokenError("El token no identifica a ningún usuario")
      return {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : null,
      }
    } catch (error) {
      if (error instanceof InvalidTokenError) throw error
      if (error instanceof errors.JWTExpired) throw new InvalidTokenError("La sesión ha caducado")
      throw new InvalidTokenError("Token no válido", { cause: error })
    }
  }
