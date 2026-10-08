import * as z from "zod"

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    // La URL pública de la web (no la de Railway): better-auth construye con ella
    // las redirecciones de Google y la cookie es de ese dominio.
    BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, "")),
    // Firma las cookies de sesión. Cambiarlo cierra todas las sesiones.
    BETTER_AUTH_SECRET: z.string().min(32),
    // Opcionales: sin ellas, no se ofrece entrar con Google (en local, por ejemplo).
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    // Lo añade Vercel a cada petición /api (vercel.json): sin él, la API solo
    // responde /health. Obligatorio en producción.
    PROXY_SECRET: z.string().min(32).optional(),
  })
  .refine((env) => env.NODE_ENV !== "production" || env.PROXY_SECRET, {
    path: ["PROXY_SECRET"],
    message: "Obligatorio en producción",
  })

export type Env = z.infer<typeof EnvSchema>

export const ENV = Symbol("ENV")

// Si falta algo, la API no arranca: mejor un error claro al desplegar que un
// fallo a medias con la primera petición.
export const parseEnv = (source: Record<string, string | undefined>): Env => {
  const result = EnvSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`Configuración inválida:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
