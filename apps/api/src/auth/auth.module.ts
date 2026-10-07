import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { createRemoteJWKSet } from "jose"
import { ENV, type Env } from "../config/env.js"
import { AuthGuard } from "./auth.guard.js"
import { createSupabaseVerifier, TOKEN_VERIFIER } from "./token-verifier.js"

@Module({
  providers: [
    {
      provide: TOKEN_VERIFIER,
      inject: [ENV],
      // Las claves públicas se descargan una vez y se cachean; jose las vuelve a
      // pedir si llega un token firmado con una clave nueva (rotación).
      useFactory: (env: Env) =>
        createSupabaseVerifier(
          createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)),
          env.SUPABASE_URL
        ),
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
