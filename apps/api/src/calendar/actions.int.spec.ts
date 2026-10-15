import type { CalendarElement, CalendarPlan, Project } from "@repo/contracts"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana es la propietaria, Marta miembro y Luis ajeno.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let marta: TestUser
let luis: TestUser
let project: Project

const as = (user: TestUser) => ctx.as(user)

const planOf = async () => (await as(ana).get(`/projects/${project.id}/plan`)).body as CalendarPlan

const idOf = async (key: string) =>
  (await planOf()).elements.find((element) => element.templateKey === key)!.id

const create = async (parentKey: string, body: object, user = ana) =>
  as(user).post(`/elements/${await idOf(parentKey)}/actions`, body)

const actionNamed = (plan: CalendarPlan, name: string) =>
  plan.elements.find((element) => element.name === name) as CalendarElement

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  marta = await ctx.createUser("marta")
  luis = await ctx.createUser("luis")

  project = (await as(ana).post("/projects", { name: "Documental", color: "#ef4444" }))
    .body as Project
  const { body: invitation } = await as(ana).post(`/projects/${project.id}/invitations`, {
    email: marta.email,
  })
  await as(marta).post(`/invitations/token/${(invitation as { token: string }).token}/accept`)
})

afterAll(async () => {
  await ctx?.close()
})

describe("crear acciones", () => {
  it("una reunión queda fijada en su día, al final de lo que cuelga del proceso", async () => {
    const parentId = await idOf("rodaje.wrap")
    const response = await create("rodaje.wrap", {
      kind: "meeting",
      name: "Reunión de cierre",
      startsOn: "2027-06-14",
    })

    expect(response.status).toBe(201)
    const meeting = actionNamed(response.body as CalendarPlan, "Reunión de cierre")
    expect(meeting).toMatchObject({
      kind: "meeting",
      parentId,
      startsOn: "2027-06-14",
      endsOn: "2027-06-14",
      duration: { amount: 1, unit: "days" },
      isPinned: true,
    })
    const siblings = (response.body as CalendarPlan).elements.filter(
      (element) => element.parentId === parentId
    )
    expect(meeting.position).toBe(Math.max(...siblings.map((element) => element.position)))
  })

  it("una tarea puede ser un periodo, y una contratación no saber aún su baja", async () => {
    const task = await create("rodaje", {
      kind: "task",
      name: "Montar la oficina",
      startsOn: "2027-03-01",
      endsOn: "2027-03-03",
    })
    expect(actionNamed(task.body as CalendarPlan, "Montar la oficina")).toMatchObject({
      endsOn: "2027-03-03",
      duration: { amount: 3, unit: "days" },
    })

    const hiring = await create("rodaje", {
      kind: "hiring",
      name: "Jefa de producción",
      startsOn: "2027-02-01",
    })
    expect(actionNamed(hiring.body as CalendarPlan, "Jefa de producción")).toMatchObject({
      startsOn: "2027-02-01",
      endsOn: null,
      duration: null,
    })
  })

  it("reuniones y recordatorios son de un día, y el fin no va antes del inicio", async () => {
    const range = { startsOn: "2027-06-14", endsOn: "2027-06-15" }
    expect((await create("rodaje", { kind: "reminder", name: "Aviso", ...range })).status).toBe(400)
    expect(
      (
        await create("rodaje", {
          kind: "event",
          name: "Al revés",
          startsOn: "2027-06-15",
          endsOn: "2027-06-14",
        })
      ).status
    ).toBe(400)
    expect(
      (await create("rodaje", { kind: "phase", name: "Fase", startsOn: "2027-06-14" })).status
    ).toBe(400)
    expect(
      (await create("rodaje", { kind: "task", name: "  ", startsOn: "2027-06-14" })).status
    ).toBe(400)
  })

  it("una reunión no se alarga después: ni con su duración ni con una regla en el fin", async () => {
    const meeting = actionNamed(await planOf(), "Reunión de cierre")
    const longer = await as(ana).patch(`/elements/${meeting.id}/plan`, {
      duration: { amount: 2, unit: "days" },
    })
    expect(longer.status).toBe(400)
    const oneDay = await as(ana).patch(`/elements/${meeting.id}/plan`, {
      duration: { amount: 1, unit: "days" },
    })
    expect(oneDay.status).toBe(200)
    const rule = await as(ana).put(`/elements/${meeting.id}/rules/end`, {
      predecessorId: await idOf("rodaje"),
      predecessorPoint: "end",
      lag: { amount: 0, unit: "days" },
    })
    expect(rule.status).toBe(400)
  })

  it("una acción cuelga de una fase, subfase o proceso, no de otra acción", async () => {
    const meeting = actionNamed(await planOf(), "Reunión de cierre")
    const response = await as(ana).post(`/elements/${meeting.id}/actions`, {
      kind: "reminder",
      name: "Dentro de una reunión",
      startsOn: "2027-06-14",
    })
    expect(response.status).toBe(400)
  })

  it("solo la propietaria crea acciones; para quien no es del proyecto, no existe", async () => {
    const body = { kind: "task", name: "Sin permiso", startsOn: "2027-06-14" }
    expect((await create("rodaje", body, marta)).status).toBe(403)
    expect((await create("rodaje", body, luis)).status).toBe(404)
    expect((await planOf()).elements.some((element) => element.name === "Sin permiso")).toBe(false)
  })
})
