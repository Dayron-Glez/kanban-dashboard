import type { CrewMember, Department, Project } from "@repo/contracts"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana es la propietaria, Marta miembro y Luis ajeno. Los tests van en orden.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let marta: TestUser
let luis: TestUser
let project: Project
let departments: Department[]
let actor: CrewMember

const as = (user: TestUser) => ctx.as(user)
const departmentNamed = (name: string) =>
  departments.find((department) => department.name === name)!

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  marta = await ctx.createUser("marta")
  luis = await ctx.createUser("luis")

  project = (await as(ana).post("/projects", { name: "Película", color: "#ef4444" }))
    .body as Project
  const { body: invitation } = await as(ana).post(`/projects/${project.id}/invitations`, {
    email: marta.email,
  })
  await as(marta).post(`/invitations/token/${(invitation as { token: string }).token}/accept`)
  departments = (await as(ana).get(`/projects/${project.id}/departments`)).body as Department[]
})

afterAll(async () => {
  await ctx?.close()
})

describe("equipo", () => {
  it("la propietaria da de alta a una persona con su departamento", async () => {
    const response = await as(ana).post(`/projects/${project.id}/crew`, {
      fullName: "  Lola Flores  ",
      email: "lola@example.com",
      departmentId: departmentNamed("Reparto").id,
    })

    expect(response.status).toBe(201)
    actor = response.body as CrewMember
    expect(actor).toMatchObject({
      projectId: project.id,
      fullName: "Lola Flores",
      email: "lola@example.com",
      departmentId: departmentNamed("Reparto").id,
    })
  })

  it("solo el nombre es obligatorio", async () => {
    const response = await as(ana).post(`/projects/${project.id}/crew`, { fullName: "Antonio" })
    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ email: null, departmentId: null })
  })

  it("los miembros ven el equipo, ordenado por nombre", async () => {
    const response = await as(marta).get(`/projects/${project.id}/crew`)
    expect(response.status).toBe(200)
    expect((response.body as CrewMember[]).map((member) => member.fullName)).toEqual([
      "Antonio",
      "Lola Flores",
    ])
  })

  it("rechaza un nombre vacío, un email que no lo es y un departamento de otro proyecto", async () => {
    const other = (await as(ana).post("/projects", { name: "Otra", color: "#ef4444" }))
      .body as Project
    const [foreign] = (await as(ana).get(`/projects/${other.id}/departments`)).body as Department[]

    const crew = `/projects/${project.id}/crew`
    expect((await as(ana).post(crew, { fullName: "  " })).status).toBe(400)
    expect((await as(ana).post(crew, { fullName: "Lola", email: "lola" })).status).toBe(400)
    expect((await as(ana).post(crew, { fullName: "Lola", departmentId: foreign!.id })).status).toBe(
      400
    )
    expect((await as(ana).patch(`/crew/${actor.id}`, { departmentId: foreign!.id })).status).toBe(
      400
    )
    expect((await as(ana).patch(`/crew/${actor.id}`, {})).status).toBe(400)
  })

  it("se edita y se le quita el email", async () => {
    const response = await as(ana).patch(`/crew/${actor.id}`, {
      fullName: "Lola Flores Ruiz",
      email: null,
    })
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      fullName: "Lola Flores Ruiz",
      email: null,
      departmentId: departmentNamed("Reparto").id,
    })
  })

  it("solo la propietaria escribe, y quien no es miembro no ve nada", async () => {
    expect((await as(marta).post(`/projects/${project.id}/crew`, { fullName: "X" })).status).toBe(
      403
    )
    expect((await as(marta).patch(`/crew/${actor.id}`, { fullName: "X" })).status).toBe(403)
    expect((await as(marta).delete(`/crew/${actor.id}`)).status).toBe(403)
    expect((await as(luis).get(`/projects/${project.id}/crew`)).status).toBe(404)
    expect((await as(luis).patch(`/crew/${actor.id}`, { fullName: "X" })).status).toBe(404)
  })

  it("si se borra su departamento, la persona se queda sin él", async () => {
    await ctx.sql`delete from core.departments where id = ${departmentNamed("Reparto").id}`
    const crew = (await as(ana).get(`/projects/${project.id}/crew`)).body as CrewMember[]
    expect(crew.find((member) => member.id === actor.id)!.departmentId).toBeNull()
  })

  it("se da de baja", async () => {
    expect((await as(ana).delete(`/crew/${actor.id}`)).status).toBe(204)
    expect((await as(ana).delete(`/crew/${actor.id}`)).status).toBe(404)
  })
})
