import { RequestMethod } from "@nestjs/common"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { toNodeHandler } from "better-auth/node"
import { BETTER_AUTH, type Auth } from "./auth/better-auth.js"
import type { Env } from "./config/env.js"

export const API_PREFIX = "/api"

export const configureApp = (app: NestExpressApplication, env: Env): void => {
  const auth = app.get<Auth>(BETTER_AUTH)
  app.getHttpAdapter().getInstance().all(`${API_PREFIX}/auth/*splat`, toNodeHandler(auth))
  app.useBodyParser("json")

  app.setGlobalPrefix(API_PREFIX, { exclude: [{ path: "health", method: RequestMethod.GET }] })
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true })
}
