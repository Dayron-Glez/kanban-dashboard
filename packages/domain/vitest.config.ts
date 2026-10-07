import { defaultServerConditions } from "vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
  // Código fuente de los paquetes del monorepo, sin pasar por su dist. Los
  // tests corren en Node, que resuelve con las condiciones de servidor.
  ssr: { resolve: { conditions: ["source", ...defaultServerConditions] } },
  test: {
    // "node" y no "jsdom": si algún día un fichero de este paquete necesitara
    // el DOM, sería la señal de que no pertenece aquí.
    environment: "node",
  },
})
