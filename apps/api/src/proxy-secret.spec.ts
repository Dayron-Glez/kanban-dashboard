import type { Request, Response } from "express"
import { describe, expect, it, vi } from "vitest"
import { PROXY_SECRET_HEADER, requireProxySecret } from "./proxy-secret.js"

const SECRET = "un-secreto-del-proxy-con-mas-de-32-caracteres"

const run = (path: string, headers: Request["headers"] = {}) => {
  const request = { path, headers } as Request
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn() }
  const next = vi.fn()
  requireProxySecret(SECRET)(request, response as unknown as Response, next)
  return { passed: next.mock.calls.length === 1, response, request }
}

describe("requireProxySecret", () => {
  it("deja pasar lo que trae el secreto, y no lo propaga", () => {
    const { passed, request } = run("/api/me", { [PROXY_SECRET_HEADER]: SECRET })

    expect(passed).toBe(true)
    expect(request.headers[PROXY_SECRET_HEADER]).toBeUndefined()
  })

  it("rechaza con 403 lo que no lo trae", () => {
    const { passed, response } = run("/api/me")

    expect(passed).toBe(false)
    expect(response.status).toHaveBeenCalledWith(403)
  })

  it("rechaza un secreto equivocado, sea o no de la misma longitud", () => {
    expect(run("/api/me", { [PROXY_SECRET_HEADER]: "otro" }).passed).toBe(false)
    expect(run("/api/me", { [PROXY_SECRET_HEADER]: SECRET.replace("u", "x") }).passed).toBe(false)
  })

  it("deja abierta /health para la comprobación de Railway", () => {
    expect(run("/health").passed).toBe(true)
  })
})
