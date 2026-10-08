import { describe, expect, it } from "vitest"
import { parseEnv } from "./env.js"

const DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
const BETTER_AUTH_URL = "https://cauce.app"
const BETTER_AUTH_SECRET = "un-secreto-de-pruebas-con-mas-de-32-caracteres"
const required = { DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET }

describe("parseEnv", () => {
  it("aplica los valores por defecto", () => {
    expect(parseEnv(required)).toEqual({
      NODE_ENV: "development",
      PORT: 3000,
      DATABASE_URL,
      BETTER_AUTH_URL,
      BETTER_AUTH_SECRET,
      CORS_ORIGINS: ["http://localhost:5173"],
    })
  })

  it("convierte el puerto y separa los orígenes por comas", () => {
    const env = parseEnv({
      ...required,
      PORT: "8080",
      CORS_ORIGINS: "https://cauce.app, https://preview.cauce.app",
    })
    expect(env.PORT).toBe(8080)
    expect(env.CORS_ORIGINS).toEqual(["https://cauce.app", "https://preview.cauce.app"])
  })

  it("se niega a arrancar sin DATABASE_URL, diciendo qué falta", () => {
    expect(() => parseEnv({ BETTER_AUTH_URL, BETTER_AUTH_SECRET })).toThrow(/DATABASE_URL/)
  })

  it("rechaza una URL que no es de Postgres", () => {
    expect(() => parseEnv({ ...required, DATABASE_URL: "https://example.com" })).toThrow(
      /DATABASE_URL/
    )
  })

  it("quita la barra final de BETTER_AUTH_URL, con la que se construyen las redirecciones", () => {
    expect(parseEnv({ ...required, BETTER_AUTH_URL: `${BETTER_AUTH_URL}/` }).BETTER_AUTH_URL).toBe(
      BETTER_AUTH_URL
    )
  })

  it("se niega a arrancar con un secreto corto", () => {
    expect(() => parseEnv({ ...required, BETTER_AUTH_SECRET: "corto" })).toThrow(
      /BETTER_AUTH_SECRET/
    )
  })

  it("Google es opcional", () => {
    const env = parseEnv({ ...required, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secreto" })
    expect(env.GOOGLE_CLIENT_ID).toBe("id")
    expect(parseEnv(required).GOOGLE_CLIENT_ID).toBeUndefined()
  })
})
