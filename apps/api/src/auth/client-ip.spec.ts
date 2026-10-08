import type { Request, Response } from "express"
import { describe, expect, it, vi } from "vitest"
import { CLIENT_IP_HEADER, resolveClientIp } from "./client-ip.js"

const run = (headers: Request["headers"]) => {
  const request = { headers } as Request
  const next = vi.fn()
  resolveClientIp(request, {} as Response, next)
  expect(next).toHaveBeenCalledOnce()
  return request.headers[CLIENT_IP_HEADER]
}

describe("resolveClientIp", () => {
  it("toma la primera IP de la cadena de proxys", () => {
    expect(run({ "x-forwarded-for": "203.0.113.7, 76.76.21.9, 10.0.0.1" })).toBe("203.0.113.7")
  })

  it("acepta una sola IP", () => {
    expect(run({ "x-forwarded-for": "2001:db8::1" })).toBe("2001:db8::1")
  })

  it("sin x-forwarded-for no la inventa", () => {
    expect(run({})).toBeUndefined()
  })

  it("no se fía de la cabecera si la manda el cliente", () => {
    expect(run({ [CLIENT_IP_HEADER]: "198.51.100.1" })).toBeUndefined()
    expect(run({ [CLIENT_IP_HEADER]: "198.51.100.1", "x-forwarded-for": "203.0.113.7" })).toBe(
      "203.0.113.7"
    )
  })
})
