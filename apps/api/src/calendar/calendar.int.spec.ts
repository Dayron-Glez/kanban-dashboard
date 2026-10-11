import type { CalendarElement, Project } from "@repo/contracts"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana es la propietaria, Marta miembro y Luis ajeno.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let marta: TestUser
let luis: TestUser
let project: Project

const as = (user: TestUser) => ctx.as(user)

const elementsOf = async (user: TestUser, projectId = project.id) =>
  (await as(user).get(`/projects/${projectId}/elements`)).body as CalendarElement[]

const names = (elements: CalendarElement[], kind: CalendarElement["kind"]) =>
  elements.filter((element) => element.kind === kind).map((element) => element.name)

const dependenciesOf = (projectId = project.id) => ctx.sql<
  {
    predecessor: string
    predecessorPoint: string
    successor: string
    successorPoint: string
    lag: number
  }[]
>`
  select p.template_key as predecessor, d.predecessor_point as "predecessorPoint",
         s.template_key as successor, d.successor_point as "successorPoint", d.lag_amount::float as lag
  from calendar.element_dependencies d
  join calendar.elements p on p.id = d.predecessor_id
  join calendar.elements s on s.id = d.successor_id
  where d.project_id = ${projectId}`

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

describe("calendario del proyecto", () => {
  it("el proyecto nace con la plantilla de su tipo", async () => {
    const elements = await elementsOf(ana)

    expect(names(elements, "phase")).toHaveLength(7)
    expect(names(elements, "process")).toHaveLength(38)
    expect(names(elements, "process")).toContain("Argumento")
    expect(names(elements, "process")).not.toContain("Biblia")
  })

  it("nace con Rodaje como ancla, Desarrollo fijado y sus dependencias", async () => {
    const flags = await ctx.sql<{ key: string; isAnchor: boolean; isPinned: boolean }[]>`
      select template_key as key, is_anchor as "isAnchor", is_pinned as "isPinned"
      from calendar.elements where project_id = ${project.id} and (is_anchor or is_pinned)`
    const dependencies = await dependenciesOf()

    expect(flags).toEqual(
      expect.arrayContaining([
        { key: "rodaje", isAnchor: true, isPinned: false },
        { key: "desarrollo", isAnchor: false, isPinned: true },
      ])
    )
    expect(flags).toHaveLength(2)
    expect(dependencies).toHaveLength(61)
    expect(dependencies).toEqual(
      expect.arrayContaining([
        {
          predecessor: "rodaje",
          predecessorPoint: "start",
          successor: "preparacion",
          successorPoint: "end",
          lag: -1,
        },
        {
          predecessor: "rodaje",
          predecessorPoint: "end",
          successor: "rodaje.shooting",
          successorPoint: "end",
          lag: 0,
        },
        {
          predecessor: "rodaje.shooting",
          predecessorPoint: "end",
          successor: "rodaje.wrap",
          successorPoint: "start",
          lag: 1,
        },
      ])
    )
  })

  it("cada hijo apunta al id de su padre", async () => {
    const elements = await elementsOf(ana)
    const byId = new Map(elements.map((element) => [element.id, element]))
    const render = elements.find((element) => element.templateKey === "postproduccion.vfx.render")

    const vfx = byId.get(render!.parentId!)
    expect(vfx?.templateKey).toBe("postproduccion.vfx")
    expect(byId.get(vfx!.parentId!)?.name).toBe("Postproducción")
  })

  it("una serie nace con Biblia y guiones", async () => {
    const response = await as(ana).post("/projects", {
      name: "Serie",
      kind: "series",
      color: "#22c55e",
    })
    expect(response.status).toBe(201)
    const elements = await elementsOf(ana, (response.body as Project).id)

    expect(names(elements, "process")).toContain("Biblia")
    expect(names(elements, "process")).toContain("Escritura de guiones")
  })

  it("un miembro ve el calendario y un ajeno no", async () => {
    expect(await elementsOf(marta)).toHaveLength((await elementsOf(ana)).length)
    expect((await as(luis).get(`/projects/${project.id}/elements`)).status).toBe(404)
  })

  it("no se genera la plantilla sobre un calendario con elementos", async () => {
    const response = await as(ana).post(`/projects/${project.id}/elements/template`)
    expect(response.status).toBe(409)
  })

  it("solo la propietaria genera la plantilla, y a un ajeno no se le confirma el proyecto", async () => {
    await ctx.sql`delete from calendar.elements where project_id = ${project.id}`

    expect((await as(marta).post(`/projects/${project.id}/elements/template`)).status).toBe(403)
    expect((await as(luis).post(`/projects/${project.id}/elements/template`)).status).toBe(404)
    expect(await elementsOf(ana)).toEqual([])
  })

  it("la propietaria regenera un calendario vacío", async () => {
    const response = await as(ana).post(`/projects/${project.id}/elements/template`)

    expect(response.status).toBe(201)
    expect(names(response.body as CalendarElement[], "phase")).toHaveLength(7)
    expect(await elementsOf(ana)).toHaveLength((response.body as CalendarElement[]).length)
    expect(await dependenciesOf()).toHaveLength(61)
  })

  it("la base rechaza un segundo ancla y una dependencia de un elemento consigo mismo", async () => {
    const [desarrollo] = await ctx.sql<{ id: string }[]>`
      select id from calendar.elements where project_id = ${project.id} and template_key = 'desarrollo'`

    await expect(
      ctx.sql`update calendar.elements set is_anchor = true where id = ${desarrollo!.id}`
    ).rejects.toThrow(/elements_one_anchor_per_project/)
    await expect(
      ctx.sql`insert into calendar.element_dependencies (project_id, predecessor_id, successor_id)
              values (${project.id}, ${desarrollo!.id}, ${desarrollo!.id})`
    ).rejects.toThrow(/element_dependencies_not_self_check/)
  })
})
