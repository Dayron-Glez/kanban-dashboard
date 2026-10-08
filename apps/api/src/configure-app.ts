import { RequestMethod } from "@nestjs/common"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { toNodeHandler } from "better-auth/node"
import { BETTER_AUTH, type Auth } from "./auth/better-auth.js"
import { resolveClientIp } from "./auth/client-ip.js"
import { ENV, type Env } from "./config/env.js"
import { requireProxySecret } from "./proxy-secret.js"

export const API_PREFIX = "/api"

export const configureApp = (app: NestExpressApplication): void => {
  const auth = app.get<Auth>(BETTER_AUTH)
  const { PROXY_SECRET } = app.get<Env>(ENV)
  if (PROXY_SECRET) app.use(requireProxySecret(PROXY_SECRET))
  app.use(resolveClientIp)
  app.getHttpAdapter().getInstance().all(`${API_PREFIX}/auth/*splat`, toNodeHandler(auth))
  app.useBodyParser("json")

  app.setGlobalPrefix(API_PREFIX, { exclude: [{ path: "health", method: RequestMethod.GET }] })
}
