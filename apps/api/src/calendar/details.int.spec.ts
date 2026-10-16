import type { CalendarElement, CalendarPlan, Project } from "@repo/contracts"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana es la propietaria. Los tests van en orden y comparten el plan.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let project: Project
let rodajeId: string

const as = (user: TestUser) => ctx.as(user)
const byName = (plan: CalendarPlan, name: string) =>
  plan.elements.find((element) => element.name === name) as CalendarElement
const create = (body: object) => as(ana).post(`/elements/${rodajeId}/actions`, body)
const editOf = (id: string, body: object) => as(ana).patch(`/elements/${id}/edits`, body)

const call = { videoApp: "meet", videoUrl: "https://meet.google.com/abc-defg-hij" }

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  project = (await as(ana).post("/projects", { name: "Película", color: "#ef4444" }))
    .body as Project
  const plan = (await as(ana).get(`/projects/${project.id}/plan`)).body as CalendarPlan
  rodajeId = plan.elements.find((element) => element.templateKey === "rodaje")!.id
})

afterAll(async () => {
  await ctx?.close()
})

describe("los datos de las acciones", () => {
  it("una reunión con horas, prioridad, ubicación, notas y videollamada", async () => {
    const response = await create({
      kind: "meeting",
      name: "Reunión de producción",
      startsOn: "2027-04-14",
      priority: "high",
      hours: { allDay: false, startTime: "10:00", endTime: "11:00" },
      location: "Oficina de producción",
      notes: "Traer el desglose",
      ...call,
    })

    expect(response.status).toBe(201)
    expect(byName(response.body as CalendarPlan, "Reunión de producción")).toMatchObject({
      priority: "high",
      hours: { allDay: false, startTime: "10:00", endTime: "11:00", hoursMode: null },
      location: "Oficina de producción",
      notes: "Traer el desglose",
      completedAt: null,
      ...call,
    })
  })

  it("sin indicarlo, normal, de todo el día y sin nada más", async () => {
    const response = await create({ kind: "event", name: "Lectura", startsOn: "2027-04-15" })
    expect(byName(response.body as CalendarPlan, "Lectura")).toMatchObject({
      priority: "normal",
      hours: { allDay: true, startTime: null, endTime: null, hoursMode: null },
      location: null,
      notes: null,
      videoApp: null,
    })
  })

  it("una tarea se marca hecha y se desmarca; marcarla otra vez no cambia cuándo", async () => {
    const created = await create({
      kind: "task",
      name: "Revisar contratos",
      startsOn: "2027-04-16",
    })
    const { id } = byName(created.body as CalendarPlan, "Revisar contratos")

    const done = byName(
      (await editOf(id, { completed: true })).body as CalendarPlan,
      "Revisar contratos"
    )
    expect(done.completedAt).not.toBeNull()
    const again = byName(
      (await editOf(id, { completed: true })).body as CalendarPlan,
      "Revisar contratos"
    )
    expect(again.completedAt).toBe(done.completedAt)
    const undone = byName(
      (await editOf(id, { completed: false })).body as CalendarPlan,
      "Revisar contratos"
    )
    expect(undone.completedAt).toBeNull()
  })

  it("solo una tarea se marca hecha", async () => {
    const plan = (await as(ana).get(`/projects/${project.id}/plan`)).body as CalendarPlan
    expect((await editOf(byName(plan, "Lectura").id, { completed: true })).status).toBe(400)
  })

  it("con horas de un día, alargarla a varios pide decir cómo son las horas", async () => {
    const created = await create({
      kind: "event",
      name: "Ensayo técnico",
      startsOn: "2027-04-19",
      hours: { allDay: false, startTime: "09:00", endTime: "14:00" },
    })
    const { id } = byName(created.body as CalendarPlan, "Ensayo técnico")
    const longer = { duration: { amount: 3, unit: "days" } }

    expect((await editOf(id, longer)).status).toBe(400)
    const response = await editOf(id, {
      ...longer,
      hours: { allDay: false, startTime: "09:00", endTime: "14:00", hoursMode: "daily" },
    })
    expect(response.status).toBe(200)
    expect(byName(response.body as CalendarPlan, "Ensayo técnico")).toMatchObject({
      endsOn: "2027-04-21",
      hours: { hoursMode: "daily" },
    })
  })

  it("una reunión con videollamada no pasa a evento sin quitarla", async () => {
    const plan = (await as(ana).get(`/projects/${project.id}/plan`)).body as CalendarPlan
    const { id } = byName(plan, "Reunión de producción")

    expect((await editOf(id, { kind: "event" })).status).toBe(400)
    const response = await editOf(id, { kind: "event", videoApp: null, videoUrl: null })
    expect(response.status).toBe(200)
    expect(byName(response.body as CalendarPlan, "Reunión de producción")).toMatchObject({
      kind: "event",
      videoApp: null,
    })
  })

  it("rechaza lo que no cuadra al crear", async () => {
    const meeting = { kind: "meeting", name: "Otra", startsOn: "2027-04-20" }
    expect(
      (await create({ ...meeting, hours: { allDay: false, startTime: "11:00", endTime: "10:00" } }))
        .status
    ).toBe(400)
    expect((await create({ ...meeting, completed: true })).status).toBe(400)
    expect(
      (await create({ ...meeting, videoApp: "zoom", videoUrl: "javascript:alert(1)" })).status
    ).toBe(400)
    expect(
      (
        await create({
          ...meeting,
          kind: "hiring",
          hours: { allDay: false, startTime: "09:00", endTime: "18:00" },
        })
      ).status
    ).toBe(400)
  })
})
