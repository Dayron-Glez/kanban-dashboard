import { defaultServerConditions } from "vite"
import { defineConfig } from "vitest/config"

// Tests de integración: necesitan la base de Supabase local (pnpm db:start, o
// supabase db start en CI). Nunca la de producción: test-app.ts lo comprueba.
export default defineConfig({
  ssr: { resolve: { conditions: ["source", ...defaultServerConditions] } },
  test: {
    environment: "node",
    include: ["src/**/*.int.spec.ts"],
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      SUPABASE_URL: "http://127.0.0.1:54321",
    },
    // Comparten la base: en serie, para que no se pisen.
    fileParallelism: false,
  },
})
