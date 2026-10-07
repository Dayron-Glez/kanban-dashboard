import type { INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DB } from "../db/db.module.js"
import { HealthController } from "./health.controller.js"

let app: INestApplication

const start = async (execute: () => Promise<unknown>) => {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: DB, useValue: { execute: vi.fn(execute) } }],
  }).compile()
  app = moduleRef.createNestApplication()
  await app.init()
}

afterEach(async () => {
  await app?.close()
})

describe("GET /health", () => {
  it("responde 200 si la base contesta", async () => {
    await start(() => Promise.resolve([]))

    const response = await request(app.getHttpServer()).get("/health")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: "ok", database: "ok" })
  })

  it("responde 503 si la base no contesta, para que Railway no ponga en servicio la versión", async () => {
    await start(() => Promise.reject(new Error("connect ECONNREFUSED")))

    const response = await request(app.getHttpServer()).get("/health")

    expect(response.status).toBe(503)
    expect(response.body).toMatchObject({ status: "error", database: "unreachable" })
  })
})
