import { defaultServerConditions } from "vite"
import { defineConfig } from "vitest/config"

// Tests de integración: necesitan la base de Supabase local (pnpm db:start, o
// supabase db start en CI). Nunca la de producción: test-app.ts lo comprueba.
export default defineConfig({
  // Sin "module": esa condición elige builds pensados para empaquetadores (el
  // de @opentelemetry, que trae better-auth) que Node no sabe cargar. En
  // producción Node tampoco la usa.
  ssr: {
    resolve: {
      conditions: ["source", ...defaultServerConditions.filter((name) => name !== "module")],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.spec.ts"],
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      BETTER_AUTH_URL: "http://localhost:5173",
      BETTER_AUTH_SECRET: "un-secreto-de-pruebas-con-mas-de-32-caracteres",
    },
    // Comparten la base: en serie, para que no se pisen.
    fileParallelism: false,
  },
})
