import { defineConfig } from "drizzle-kit"

try {
  process.loadEnvFile(".env")
} catch {
  // Sin .env: se usa DATABASE_URL del entorno.
}

// Mientras la base siga en Supabase, el dueño de las migraciones es
// supabase/migrations: Drizzle solo refleja el esquema (pnpm db:schema). Pasa
// a ser el dueño en el paso a Neon (sub-PR 4.3).
export default defineConfig({
  dialect: "postgresql",
  out: "./src/db/generated",
  schemaFilter: ["public"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
})
