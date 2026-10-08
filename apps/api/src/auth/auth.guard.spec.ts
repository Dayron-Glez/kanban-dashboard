import type { INestApplication } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { DB } from "../db/db.module.js"
import { HealthController } from "../health/health.controller.js"
import { MeController } from "../me/me.controller.js"
import { AuthGuard } from "./auth.guard.js"
import { SESSION_RESOLVER, type SessionResolver } from "./session.js"

// El guard solo decide con lo que le diga el resolvedor de sesión. La sesión
// real de better-auth la prueban los tests de integración (auth.int.spec.ts).
const ANA = { id: "2b7e1c4a-9f3d-4e8a-b5c6-1d2e3f4a5b6c", email: "ana@cauce.test" }
const resolveSession = vi.fn<SessionResolver>()

let app: INestApplication

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController, MeController],
    providers: [
      { provide: DB, useValue: { execute: vi.fn(() => Promise.resolve([])) } },
      { provide: SESSION_RESOLVER, useValue: resolveSession },
      { provide: APP_GUARD, useClass: AuthGuard },
    ],
  }).compile()
  app = moduleRef.createNestApplication()
  await app.init()
})

afterAll(async () => {
  await app?.close()
})

describe("AuthGuard", () => {
  it("con sesión deja pasar y expone el usuario", async () => {
    resolveSession.mockResolvedValueOnce(ANA)

    const response = await request(app.getHttpServer()).get("/me").set("Cookie", "sesion=1")

    expect(response.status).toBe(200)
    expect(response.body).toEqual(ANA)
    expect(resolveSession).toHaveBeenLastCalledWith(expect.objectContaining({ cookie: "sesion=1" }))
  })

  it("sin sesión responde 401", async () => {
    resolveSession.mockResolvedValueOnce(null)

    const response = await request(app.getHttpServer()).get("/me")

    expect(response.status).toBe(401)
    expect(response.body.message).toBe("No hay ninguna sesión iniciada")
  })

  it("no pide sesión en las rutas públicas", async () => {
    resolveSession.mockClear()

    const response = await request(app.getHttpServer()).get("/health")

    expect(response.status).toBe(200)
    expect(resolveSession).not.toHaveBeenCalled()
  })
})
