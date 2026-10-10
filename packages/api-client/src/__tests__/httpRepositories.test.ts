import { describe, expect, it, vi } from "vitest"
import { createHttpApi } from "../http/createHttpApi"
import { createHttpClient } from "../http/httpClient"

const PROJECT_ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"
const TOKEN = "0b1c2d3e-4f50-4617-8899-aabbccddeeff"
const NOW = "2026-10-07T18:00:00.000Z"

const project = {
  id: PROJECT_ID,
  ownerId: "2b7e1c4a-9f3d-4e8a-b5c6-1d2e3f4a5b6c",
  kind: "film",
  name: "Largometraje",
  description: null,
  color: "#ef4444",
  createdAt: NOW,
}

const invitation = {
  id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  projectId: PROJECT_ID,
  email: "marta@cauce.test",
  token: TOKEN,
  status: "pending",
  expiresAt: NOW,
  createdAt: NOW,
}

// Responde a cada petición con lo que diga `reply` y apunta qué se pidió.
const setup = (reply: (url: string) => Response = () => new Response(null, { status: 204 })) => {
  const fetch = vi.fn<typeof globalThis.fetch>((url) => Promise.resolve(reply(String(url))))
  const api = createHttpApi(
    createHttpClient({
      baseUrl: "https://api.cauce.test",
      getAccessToken: () => Promise.resolve("token"),
      fetch,
    })
  )
  const sent = () =>
    fetch.mock.calls.map(([url, init]) => ({
      method: init?.method,
      path: String(url).replace("https://api.cauce.test", ""),
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    }))
  return { api, sent }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

describe("createHttpApi", () => {
  it("proyectos: cada operación va a su ruta", async () => {
    const { api, sent } = setup((url) =>
      url.endsWith("/projects")
        ? json([{ ...project, role: "owner", isFavorite: false, taskCount: 3 }])
        : new Response(null, { status: 204 })
    )

    const mine = await api.projects.listMine()
    await api.projects.rename(PROJECT_ID, "Cortometraje")
    await api.projects.setFavorite(PROJECT_ID, true)
    await api.projects.remove(PROJECT_ID)

    expect(mine[0]?.taskCount).toBe(3)
    expect(sent()).toEqual([
      { method: "GET", path: "/projects", body: undefined },
      { method: "PATCH", path: `/projects/${PROJECT_ID}`, body: { name: "Cortometraje" } },
      { method: "PUT", path: `/projects/${PROJECT_ID}/favorite`, body: { isFavorite: true } },
      { method: "DELETE", path: `/projects/${PROJECT_ID}`, body: undefined },
    ])
  })

  it("proyectos: crear devuelve el proyecto validado", async () => {
    const { api, sent } = setup(() => json(project, 201))
    const input = { name: "Largometraje", description: null, color: "#ef4444" }

    await expect(api.projects.create(input)).resolves.toEqual(project)
    expect(sent()).toEqual([{ method: "POST", path: "/projects", body: input }])
  })

  it("miembros: listar y quitar", async () => {
    const { api, sent } = setup((url) =>
      url.endsWith("/members") ? json([]) : new Response(null, { status: 204 })
    )

    await api.members.listByProject(PROJECT_ID)
    await api.members.remove("m1")

    expect(sent()).toEqual([
      { method: "GET", path: `/projects/${PROJECT_ID}/members`, body: undefined },
      { method: "DELETE", path: "/members/m1", body: undefined },
    ])
  })

  it("invitaciones: el proyecto va en la ruta y el correo en el cuerpo", async () => {
    const { api, sent } = setup(() => json(invitation, 201))

    await api.invitations.create({ projectId: PROJECT_ID, email: "marta@cauce.test" })

    expect(sent()).toEqual([
      {
        method: "POST",
        path: `/projects/${PROJECT_ID}/invitations`,
        body: { email: "marta@cauce.test" },
      },
    ])
  })

  it("invitaciones: aceptar devuelve el id del proyecto", async () => {
    const { api, sent } = setup(() => json({ projectId: PROJECT_ID }))

    await expect(api.invitations.accept(TOKEN)).resolves.toBe(PROJECT_ID)
    expect(sent()).toEqual([
      { method: "POST", path: `/invitations/token/${TOKEN}/accept`, body: undefined },
    ])
  })

  it("invitaciones: un token desconocido es null, no un error", async () => {
    const { api } = setup(() => json({ message: "La invitación no existe" }, 404))

    await expect(api.invitations.findByToken(TOKEN)).resolves.toBeNull()
  })

  it("invitaciones: cualquier otro fallo al buscar por token sí es un error", async () => {
    const { api } = setup(() => json({ message: "Algo ha fallado" }, 500))

    await expect(api.invitations.findByToken(TOKEN)).rejects.toMatchObject({ code: "unknown" })
  })

  it("columnas: el proyecto va en la ruta y cada cambio a su recurso", async () => {
    const column = {
      id: "c1",
      projectId: PROJECT_ID,
      title: "Rodaje",
      position: 0,
      category: "todo",
    }
    const { api, sent } = setup((url) =>
      url.endsWith("/columns")
        ? json({ ...column, id: PROJECT_ID }, 201)
        : new Response(null, { status: 204 })
    )

    await api.columns.create({ projectId: PROJECT_ID, title: "Rodaje", category: "done" })
    await api.columns.rename("c1", "Montaje")
    await api.columns.setCategory("c1", "blocked")
    await api.columns.reorder(PROJECT_ID, ["c2", "c1"])
    await api.columns.remove("c1")

    expect(sent()).toEqual([
      {
        method: "POST",
        path: `/projects/${PROJECT_ID}/columns`,
        body: { title: "Rodaje", category: "done" },
      },
      { method: "PATCH", path: "/columns/c1", body: { title: "Montaje" } },
      { method: "PUT", path: "/columns/c1/category", body: { category: "blocked" } },
      {
        method: "PUT",
        path: `/projects/${PROJECT_ID}/columns/order`,
        body: { orderedColumnIds: ["c2", "c1"] },
      },
      { method: "DELETE", path: "/columns/c1", body: undefined },
    ])
  })

  it("tareas: crear, editar, mover y borrar", async () => {
    const input = {
      content: "Casting",
      priority: "p0",
      size: "s",
      dueDate: null,
      assigneeId: null,
    } as const
    const task = { ...input, id: TOKEN, projectId: PROJECT_ID, columnId: PROJECT_ID, position: 0 }
    const { api, sent } = setup((url) =>
      url.endsWith("/tasks") ? json(task, 201) : new Response(null, { status: 204 })
    )

    await api.tasks.create({ ...input, projectId: PROJECT_ID, columnId: "c1" })
    await api.tasks.update("t1", input)
    await api.tasks.move({ taskId: "t1", toColumnId: "c2", orderedTaskIds: ["t1"] })
    await api.tasks.remove("t1")

    expect(sent()).toEqual([
      { method: "POST", path: `/projects/${PROJECT_ID}/tasks`, body: { ...input, columnId: "c1" } },
      { method: "PUT", path: "/tasks/t1", body: input },
      {
        method: "POST",
        path: "/tasks/t1/move",
        body: { toColumnId: "c2", orderedTaskIds: ["t1"] },
      },
      { method: "DELETE", path: "/tasks/t1", body: undefined },
    ])
  })

  it("lecturas del tablero y del inicio", async () => {
    const { api, sent } = setup(() => json([]))

    await api.columns.listByProject(PROJECT_ID)
    await api.tasks.listByProject(PROJECT_ID)
    await api.tasks.listAssignedToMe()
    await api.history.listByProject(PROJECT_ID)

    expect(sent().map(({ method, path }) => `${method} ${path}`)).toEqual([
      `GET /projects/${PROJECT_ID}/columns`,
      `GET /projects/${PROJECT_ID}/tasks`,
      "GET /me/tasks",
      `GET /projects/${PROJECT_ID}/history`,
    ])
  })
})
