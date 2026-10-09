import { defineConfig } from "drizzle-kit"

try {
  process.loadEnvFile(".env")
} catch {
  // Sin .env: se usa DATABASE_URL del entorno.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  schemaFilter: ["public", "identity"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
})
