import { describe, expect, it } from "vitest"
import { parseEnv } from "./env.js"

const DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

describe("parseEnv", () => {
  it("aplica los valores por defecto", () => {
    expect(parseEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: "development",
      PORT: 3000,
      DATABASE_URL,
      CORS_ORIGINS: ["http://localhost:5173"],
    })
  })

  it("convierte el puerto y separa los orígenes por comas", () => {
    const env = parseEnv({
      DATABASE_URL,
      PORT: "8080",
      CORS_ORIGINS: "https://cauce.app, https://preview.cauce.app",
    })
    expect(env.PORT).toBe(8080)
    expect(env.CORS_ORIGINS).toEqual(["https://cauce.app", "https://preview.cauce.app"])
  })

  it("se niega a arrancar sin DATABASE_URL, diciendo qué falta", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/)
  })

  it("rechaza una URL que no es de Postgres", () => {
    expect(() => parseEnv({ DATABASE_URL: "https://example.com" })).toThrow(/DATABASE_URL/)
  })
})
