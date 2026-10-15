import type { CalendarElement, CalendarPlan, Project } from "@repo/contracts"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana es la propietaria, Marta miembro y Luis ajeno. Los tests van en orden y
// comparten el plan.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let marta: TestUser
let luis: TestUser
let project: Project

const as = (user: TestUser) => ctx.as(user)

const planOf = async () => (await as(ana).get(`/projects/${project.id}/plan`)).body as CalendarPlan
const byKey = (plan: CalendarPlan, key: string) =>
  plan.elements.find((element) => element.templateKey === key) as CalendarElement
const byName = (plan: CalendarPlan, name: string) =>
  plan.elements.find((element) => element.name === name)

const editOf = (id: string, body: object, user = ana) =>
  as(user).patch(`/elements/${id}/edits`, body)

let taskId: string

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  marta = await ctx.createUser("marta")
  luis = await ctx.createUser("luis")

  project = (await as(ana).post("/projects", { name: "Serie", color: "#ef4444" })).body as Project
  const { body: invitation } = await as(ana).post(`/projects/${project.id}/invitations`, {
    email: marta.email,
  })
  await as(marta).post(`/invitations/token/${(invitation as { token: string }).token}/accept`)

  const rodaje = byKey(await planOf(), "rodaje")
  const created = await as(ana).post(`/elements/${rodaje.id}/actions`, {
    kind: "task",
    name: "Ensayo con actores",
    startsOn: "2027-03-01",
    endsOn: "2027-03-03",
  })

  taskId = byName(created.body as CalendarPlan, "Ensayo con actores")!.id
})

afterAll(async () => {
  await ctx?.close()
})

describe("guardar de una vez lo del panel", () => {
  it("nombre, padre y duración de una acción, en una sola petición", async () => {
    const wrap = byKey(await planOf(), "rodaje.wrap")
    const response = await editOf(taskId, {
      name: "Ensayo general",
      parentId: wrap.id,
      duration: { amount: 4, unit: "days" },
    })

    expect(response.status).toBe(200)
    const task = byName(response.body as CalendarPlan, "Ensayo general")
    expect(task).toMatchObject({
      parentId: wrap.id,
      startsOn: "2027-03-01",
      endsOn: "2027-03-04",
      duration: { amount: 4, unit: "days" },
    })
  })

  it("una tarea de varios días no pasa a reunión sin dejarla en un día", async () => {
    expect((await editOf(taskId, { kind: "meeting" })).status).toBe(400)
    const response = await editOf(taskId, {
      kind: "meeting",
      duration: { amount: 1, unit: "days" },
    })
    expect(response.status).toBe(200)
    expect(byName(response.body as CalendarPlan, "Ensayo general")).toMatchObject({
      kind: "meeting",
      endsOn: "2027-03-01",
    })
  })

  it("es todo o nada: si una parte falla, no se guarda ninguna", async () => {
    const plan = await planOf()
    const rodaje = byKey(plan, "rodaje")
    const shooting = byKey(plan, "rodaje.shooting")
    // Rodaje depende del fin de Shooting, que ya depende del inicio de Rodaje: ciclo.
    const response = await editOf(rodaje.id, {
      name: "Rodaje principal",
      rules: {
        end: {
          predecessorId: shooting.id,
          predecessorPoint: "end",
          lag: { amount: 0, unit: "days" },
        },
      },
    })

    expect(response.status).toBe(409)
    expect(byKey(await planOf(), "rodaje").name).toBe("Rodaje")
  })

  it("las fases y los procesos no cambian de tipo ni de padre", async () => {
    const rodaje = byKey(await planOf(), "rodaje")
    expect((await editOf(rodaje.id, { kind: "task" })).status).toBe(400)
    expect((await editOf(rodaje.id, { name: "  " })).status).toBe(400)
  })

  it("una acción no pasa a colgar de otra acción", async () => {
    const plan = await planOf()
    const rodaje = byKey(plan, "rodaje")
    const other = await as(ana).post(`/elements/${rodaje.id}/actions`, {
      kind: "reminder",
      name: "Aviso",
      startsOn: "2027-03-02",
    })
    const reminder = byName(other.body as CalendarPlan, "Aviso")!
    expect((await editOf(taskId, { parentId: reminder.id })).status).toBe(400)
  })

  it("solo la propietaria guarda; para quien no es del proyecto, no existe", async () => {
    expect((await editOf(taskId, { name: "Sin permiso" }, marta)).status).toBe(403)
    expect((await editOf(taskId, { name: "Sin permiso" }, luis)).status).toBe(404)
  })
})

describe("borrar acciones", () => {
  it("se borra una acción, pero no una fase", async () => {
    expect((await as(marta).delete(`/elements/${taskId}`)).status).toBe(403)
    const response = await as(ana).delete(`/elements/${taskId}`)
    expect(response.status).toBe(200)
    expect(byName(response.body as CalendarPlan, "Ensayo general")).toBeUndefined()

    const rodaje = byKey(await planOf(), "rodaje")
    expect((await as(ana).delete(`/elements/${rodaje.id}`)).status).toBe(400)
  })
})
