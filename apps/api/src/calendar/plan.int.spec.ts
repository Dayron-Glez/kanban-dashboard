import type { CalendarPlan, Duration, Project } from "@repo/contracts"
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

// El proyecto de ejemplo del productor, en lo que reproducen las dependencias de
// la plantilla: VFX y sus procesos llevan allí reglas propias, que se editan en
// el 5b.2. Las 12 filas completas se prueban en domain (exampleProject.test.ts).
const DURATIONS: Record<string, Duration> = {
  desarrollo: { amount: 3, unit: "months" },
  softpre: { amount: 3.85, unit: "months" },
  preparacion: { amount: 9, unit: "weeks" },
  rodaje: { amount: 6, unit: "weeks" },
  "rodaje.wrap": { amount: 2, unit: "weeks" },
  postproduccion: { amount: 30, unit: "weeks" },
  "postproduccion.edicion": { amount: 20, unit: "weeks" },
}

const EXPECTED: Record<string, [string, string]> = {
  desarrollo: ["2026-01-01", "2026-03-31"],
  softpre: ["2026-10-05", "2027-01-31"],
  preparacion: ["2027-02-01", "2027-04-04"],
  rodaje: ["2027-04-05", "2027-05-16"],
  "rodaje.shooting": ["2027-04-05", "2027-05-16"],
  "rodaje.wrap": ["2027-05-17", "2027-05-30"],
  postproduccion: ["2027-04-05", "2027-10-31"],
  "postproduccion.edicion": ["2027-04-05", "2027-08-22"],
}

const planOf = async (user: TestUser) =>
  (await as(user).get(`/projects/${project.id}/plan`)).body as CalendarPlan

const byKey = (plan: CalendarPlan, key: string) =>
  plan.elements.find((element) => element.templateKey === key)!

const datesOf = (plan: CalendarPlan, key: string) => {
  const element = byKey(plan, key)
  return [element.startsOn, element.endsOn]
}

const patch = async (key: string, body: object, user = ana) => {
  const element = byKey(await planOf(ana), key)
  return as(user).patch(`/elements/${element.id}/plan`, body)
}

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
})

afterAll(async () => {
  await ctx?.close()
})

describe("el plan con fechas", () => {
  it("un proyecto recién creado no tiene fechas y dice qué le falta", async () => {
    const plan = await planOf(ana)

    expect(plan.elements).toHaveLength(62)
    expect(plan.dependencies).toHaveLength(61)
    expect(byKey(plan, "rodaje").issue).toEqual({ code: "missing-date" })
    expect(byKey(plan, "preparacion").issue).toEqual({
      code: "missing-dependency",
      elementId: byKey(plan, "rodaje").id,
    })
  })

  it("con las duraciones y las dos fechas del ejemplo salen sus fechas", async () => {
    for (const [key, duration] of Object.entries(DURATIONS)) {
      expect((await patch(key, { duration })).status).toBe(200)
    }
    await patch("desarrollo", { fixedStart: "2026-01-01" })
    const response = await patch("rodaje", { fixedStart: "2027-04-05" })

    expect(response.status).toBe(200)
    const plan = response.body as CalendarPlan
    for (const [key, expected] of Object.entries(EXPECTED)) {
      expect([key, ...datesOf(plan, key)]).toEqual([key, ...expected])
    }
  })

  it("las fechas quedan guardadas, y el GET las devuelve igual", async () => {
    const [edicion] = await ctx.sql<{ startsOn: string; endsOn: string }[]>`
      select starts_on::text as "startsOn", ends_on::text as "endsOn" from calendar.elements
      where project_id = ${project.id} and template_key = 'postproduccion.edicion'`

    expect(edicion).toEqual({ startsOn: "2027-04-05", endsOn: "2027-08-22" })
    expect(datesOf(await planOf(marta), "postproduccion.edicion")).toEqual([
      "2027-04-05",
      "2027-08-22",
    ])
  })

  it("sin duración, el inicio se calcula y el fin queda vacío con el motivo", async () => {
    const plan = await planOf(ana)

    expect(datesOf(plan, "explotacion")).toEqual(["2027-11-01", null])
    expect(byKey(plan, "explotacion").issue).toEqual({ code: "missing-duration" })
  })

  it("mover el rodaje recalcula lo que cuelga de él, y Desarrollo, fijado, no se mueve", async () => {
    const plan = (await patch("rodaje", { fixedStart: "2027-05-03" })).body as CalendarPlan

    expect(datesOf(plan, "preparacion")).toEqual(["2027-03-01", "2027-05-02"])
    expect(datesOf(plan, "rodaje.wrap")).toEqual(["2027-06-14", "2027-06-27"])
    expect(datesOf(plan, "desarrollo")).toEqual(EXPECTED.desarrollo)
  })

  it("quitar una duración vacía el fin de ese elemento y de lo que depende de él", async () => {
    const plan = (await patch("rodaje.wrap", { duration: null })).body as CalendarPlan

    expect(datesOf(plan, "rodaje.wrap")).toEqual(["2027-06-14", null])
    expect(byKey(plan, "rodaje.wrap").duration).toBeNull()
  })

  it("solo el ancla y los fijados aceptan una fecha escrita a mano", async () => {
    const response = await patch("preparacion", { fixedStart: "2027-01-01" })
    expect(response.status).toBe(400)
  })

  it("rechaza duraciones que no son positivas o unidades que no existen", async () => {
    expect((await patch("preparacion", { duration: { amount: 0, unit: "weeks" } })).status).toBe(
      400
    )
    expect((await patch("preparacion", { duration: { amount: 2, unit: "years" } })).status).toBe(
      400
    )
  })

  it("un miembro ve el plan pero no lo cambia, y a un ajeno no se le confirma", async () => {
    expect((await as(marta).get(`/projects/${project.id}/plan`)).status).toBe(200)
    expect((await patch("rodaje", { fixedStart: "2027-06-07" }, marta)).status).toBe(403)
    expect((await as(luis).get(`/projects/${project.id}/plan`)).status).toBe(404)
    expect((await patch("rodaje", { fixedStart: "2027-06-07" }, luis)).status).toBe(404)
  })

  it("un elemento que no existe da 404", async () => {
    const response = await as(ana).patch(`/elements/${crypto.randomUUID()}/plan`, {
      duration: null,
    })
    expect(response.status).toBe(404)
  })
})
