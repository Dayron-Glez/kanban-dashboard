import type { Alert, CrewMember, Department, Project } from "@repo/contracts"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana es la propietaria, Marta miembro y Luis ajeno. Los tests van en orden.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let marta: TestUser
let luis: TestUser
let project: Project
let other: Project
let departments: Department[]
let lola: CrewMember
let targeted: Alert

const as = (user: TestUser) => ctx.as(user)
const alertsUrl = () => `/projects/${project.id}/alerts`
const departmentNamed = (name: string) =>
  departments.find((department) => department.name === name)!

const strike = {
  title: "Huelga de transporte",
  cause: "strike",
  scope: "project",
  when: { startsOn: "2026-10-16", endsOn: "2026-10-16" },
}

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  marta = await ctx.createUser("marta")
  luis = await ctx.createUser("luis")

  project = (await as(ana).post("/projects", { name: "Película", color: "#ef4444" }))
    .body as Project
  other = (await as(ana).post("/projects", { name: "Otra", color: "#ef4444" })).body as Project
  const { body: invitation } = await as(ana).post(`/projects/${project.id}/invitations`, {
    email: marta.email,
  })
  await as(marta).post(`/invitations/token/${(invitation as { token: string }).token}/accept`)
  departments = (await as(ana).get(`/projects/${project.id}/departments`)).body as Department[]
  lola = (await as(ana).post(`/projects/${project.id}/crew`, { fullName: "Lola Flores" }))
    .body as CrewMember
})

afterAll(async () => {
  await ctx?.close()
})

describe("crear alertas", () => {
  it("de todo el proyecto, segura por defecto y con quien la crea", async () => {
    const response = await as(ana).post(alertsUrl(), strike)

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      projectId: project.id,
      title: "Huelga de transporte",
      cause: "strike",
      certainty: "confirmed",
      scope: "project",
      departmentIds: [],
      crewMemberIds: [],
      notes: null,
      createdBy: ana.id,
      when: {
        startsOn: "2026-10-16",
        endsOn: "2026-10-16",
        allDay: true,
        startTime: null,
        endTime: null,
        hoursMode: null,
      },
    })
  })

  it("con cada forma del «Cuándo»", async () => {
    const shapes = [
      { startsOn: "2026-10-16", endsOn: "2026-10-20" },
      {
        startsOn: "2026-10-16",
        endsOn: "2026-10-16",
        allDay: false,
        startTime: "09:00",
        endTime: "14:00",
      },
      {
        startsOn: "2026-10-16",
        endsOn: "2026-10-20",
        allDay: false,
        startTime: "09:00",
        endTime: "14:00",
        hoursMode: "daily",
      },
      {
        startsOn: "2026-10-16",
        endsOn: "2026-10-18",
        allDay: false,
        startTime: "22:00",
        endTime: "06:00",
        hoursMode: "continuous",
      },
      { startsOn: "2026-10-16", endsOn: null },
      {
        startsOn: "2026-10-16",
        endsOn: null,
        allDay: false,
        startTime: "22:00",
        hoursMode: "continuous",
      },
    ]
    for (const when of shapes) {
      const response = await as(ana).post(alertsUrl(), { ...strike, when })
      expect(response.status).toBe(201)
      expect((response.body as Alert).when).toMatchObject(when)
    }
  })

  it("rechaza un «Cuándo» o un alcance inválidos", async () => {
    const invalid = [
      { ...strike, when: { startsOn: "2026-10-16", endsOn: "2026-10-15" } },
      {
        ...strike,
        when: {
          startsOn: "2026-10-16",
          endsOn: "2026-10-18",
          allDay: false,
          startTime: "22:00",
          endTime: "06:00",
          hoursMode: "daily",
        },
      },
      { ...strike, title: "a".repeat(121) },
      { ...strike, cause: "fire" },
      { ...strike, scope: "targeted" },
      { ...strike, departmentIds: [departmentNamed("Sonido").id] },
    ]
    for (const body of invalid) {
      expect((await as(ana).post(alertsUrl(), body)).status).toBe(400)
    }
  })

  it("de personas y departamentos", async () => {
    const response = await as(ana).post(alertsUrl(), {
      ...strike,
      title: "Lola, en el teatro",
      cause: "unavailability",
      certainty: "possible",
      scope: "targeted",
      departmentIds: [departmentNamed("Reparto").id, departmentNamed("Sonido").id],
      crewMemberIds: [lola.id],
      notes: "Función de tarde",
    })

    expect(response.status).toBe(201)
    targeted = response.body as Alert
    expect(targeted).toMatchObject({
      certainty: "possible",
      scope: "targeted",
      crewMemberIds: [lola.id],
      notes: "Función de tarde",
    })
    expect(new Set(targeted.departmentIds)).toEqual(
      new Set([departmentNamed("Reparto").id, departmentNamed("Sonido").id])
    )
  })

  it("solo con departamentos y personas de su proyecto", async () => {
    const [foreign] = (await as(ana).get(`/projects/${other.id}/departments`)).body as Department[]
    const stranger = (await as(ana).post(`/projects/${other.id}/crew`, { fullName: "Pepe" }))
      .body as CrewMember
    const response = (body: object) =>
      as(ana).post(alertsUrl(), { ...strike, scope: "targeted", ...body })

    expect((await response({ departmentIds: [foreign!.id] })).status).toBe(400)
    expect((await response({ crewMemberIds: [stranger.id] })).status).toBe(400)
  })
})

describe("leer, editar y borrar alertas", () => {
  it("los miembros las ven, por fecha de inicio", async () => {
    const response = await as(marta).get(alertsUrl())

    expect(response.status).toBe(200)
    const alerts = response.body as Alert[]
    expect(alerts).toHaveLength(8)
    expect(alerts.map((alert) => alert.when.startsOn)).toEqual(
      alerts.map((alert) => alert.when.startsOn).sort()
    )
    expect(alerts.find((alert) => alert.id === targeted.id)).toEqual(targeted)
  })

  it("cambiar la certeza no toca los destinos", async () => {
    const response = await as(ana).patch(`/alerts/${targeted.id}`, { certainty: "confirmed" })

    expect(response.status).toBe(200)
    const updated = response.body as Alert
    expect(updated).toMatchObject({ certainty: "confirmed", crewMemberIds: [lola.id] })
    expect(updated.departmentIds).toHaveLength(2)
    expect(updated.updatedAt > targeted.updatedAt).toBe(true)
  })

  it("el alcance y el «Cuándo» se cambian enteros", async () => {
    const response = await as(ana).patch(`/alerts/${targeted.id}`, {
      scope: "targeted",
      departmentIds: [departmentNamed("Sonido").id],
      when: {
        startsOn: "2026-10-17",
        endsOn: "2026-10-17",
        allDay: false,
        startTime: "18:00",
        endTime: "23:00",
      },
      notes: "",
    })

    expect(response.status).toBe(200)
    targeted = response.body as Alert
    expect(targeted).toMatchObject({
      departmentIds: [departmentNamed("Sonido").id],
      crewMemberIds: [],
      notes: null,
      when: { startsOn: "2026-10-17", startTime: "18:00", endTime: "23:00", hoursMode: null },
    })
    expect(
      (await as(ana).patch(`/alerts/${targeted.id}`, { departmentIds: [lola.id] })).status
    ).toBe(400)
    expect((await as(ana).patch(`/alerts/${targeted.id}`, {})).status).toBe(400)
  })

  it("si se borra su departamento, sigue siendo de personas y departamentos", async () => {
    await ctx.sql`delete from core.departments where id = ${departmentNamed("Sonido").id}`
    const alerts = (await as(ana).get(alertsUrl())).body as Alert[]
    expect(alerts.find((alert) => alert.id === targeted.id)).toMatchObject({
      scope: "targeted",
      departmentIds: [],
      crewMemberIds: [],
    })
  })

  it("pasar a todo el proyecto quita los destinos", async () => {
    const withLola = (
      await as(ana).patch(`/alerts/${targeted.id}`, {
        scope: "targeted",
        crewMemberIds: [lola.id],
      })
    ).body as Alert
    expect(withLola.crewMemberIds).toEqual([lola.id])

    const response = await as(ana).patch(`/alerts/${targeted.id}`, { scope: "project" })
    expect(response.body).toMatchObject({ scope: "project", departmentIds: [], crewMemberIds: [] })
  })

  it("solo la propietaria escribe, y quien no es miembro no ve nada", async () => {
    expect((await as(marta).post(alertsUrl(), strike)).status).toBe(403)
    expect((await as(marta).patch(`/alerts/${targeted.id}`, { title: "X" })).status).toBe(403)
    expect((await as(marta).delete(`/alerts/${targeted.id}`)).status).toBe(403)
    expect((await as(luis).get(alertsUrl())).status).toBe(404)
    expect((await as(luis).patch(`/alerts/${targeted.id}`, { title: "X" })).status).toBe(404)
  })

  it("se borra", async () => {
    expect((await as(ana).delete(`/alerts/${targeted.id}`)).status).toBe(204)
    expect((await as(ana).delete(`/alerts/${targeted.id}`)).status).toBe(404)
  })
})
