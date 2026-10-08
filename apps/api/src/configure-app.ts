import { RequestMethod, type INestApplication } from "@nestjs/common"
import type { NextFunction, Request, Response } from "express"
import type { Env } from "./config/env.js"

// La web llama a la API a través de su propio dominio (Vercel reenvía /api/* a
// Railway), así la cookie de sesión de better-auth será de primera parte.
// /health se queda fuera: es la ruta que comprueba Railway.
export const API_PREFIX = "/api"

// TEMPORAL, hasta el 4.2b: la web desplegada antes de este cambio llama sin
// /api. Sin esto fallaría desde que Railway despliega hasta que Vercel lo hace.
const acceptUnprefixedPaths = (request: Request, _response: Response, next: NextFunction) => {
  const isPrefixed = request.url === API_PREFIX || request.url.startsWith(`${API_PREFIX}/`)
  if (!isPrefixed && !request.url.startsWith("/health")) request.url = `${API_PREFIX}${request.url}`
  next()
}

export const configureApp = (app: INestApplication, env: Env): void => {
  app.use(acceptUnprefixedPaths)
  app.setGlobalPrefix(API_PREFIX, { exclude: [{ path: "health", method: RequestMethod.GET }] })
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true })
}
