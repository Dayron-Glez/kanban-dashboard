import bcrypt from "bcryptjs"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { hashPassword, verifyPassword } from "better-auth/crypto"
import type { Env } from "../config/env.js"
import type { Database } from "../db/db.module.js"
import { profiles } from "../db/generated/schema.js"
import { accounts, sessions, users, verifications } from "../db/identity.js"

export const BETTER_AUTH = Symbol("BETTER_AUTH")

// Las contraseñas importadas de Supabase Auth están en bcrypt ($2a$…): se
// comprueban con bcrypt, y así nadie tiene que cambiarla. Las nuevas se
// guardan en scrypt, el formato de better-auth.
const verify = ({ hash, password }: { hash: string; password: string }) =>
  hash.startsWith("$2") ? bcrypt.compare(password, hash) : verifyPassword({ hash, password })

export const createAuth = (db: Database, env: Env) =>
  betterAuth({
    // La URL pública es la de la web: Vercel reenvía /api/* a la API, así la
    // cookie de sesión es del dominio de la web.
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    advanced: {
      // Los ids son UUID, como los de Supabase: las claves ajenas los necesitan.
      database: { generateId: "uuid" },
      // Detrás de Vercel y Railway, la IP real llega en x-forwarded-for. El
      // límite de intentos de better-auth va por IP.
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
    },
    emailAndPassword: {
      enabled: true,
      // Solo para las cuentas nuevas: al entrar no se comprueba, así que las de
      // Supabase con 6 o 7 caracteres siguen funcionando.
      minPasswordLength: 8,
      password: { hash: hashPassword, verify },
    },
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
          }
        : {},
    // Quien se registró con correo y entra después con Google (mismo correo)
    // sigue siendo el mismo usuario.
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
    databaseHooks: {
      user: {
        create: {
          // El perfil que leen miembros y asignados; antes lo creaba un trigger
          // de auth.users.
          after: async (user) => {
            await db
              .insert(profiles)
              .values({
                id: user.id,
                fullName: user.name,
                email: user.email,
                avatarUrl: user.image ?? null,
              })
              .onConflictDoNothing()
          },
        },
      },
    },
  })

export type Auth = ReturnType<typeof createAuth>
