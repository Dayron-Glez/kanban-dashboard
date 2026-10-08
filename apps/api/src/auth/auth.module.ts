import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { fromNodeHeaders } from "better-auth/node"
import { ENV } from "../config/env.js"
import { DB } from "../db/db.module.js"
import { AuthGuard } from "./auth.guard.js"
import { BETTER_AUTH, createAuth, type Auth } from "./better-auth.js"
import { SESSION_RESOLVER, type SessionResolver } from "./session.js"

@Module({
  providers: [
    { provide: BETTER_AUTH, inject: [DB, ENV], useFactory: createAuth },
    {
      provide: SESSION_RESOLVER,
      inject: [BETTER_AUTH],
      useFactory:
        (auth: Auth): SessionResolver =>
        async (headers) => {
          const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) })
          return session ? { id: session.user.id, email: session.user.email } : null
        },
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  // configure-app.ts monta sus rutas (/api/auth/*) en Express.
  exports: [BETTER_AUTH],
})
export class AuthModule {}
