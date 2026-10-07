import { randomUUID } from "node:crypto"
import type {
  AssignedTask,
  Column,
  Project,
  Task,
  TaskHistoryEntry,
  TaskInput,
} from "@repo/contracts"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestApp, type TestUser } from "../testing/test-app.js"

// Ana es la propietaria, Marta miembro y Luis ajeno. Los tests van en orden y
// comparten estado: cada uno parte de lo que dejó el anterior.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let ana: TestUser
let marta: TestUser
let luis: TestUser
let project: Project
let columns: Column[]
let task: Task

const as = (user: TestUser) => ctx.as(user)

const draft = (overrides: Partial<TaskInput> = {}): TaskInput => ({
  content: "Buscar localizaciones",
  priority: "p1",
  size: "m",
  dueDate: null,
  assigneeId: null,
  ...overrides,
})

const tasksOf = async (user: TestUser) =>
  (await as(user).get(`/projects/${project.id}/tasks`)).body as Task[]

const columnOrder = async (columnId: string) =>
  (await tasksOf(ana))
    .filter((candidate) => candidate.columnId === columnId)
    .sort((a, b) => a.position - b.position)
    .map((candidate) => [candidate.content, candidate.position])

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
  columns = (await as(ana).get(`/projects/${project.id}/columns`)).body as Column[]
})

afterAll(async () => {
  await ctx?.close()
})

describe("columnas", () => {
  it("cualquier miembro las ve, en orden", async () => {
    const response = await as(marta).get(`/projects/${project.id}/columns`)

    expect(response.status).toBe(200)
    expect((response.body as Column[]).map((column) => [column.title, column.position])).toEqual([
      ["Pendiente", 0],
      ["Listo", 1],
      ["En curso", 2],
      ["En revisión", 3],
      ["Hecho", 4],
    ])
  })

  it("la propietaria crea una al final", async () => {
    const response = await as(ana).post(`/projects/${project.id}/columns`, { title: "Bloqueadas" })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ title: "Bloqueadas", category: "todo", position: 5 })
  })

  it("crear una «done» degrada la anterior en la misma operación", async () => {
    const response = await as(ana).post(`/projects/${project.id}/columns`, {
      title: "Entregado",
      category: "done",
    })

    expect(response.status).toBe(201)
    const all = (await as(ana).get(`/projects/${project.id}/columns`)).body as Column[]
    expect(all.filter((column) => column.category === "done").map((c) => c.title)).toEqual([
      "Entregado",
    ])
    expect(all.find((column) => column.title === "Hecho")?.category).toBe("doing")
  })

  it("cambiar la categoría a «done» intercambia la hecha", async () => {
    const hecho = columns.find((column) => column.title === "Hecho")!

    const response = await as(ana).put(`/columns/${hecho.id}/category`, { category: "done" })

    expect(response.status).toBe(204)
    const all = (await as(ana).get(`/projects/${project.id}/columns`)).body as Column[]
    expect(all.filter((column) => column.category === "done").map((c) => c.title)).toEqual([
      "Hecho",
    ])
  })

  it("reordena, y las que no vienen en la lista van detrás", async () => {
    const [pendiente, listo] = columns
    const response = await as(ana).put(`/projects/${project.id}/columns/order`, {
      orderedColumnIds: [listo!.id, pendiente!.id],
    })

    expect(response.status).toBe(204)
    const all = (await as(ana).get(`/projects/${project.id}/columns`)).body as Column[]
    expect(all.map((column) => column.title).slice(0, 3)).toEqual([
      "Listo",
      "Pendiente",
      "En curso",
    ])
    expect(all.map((column) => column.position)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it("renombra y borra", async () => {
    const all = (await as(ana).get(`/projects/${project.id}/columns`)).body as Column[]
    const bloqueadas = all.find((column) => column.title === "Bloqueadas")!
    const entregado = all.find((column) => column.title === "Entregado")!

    expect((await as(ana).patch(`/columns/${bloqueadas.id}`, { title: "En espera" })).status).toBe(
      204
    )
    expect((await as(ana).delete(`/columns/${entregado.id}`)).status).toBe(204)
    const titles = ((await as(ana).get(`/projects/${project.id}/columns`)).body as Column[]).map(
      (column) => column.title
    )
    expect(titles).toContain("En espera")
    expect(titles).not.toContain("Entregado")
  })

  it("una miembro no puede tocarlas", async () => {
    const [column] = columns
    const responses = await Promise.all([
      as(marta).post(`/projects/${project.id}/columns`, { title: "Mía" }),
      as(marta).patch(`/columns/${column!.id}`, { title: "Mía" }),
      as(marta).delete(`/columns/${column!.id}`),
      as(marta).put(`/columns/${column!.id}/category`, { category: "blocked" }),
      as(marta).put(`/projects/${project.id}/columns/order`, { orderedColumnIds: [] }),
    ])

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403, 403])
  })
})

describe("tareas", () => {
  it("una miembro crea una tarea al final de su columna", async () => {
    const pendiente = columns[0]!
    const first = await as(marta).post(`/projects/${project.id}/tasks`, {
      ...draft(),
      columnId: pendiente.id,
    })
    const second = await as(marta).post(`/projects/${project.id}/tasks`, {
      ...draft({ content: "Pedir permisos de rodaje" }),
      columnId: pendiente.id,
    })

    expect(first.status).toBe(201)
    task = first.body as Task
    expect(task).toMatchObject({ content: "Buscar localizaciones", position: 0 })
    expect((second.body as Task).position).toBe(1)
  })

  it("no la cuelga de una columna de otro proyecto", async () => {
    const other = (await as(marta).post("/projects", { name: "Otro", color: "#000000" }))
      .body as Project
    const [foreign] = (await as(marta).get(`/projects/${other.id}/columns`)).body as Column[]

    const response = await as(marta).post(`/projects/${project.id}/tasks`, {
      ...draft(),
      columnId: foreign!.id,
    })

    expect(response.status).toBe(400)
  })

  it("solo la asigna a miembros del proyecto", async () => {
    const toLuis = await as(marta).put(`/tasks/${task.id}`, draft({ assigneeId: luis.id }))
    const toAna = await as(marta).put(`/tasks/${task.id}`, draft({ assigneeId: ana.id }))

    expect(toLuis.status).toBe(400)
    expect(toAna.status).toBe(204)
    expect((await tasksOf(ana)).find((candidate) => candidate.id === task.id)?.assigneeId).toBe(
      ana.id
    )
  })

  it("rechaza una tarea sin contenido", async () => {
    const response = await as(marta).put(`/tasks/${task.id}`, draft({ content: "  " }))

    expect(response.status).toBe(400)
  })

  it("mueve dentro de la columna", async () => {
    const pendiente = columns[0]!
    const [, second] = (await tasksOf(ana)).sort((a, b) => a.position - b.position)

    const response = await as(marta).post(`/tasks/${second!.id}/move`, {
      toColumnId: pendiente.id,
      orderedTaskIds: [second!.id, task.id],
    })

    expect(response.status).toBe(204)
    expect(await columnOrder(pendiente.id)).toEqual([
      ["Pedir permisos de rodaje", 0],
      ["Buscar localizaciones", 1],
    ])
  })

  it("mueve a otra columna: renumera las dos y apunta el movimiento", async () => {
    const [pendiente, , enCurso] = columns

    const response = await as(marta).post(`/tasks/${task.id}/move`, {
      toColumnId: enCurso!.id,
      orderedTaskIds: [task.id],
    })

    expect(response.status).toBe(204)
    expect(await columnOrder(pendiente!.id)).toEqual([["Pedir permisos de rodaje", 0]])
    expect(await columnOrder(enCurso!.id)).toEqual([["Buscar localizaciones", 0]])

    const history = (await as(ana).get(`/projects/${project.id}/history`))
      .body as TaskHistoryEntry[]
    expect(history).toEqual([
      expect.objectContaining({
        taskId: task.id,
        taskContent: "Buscar localizaciones",
        fromColumnId: pendiente!.id,
        toColumnId: enCurso!.id,
      }),
    ])
  })

  it("no mueve a una columna de otro proyecto", async () => {
    const response = await as(marta).post(`/tasks/${task.id}/move`, {
      toColumnId: randomUUID(),
      orderedTaskIds: [],
    })

    expect(response.status).toBe(400)
  })

  it("«asignadas a mí» excluye las de la columna hecha", async () => {
    const hecho = columns.find((column) => column.title === "Hecho")!
    const pending = (await as(ana).get("/me/tasks")).body as AssignedTask[]

    expect(pending.map((assigned) => assigned.content)).toEqual(["Buscar localizaciones"])
    expect(pending[0]).toMatchObject({ projectName: "Largometraje", columnTitle: "En curso" })

    await as(ana).post(`/tasks/${task.id}/move`, { toColumnId: hecho.id, orderedTaskIds: [] })
    expect((await as(ana).get("/me/tasks")).body).toEqual([])
  })

  it("borra", async () => {
    const response = await as(marta).delete(`/tasks/${task.id}`)

    expect(response.status).toBe(204)
    expect((await tasksOf(ana)).map((candidate) => candidate.content)).toEqual([
      "Pedir permisos de rodaje",
    ])
  })
})

describe("alguien ajeno al proyecto", () => {
  it("recibe 404 en todo el tablero", async () => {
    const [remaining] = await tasksOf(ana)
    const [column] = columns
    const path = `/projects/${project.id}`
    const responses = await Promise.all([
      as(luis).get(`${path}/columns`),
      as(luis).get(`${path}/tasks`),
      as(luis).get(`${path}/history`),
      as(luis).post(`${path}/tasks`, { ...draft(), columnId: column!.id }),
      as(luis).put(`/tasks/${remaining!.id}`, draft({ content: "Mía" })),
      as(luis).post(`/tasks/${remaining!.id}/move`, {
        toColumnId: column!.id,
        orderedTaskIds: [],
      }),
      as(luis).delete(`/tasks/${remaining!.id}`),
      as(luis).patch(`/columns/${column!.id}`, { title: "Mía" }),
      as(luis).delete(`/columns/${column!.id}`),
    ])

    expect(responses.map((response) => response.status)).toEqual([
      404, 404, 404, 404, 404, 404, 404, 404, 404,
    ])
    expect((await tasksOf(ana)).map((candidate) => candidate.content)).toEqual([
      "Pedir permisos de rodaje",
    ])
  })

  it("no ve tareas asignadas de proyectos de los que salió", async () => {
    const [remaining] = await tasksOf(ana)
    await as(ana).put(`/tasks/${remaining!.id}`, draft({ assigneeId: marta.id }))
    expect(((await as(marta).get("/me/tasks")).body as AssignedTask[]).length).toBe(1)

    const members = (await as(ana).get(`/projects/${project.id}/members`)).body as {
      id: string
      userId: string
    }[]
    await as(ana).delete(`/members/${members.find((m) => m.userId === marta.id)!.id}`)

    expect((await as(marta).get("/me/tasks")).body).toEqual([])
  })
})
