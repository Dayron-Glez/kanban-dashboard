import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    // .claude/worktrees contiene copias del repo, cada una con su propio
    // node_modules. Sin excluirlas, vitest recoge sus tests ademas de los
    // nuestros y fallan todos: se cargan dos copias de React a la vez.
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
})
