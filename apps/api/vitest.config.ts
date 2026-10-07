import { defaultServerConditions } from "vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
  ssr: { resolve: { conditions: ["source", ...defaultServerConditions] } },
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    // Los de integración van aparte (pnpm test:int): necesitan una base.
    exclude: ["src/**/*.int.spec.ts"],
  },
})
