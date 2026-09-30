import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // "node" y no "jsdom": si algún día un fichero de este paquete necesitara
    // el DOM, sería la señal de que no pertenece aquí.
    environment: "node",
  },
})
