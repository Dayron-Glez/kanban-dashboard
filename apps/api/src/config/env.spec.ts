import { describe, expect, it } from "vitest"
import { parseEnv } from "./env.js"

const DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
const SUPABASE_URL = "https://proyecto.supabase.co"
const required = { DATABASE_URL, SUPABASE_URL }

describe("parseEnv", () => {
  it("aplica los valores por defecto", () => {
    expect(parseEnv(required)).toEqual({
      NODE_ENV: "development",
      PORT: 3000,
      DATABASE_URL,
      SUPABASE_URL,
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
    expect(() => parseEnv({ SUPABASE_URL })).toThrow(/DATABASE_URL/)
  })

  it("rechaza una URL que no es de Postgres", () => {
    expect(() => parseEnv({ ...required, DATABASE_URL: "https://example.com" })).toThrow(
      /DATABASE_URL/
    )
  })

  it("quita la barra final de SUPABASE_URL, con la que se construyen el emisor y el JWKS", () => {
    expect(parseEnv({ ...required, SUPABASE_URL: `${SUPABASE_URL}/` }).SUPABASE_URL).toBe(
      SUPABASE_URL
    )
  })

  it("se niega a arrancar sin SUPABASE_URL", () => {
    expect(() => parseEnv({ DATABASE_URL })).toThrow(/SUPABASE_URL/)
  })
})
