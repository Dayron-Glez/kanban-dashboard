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
    // Valores de mentira para el cliente de Supabase, que se construye al
    // cargar el modulo y lanza "supabaseUrl is required" si faltan. Cualquier
    // test que renderice un componente acaba importandolo a traves del barrel
    // de shared, y CI no tiene .env: sin esto solo pasaban en local.
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_ANON_KEY: "clave-de-pruebas-no-real",
    },
  },
})
