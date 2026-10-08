import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp } from "./testing/test-app.js"
import { PROXY_SECRET_HEADER } from "./proxy-secret.js"

// Como en producción: la API solo atiende lo que llega a través de Vercel.
const SECRET = "un-secreto-del-proxy-con-mas-de-32-caracteres"

let ctx: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  process.env.PROXY_SECRET = SECRET
  ctx = await createTestApp({ fakeSessions: false })
})

afterAll(async () => {
  delete process.env.PROXY_SECRET
  await ctx?.close()
})

const get = (path: string, secret?: string) => {
  const req = request(ctx.app.getHttpServer()).get(path)
  return secret ? req.set(PROXY_SECRET_HEADER, secret) : req
}

describe("secreto del proxy", () => {
  it("sin el secreto, ni la API ni el login responden", async () => {
    expect((await get("/api/me")).status).toBe(403)
    expect((await get("/api/auth/get-session")).status).toBe(403)
  })

  it("con el secreto equivocado, tampoco", async () => {
    expect((await get("/api/me", "secreto-equivocado")).status).toBe(403)
  })

  it("con el secreto, la petición sigue su curso", async () => {
    expect((await get("/api/me", SECRET)).status).toBe(401)
    expect((await get("/api/auth/get-session", SECRET)).status).toBe(200)
  })

  it("/health responde sin el secreto", async () => {
    expect((await get("/health")).status).toBe(200)
  })
})
