import type { CalendarPlan, Project } from "@repo/contracts"
import { EXAMPLE_PROJECT } from "@repo/domain"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana es la propietaria, Marta miembro y Luis ajeno. Los tests van en orden y
// comparten el plan: cada uno parte de lo que dejó el anterior.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let marta: TestUser
let luis: TestUser
let project: Project

const as = (user: TestUser) => ctx.as(user)

const planOf = async () => (await as(ana).get(`/projects/${project.id}/plan`)).body as CalendarPlan

const idOf = async (key: string) =>
  (await planOf()).elements.find((element) => element.templateKey === key)!.id

const datesOf = (plan: CalendarPlan, key: string) => {
  const element = plan.elements.find((candidate) => candidate.templateKey === key)!
  return [element.startsOn, element.endsOn]
}

const putRule = async (
  key: string,
  point: "start" | "end",
  body: { predecessorKey: string; predecessorPoint: "start" | "end"; lag: object },
  user = ana
) =>
  as(user).put(`/elements/${await idOf(key)}/rules/${point}`, {
    predecessorId: await idOf(body.predecessorKey),
    predecessorPoint: body.predecessorPoint,
    lag: body.lag,
  })

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  marta = await ctx.createUser("marta")
  luis = await ctx.createUser("luis")

  project = (await as(ana).post("/projects", { name: "Largometraje", color: "#ef4444" }))
    .body as Project
  const { body: invitation } = await as(ana).post(`/projects/${project.id}/invitations`, {
    email: marta.email,
  })
  await as(marta).post(`/invitations/token/${(invitation as { token: string }).token}/accept`)

  for (const [key, duration] of Object.entries(EXAMPLE_PROJECT.durations)) {
    await as(ana).patch(`/elements/${await idOf(key)}/plan`, { duration })
  }
  for (const [key, fixedStart] of Object.entries(EXAMPLE_PROJECT.fixedStarts)) {
    await as(ana).patch(`/elements/${await idOf(key)}/plan`, { fixedStart })
  }
})

afterAll(async () => {
  await ctx?.close()
})

describe("las reglas del plan", () => {
  it("con las reglas propias del ejemplo salen sus 12 filas, también desde la API", async () => {
    let plan: CalendarPlan | undefined
    for (const rule of EXAMPLE_PROJECT.rules) {
      const response = await putRule(rule.successorKey, rule.successorPoint, {
        predecessorKey: rule.predecessorKey,
        predecessorPoint: rule.predecessorPoint,
        lag: { amount: rule.lagAmount, unit: rule.lagUnit },
      })
      expect(response.status).toBe(200)
      plan = response.body as CalendarPlan
    }

    for (const [key, expected] of Object.entries(EXAMPLE_PROJECT.expectedDates)) {
      expect([key, ...datesOf(plan!, key)]).toEqual([key, ...expected])
    }
  })

  it("una regla nueva sustituye a la que había en ese extremo", async () => {
    const response = await putRule("postproduccion.vfx", "start", {
      predecessorKey: "postproduccion.edicion",
      predecessorPoint: "end",
      lag: { amount: -3, unit: "weeks" },
    })
    const plan = response.body as CalendarPlan
    const vfxId = await idOf("postproduccion.vfx")

    expect(
      plan.dependencies.filter(
        (dependency) => dependency.successorId === vfxId && dependency.successorPoint === "start"
      )
    ).toHaveLength(1)
    expect(datesOf(plan, "postproduccion.vfx")).toEqual(["2027-08-01", "2027-09-04"])
  })

  it("rechaza una regla que cerraría un ciclo, diciendo cuál", async () => {
    const response = await putRule("postproduccion.edicion", "end", {
      predecessorKey: "postproduccion.vfx.creacion",
      predecessorPoint: "end",
      lag: { amount: 0, unit: "days" },
    })

    expect(response.status).toBe(409)
    expect((response.body as { message: string }).message).toBe(
      "Esa regla cerraría un ciclo: Edición → VFX → Creación VFX → Edición"
    )
  })

  it("quitar la regla de inicio deja el elemento sin de dónde sacar fechas", async () => {
    const response = await as(ana).delete(
      `/elements/${await idOf("postproduccion.vfx.render")}/rules/start`
    )
    const plan = response.body as CalendarPlan
    const render = plan.elements.find(
      (element) => element.templateKey === "postproduccion.vfx.render"
    )!

    expect(response.status).toBe(200)
    expect(render.issue).toEqual({ code: "unscheduled" })
    expect(render.startsOn).toBeNull()
  })

  it("fijar un elemento sin dependencias le da su fecha", async () => {
    const response = await as(ana).patch(
      `/elements/${await idOf("postproduccion.vfx.render")}/plan`,
      { isPinned: true, fixedStart: "2027-09-06" }
    )

    expect(datesOf(response.body as CalendarPlan, "postproduccion.vfx.render")).toEqual([
      "2027-09-06",
      "2027-09-08",
    ])
  })

  it("el inicio del ancla no depende de nada, y fijar exige la fecha", async () => {
    const onAnchor = await putRule("rodaje", "start", {
      predecessorKey: "desarrollo",
      predecessorPoint: "end",
      lag: { amount: 1, unit: "days" },
    })
    const withoutDate = await as(ana).patch(`/elements/${await idOf("explotacion")}/plan`, {
      isPinned: true,
    })

    expect(onAnchor.status).toBe(400)
    expect(withoutDate.status).toBe(400)
  })

  it("rechaza un extremo que no existe o depender de otro proyecto", async () => {
    const other = (await as(ana).post("/projects", { name: "Otro", color: "#22c55e" }))
      .body as Project
    const otherPlan = (await as(ana).get(`/projects/${other.id}/plan`)).body as CalendarPlan

    const wrongPoint = await as(ana).put(`/elements/${await idOf("rodaje.wrap")}/rules/middle`, {})
    const foreign = await as(ana).put(`/elements/${await idOf("rodaje.wrap")}/rules/start`, {
      predecessorId: otherPlan.elements[0]!.id,
      predecessorPoint: "end",
      lag: { amount: 1, unit: "days" },
    })

    expect(wrongPoint.status).toBe(400)
    expect(foreign.status).toBe(400)
  })

  it("un miembro no cambia reglas, y a un ajeno no se le confirma el elemento", async () => {
    const rule = {
      predecessorKey: "rodaje.shooting",
      predecessorPoint: "end" as const,
      lag: { amount: 2, unit: "days" },
    }

    expect((await putRule("rodaje.wrap", "start", rule, marta)).status).toBe(403)
    expect((await putRule("rodaje.wrap", "start", rule, luis)).status).toBe(404)
    expect(
      (await as(luis).delete(`/elements/${await idOf("rodaje.wrap")}/rules/start`)).status
    ).toBe(404)
  })
})
