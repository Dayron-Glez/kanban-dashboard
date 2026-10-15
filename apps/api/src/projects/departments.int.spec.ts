import type { Department, Project } from "@repo/contracts"
import { DEFAULT_DEPARTMENTS } from "@repo/domain"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let luis: TestUser
let project: Project

const as = (user: TestUser) => ctx.as(user)

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  luis = await ctx.createUser("luis")
  project = (await as(ana).post("/projects", { name: "Serie", color: "#ef4444" })).body as Project
})

afterAll(async () => {
  await ctx?.close()
})

describe("departamentos", () => {
  it("se siembran al crear el proyecto, en su orden y con Reparto tras Casting", async () => {
    const response = await as(ana).get(`/projects/${project.id}/departments`)

    expect(response.status).toBe(200)
    const departments = response.body as Department[]
    expect(departments.map((department) => department.name)).toEqual(DEFAULT_DEPARTMENTS)
    expect(departments.map((department) => department.name).slice(3, 5)).toEqual([
      "Casting",
      "Reparto",
    ])
    expect(departments.every((department) => department.projectId === project.id)).toBe(true)
    expect(departments.map((department) => department.position)).toEqual(
      DEFAULT_DEPARTMENTS.map((_, position) => position)
    )
  })

  it("quien no es miembro no los ve", async () => {
    const response = await as(luis).get(`/projects/${project.id}/departments`)
    expect(response.status).toBe(404)
  })
})
