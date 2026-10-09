import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import type { Env } from "../config/env.js"
import type { Database } from "../db/db.module.js"
import { accounts, profiles, sessions, users, verifications } from "../db/schema/index.js"
import { CLIENT_IP_HEADER } from "./client-ip.js"

export const BETTER_AUTH = Symbol("BETTER_AUTH")

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
      // Ids UUID, como los de las claves ajenas que apuntan a identity.users.
      database: { generateId: "uuid" },
      // La deja resolveClientIp (configure-app.ts). El límite de intentos va por IP.
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
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
