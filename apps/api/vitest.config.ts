import { defaultServerConditions } from "vite"
import { defineConfig } from "vitest/config"

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
    include: ["src/**/*.spec.ts"],
    // Los de integración van aparte (pnpm test:int): necesitan una base.
    exclude: ["src/**/*.int.spec.ts"],
  },
})
