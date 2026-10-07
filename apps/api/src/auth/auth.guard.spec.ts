import type { INestApplication } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { Test } from "@nestjs/testing"
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from "jose"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { DB } from "../db/db.module.js"
import { HealthController } from "../health/health.controller.js"
import { MeController } from "../me/me.controller.js"
import { AuthGuard } from "./auth.guard.js"
import { createSupabaseVerifier, TOKEN_VERIFIER } from "./token-verifier.js"

const SUPABASE_URL = "https://proyecto.supabase.co"
const USER_ID = "2b7e1c4a-9f3d-4e8a-b5c6-1d2e3f4a5b6c"

let app: INestApplication
let projectKey: CryptoKey
let foreignKey: CryptoKey

// Un token como los que emite Supabase Auth, con lo que cada test quiera cambiar.
const token = (
  overrides: {
    key?: CryptoKey
    issuer?: string
    audience?: string
    expiresIn?: string
    sub?: string
  } = {}
) => {
  const jwt = new SignJWT({ email: "ana@cauce.test", role: "authenticated" })
    .setProtectedHeader({ alg: "ES256", kid: "clave-proyecto" })
    .setIssuer(overrides.issuer ?? `${SUPABASE_URL}/auth/v1`)
    .setAudience(overrides.audience ?? "authenticated")
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? "1h")
  if (overrides.sub !== "") jwt.setSubject(overrides.sub ?? USER_ID)
  return jwt.sign(overrides.key ?? projectKey)
}

beforeAll(async () => {
  const project = await generateKeyPair("ES256")
  projectKey = project.privateKey
  foreignKey = (await generateKeyPair("ES256")).privateKey
  const publicJwk = { ...(await exportJWK(project.publicKey)), kid: "clave-proyecto", alg: "ES256" }

  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController, MeController],
    providers: [
      { provide: DB, useValue: { execute: vi.fn(() => Promise.resolve([])) } },
      {
        provide: TOKEN_VERIFIER,
        useValue: createSupabaseVerifier(createLocalJWKSet({ keys: [publicJwk] }), SUPABASE_URL),
      },
      { provide: APP_GUARD, useClass: AuthGuard },
    ],
  }).compile()
  app = moduleRef.createNestApplication()
  await app.init()
})

afterAll(async () => {
  await app?.close()
})

const me = (authorization?: string) => {
  const req = request(app.getHttpServer()).get("/me")
  return authorization ? req.set("Authorization", authorization) : req
}

describe("AuthGuard", () => {
  it("deja pasar un token válido y expone el usuario", async () => {
    const response = await me(`Bearer ${await token()}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: USER_ID, email: "ana@cauce.test" })
  })

  it("rechaza una petición sin token", async () => {
    const response = await me()

    expect(response.status).toBe(401)
    expect(response.body.message).toBe("Falta el token de sesión")
  })

  it("rechaza un token caducado diciéndolo", async () => {
    const response = await me(`Bearer ${await token({ expiresIn: "-1m" })}`)

    expect(response.status).toBe(401)
    expect(response.body.message).toBe("La sesión ha caducado")
  })

  it("rechaza un token firmado con otra clave", async () => {
    const response = await me(`Bearer ${await token({ key: foreignKey })}`)

    expect(response.status).toBe(401)
  })

  it("rechaza un token de otro proyecto de Supabase", async () => {
    const response = await me(
      `Bearer ${await token({ issuer: "https://otro.supabase.co/auth/v1" })}`
    )

    expect(response.status).toBe(401)
  })

  it("rechaza un token que no es de usuario (audiencia distinta)", async () => {
    const response = await me(`Bearer ${await token({ audience: "anon" })}`)

    expect(response.status).toBe(401)
  })

  it("rechaza un token sin usuario", async () => {
    const response = await me(`Bearer ${await token({ sub: "" })}`)

    expect(response.status).toBe(401)
  })

  it("rechaza algo que no es un token", async () => {
    const response = await me("Bearer esto-no-es-un-jwt")

    expect(response.status).toBe(401)
  })

  it("no exige sesión en las rutas públicas", async () => {
    const response = await request(app.getHttpServer()).get("/health")

    expect(response.status).toBe(200)
  })
})
