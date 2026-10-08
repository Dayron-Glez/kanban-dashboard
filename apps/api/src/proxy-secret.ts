import { timingSafeEqual } from "node:crypto"
import type { NextFunction, Request, Response } from "express"

export const PROXY_SECRET_HEADER = "x-cauce-proxy-secret"

// /health queda abierta: es la que comprueba Railway, desde dentro y sin pasar por Vercel.
export const requireProxySecret = (secret: string) => {
  const expected = Buffer.from(secret)
  return (request: Request, response: Response, next: NextFunction) => {
    if (request.path === "/health") return next()
    const header = request.headers[PROXY_SECRET_HEADER]
    const received = Buffer.from(typeof header === "string" ? header : "")
    if (received.length === expected.length && timingSafeEqual(received, expected)) {
      delete request.headers[PROXY_SECRET_HEADER]
      return next()
    }
    response.status(403).json({ message: "Acceso no permitido", statusCode: 403 })
  }
}
