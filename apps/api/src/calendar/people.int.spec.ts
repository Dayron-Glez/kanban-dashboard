import type {
  CalendarElement,
  CalendarPlan,
  CrewMember,
  Department,
  Project,
} from "@repo/contracts"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana es la propietaria. Los tests van en orden y comparten el plan.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let project: Project
let rodajeId: string
let marta: CrewMember
let pedro: CrewMember
let lola: CrewMember
let stranger: CrewMember
let produccion: Department
let sonido: Department

const as = (user: TestUser) => ctx.as(user)
const byName = (plan: CalendarPlan, name: string) =>
  plan.elements.find((element) => element.name === name) as CalendarElement
const create = (body: object) => as(ana).post(`/elements/${rodajeId}/actions`, body)
const editOf = (id: string, body: object) => as(ana).patch(`/elements/${id}/edits`, body)
const planOf = async () => (await as(ana).get(`/projects/${project.id}/plan`)).body as CalendarPlan
const crew = async (projectId: string, fullName: string) =>
  (await as(ana).post(`/projects/${projectId}/crew`, { fullName })).body as CrewMember

const meeting = { kind: "meeting", startsOn: "2027-04-14" }

beforeAll(async () => {
  ctx = await createTestApp()
  ana = await ctx.createUser("ana")
  project = (await as(ana).post("/projects", { name: "Película", color: "#ef4444" }))
    .body as Project
  const other = (await as(ana).post("/projects", { name: "Otra", color: "#ef4444" }))
    .body as Project
  rodajeId = (await planOf()).elements.find((element) => element.templateKey === "rodaje")!.id
  marta = await crew(project.id, "Marta Ruiz")
  pedro = await crew(project.id, "Pedro Gil")
  lola = await crew(project.id, "Lola Flores")
  stranger = await crew(other.id, "Pepe")
  const departments = (await as(ana).get(`/projects/${project.id}/departments`))
    .body as Department[]
  produccion = departments.find((department) => department.name === "Producción")!
  sonido = departments.find((department) => department.name === "Sonido")!
})

afterAll(async () => {
  await ctx?.close()
})

describe("las personas de las acciones", () => {
  it("una reunión con responsable, ejecutantes, departamentos y participantes", async () => {
    const response = await create({
      ...meeting,
      name: "Reunión de producción",
      people: {
        responsibleId: marta.id,
        executorIds: [pedro.id],
        departmentIds: [produccion.id, sonido.id],
        guests: [{ crewMemberId: lola.id }, { fullName: "José Ruiz", email: "Jose@Agencia.es" }],
      },
    })

    expect(response.status).toBe(201)
    const action = byName(response.body as CalendarPlan, "Reunión de producción")
    expect(action.people).toMatchObject({ responsibleId: marta.id, executorIds: [pedro.id] })
    expect(new Set(action.people.departmentIds)).toEqual(new Set([produccion.id, sonido.id]))
    expect(action.people.guests).toEqual([
      { crewMemberId: lola.id, fullName: null, email: null },
      { crewMemberId: null, fullName: "José Ruiz", email: "jose@agencia.es" },
    ])
  })

  it("sin indicarlo, nadie; y las fases también responden con sus personas vacías", async () => {
    const response = await create({ ...meeting, name: "Lectura" })
    expect(byName(response.body as CalendarPlan, "Lectura").people).toEqual({
      responsibleId: null,
      executorIds: [],
      departmentIds: [],
      guests: [],
    })
  })

  it("editar las personas las sustituye enteras", async () => {
    const { id } = byName(await planOf(), "Reunión de producción")
    const response = await editOf(id, { people: { responsibleId: pedro.id } })

    expect(response.status).toBe(200)
    expect(byName(response.body as CalendarPlan, "Reunión de producción").people).toEqual({
      responsibleId: pedro.id,
      executorIds: [],
      departmentIds: [],
      guests: [],
    })
  })

  it("solo del equipo y los departamentos del proyecto", async () => {
    expect(
      (await create({ ...meeting, name: "Otra", people: { executorIds: [stranger.id] } })).status
    ).toBe(400)
    const { id } = byName(await planOf(), "Lectura")
    expect((await editOf(id, { people: { guests: [{ crewMemberId: stranger.id }] } })).status).toBe(
      400
    )
  })

  it("rechaza lo que no cuadra: dos papeles, invitados a medias o repetidos", async () => {
    const people = (value: object) => create({ ...meeting, name: "Mal", people: value })
    expect((await people({ responsibleId: marta.id, executorIds: [marta.id] })).status).toBe(400)
    expect((await people({ guests: [{ fullName: "Sin email" }] })).status).toBe(400)
    expect(
      (
        await people({
          guests: [
            { fullName: "A", email: "a@x.es" },
            { fullName: "B", email: "A@x.es" },
          ],
        })
      ).status
    ).toBe(400)
  })

  it("el viaje y la contratación no llevan estas personas", async () => {
    const travel = { kind: "travel", name: "Viaje", startsOn: "2027-04-20" }
    expect((await create({ ...travel, people: { responsibleId: marta.id } })).status).toBe(400)

    const { id } = byName(await planOf(), "Reunión de producción")
    expect((await editOf(id, { kind: "hiring" })).status).toBe(400)
    expect(byName(await planOf(), "Reunión de producción").kind).toBe("meeting")
  })

  it("si se borra una persona del equipo, deja de estar en las acciones", async () => {
    await as(ana).delete(`/crew/${pedro.id}`)
    expect(byName(await planOf(), "Reunión de producción").people.responsibleId).toBeNull()
  })
})
