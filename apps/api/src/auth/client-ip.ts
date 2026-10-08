import type { NextFunction, Request, Response } from "express"

export const CLIENT_IP_HEADER = "x-cauce-client-ip"

// Detrás de Vercel y Railway, x-forwarded-for trae varias IP y better-auth
// solo acepta una. La primera es la del usuario: Vercel sobrescribe la cabecera.
export const resolveClientIp = (request: Request, _response: Response, next: NextFunction) => {
  delete request.headers[CLIENT_IP_HEADER]
  const forwarded = request.headers["x-forwarded-for"]
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  const clientIp = value?.split(",")[0]?.trim()
  if (clientIp) request.headers[CLIENT_IP_HEADER] = clientIp
  next()
}
