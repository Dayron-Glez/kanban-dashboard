import { describe, expect, it } from "vitest"
import { createProjectsRepository } from "../supabase/projectsRepository"
import { createFakeSupabase, json, noContent, USER_ID } from "./fakeSupabase"

const PROJECT_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"
const OTHER_ID = "550e8400-e29b-41d4-a716-446655440000"

const projectRow = (overrides: Record<string, unknown> = {}) => ({
  id: PROJECT_ID,
  owner_id: USER_ID,
  name: "Largometraje",
  description: null,
  color: "#6366f1",
  created_at: "2026-08-05T20:40:15.964208+00:00",
  ...overrides,
})

const setup = (...replies: Parameters<typeof createFakeSupabase>) => {
  const { client, requests } = createFakeSupabase(...replies)
  return { repo: createProjectsRepository(client), requests }
}

describe("projectsRepository.listMine", () => {
  it("pide las membresías del usuario con el proyecto y su número de tareas en una consulta", async () => {
    const { repo, requests } = setup(json([]))

    await repo.listMine()

    expect(requests).toHaveLength(1)
    const { url } = requests[0]!
    expect(url.pathname).toBe("/rest/v1/project_members")
    expect(url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`)
    expect(url.searchParams.get("select")).toBe("role,is_favorite,project:projects(*,tasks(count))")
  })

  it("mapea a camelCase y ordena del más reciente al más antiguo", async () => {
    const { repo } = setup(
      json([
        {
          role: "member",
          is_favorite: false,
          project: {
            ...projectRow({ id: OTHER_ID, created_at: "2026-01-01T00:00:00+00:00" }),
            tasks: [],
          },
        },
        {
          role: "owner",
          is_favorite: true,
          project: { ...projectRow({ description: "Rodaje en Almería" }), tasks: [{ count: 12 }] },
        },
      ])
    )

    const projects = await repo.listMine()

    expect(projects).toEqual([
      {
        id: PROJECT_ID,
        ownerId: USER_ID,
        name: "Largometraje",
        description: "Rodaje en Almería",
        color: "#6366f1",
        createdAt: "2026-08-05T20:40:15.964208+00:00",
        role: "owner",
        isFavorite: true,
        taskCount: 12,
      },
      expect.objectContaining({ id: OTHER_ID, role: "member", taskCount: 0 }),
    ])
  })

  it("rechaza una respuesta que no cumple el contrato", async () => {
    const { repo } = setup(
      json([{ role: "admin", is_favorite: false, project: { ...projectRow(), tasks: [] } }])
    )

    await expect(repo.listMine()).rejects.toMatchObject({ code: "invalid_response" })
  })

  it("traduce un fallo de red", async () => {
    const { repo } = setup(new TypeError("fetch failed"))

    await expect(repo.listMine()).rejects.toMatchObject({ code: "network" })
  })
})

describe("projectsRepository.create", () => {
  it("crea el proyecto y sus columnas por defecto", async () => {
    const { repo, requests } = setup(json(projectRow(), 201), json([{ id: "c1" }], 201))

    const project = await repo.create({ name: "Largometraje", color: "#6366f1" })

    expect(project).toMatchObject({ id: PROJECT_ID, ownerId: USER_ID, description: null })
    expect(requests[0]).toMatchObject({
      method: "POST",
      body: { owner_id: USER_ID, name: "Largometraje", description: null, color: "#6366f1" },
    })
    expect(requests[1]!.url.pathname).toBe("/rest/v1/columns")
    expect(requests[1]!.body).toEqual([
      { project_id: PROJECT_ID, title: "Pendiente", category: "todo", position: 0 },
      { project_id: PROJECT_ID, title: "Listo", category: "todo", position: 1 },
      { project_id: PROJECT_ID, title: "En curso", category: "doing", position: 2 },
      { project_id: PROJECT_ID, title: "En revisión", category: "doing", position: 3 },
      { project_id: PROJECT_ID, title: "Hecho", category: "done", position: 4 },
    ])
  })

  it("borra el proyecto si fallan las columnas, para no dejarlo a medias", async () => {
    const { repo, requests } = setup(
      json(projectRow(), 201),
      json({ code: "42501", message: "denegado" }, 403),
      noContent()
    )

    await expect(repo.create({ name: "Largometraje", color: "#6366f1" })).rejects.toMatchObject({
      code: "forbidden",
    })
    expect(requests[2]).toMatchObject({ method: "DELETE" })
    expect(requests[2]!.url.searchParams.get("id")).toBe(`eq.${PROJECT_ID}`)
  })
})

describe("projectsRepository: mutaciones", () => {
  it("rename lanza forbidden si la RLS no deja actualizar ninguna fila", async () => {
    const { repo } = setup(json([]))

    await expect(repo.rename(PROJECT_ID, "Nuevo")).rejects.toMatchObject({ code: "forbidden" })
  })

  it("remove resuelve si se borró la fila", async () => {
    const { repo, requests } = setup(json([{ id: PROJECT_ID }]))

    await expect(repo.remove(PROJECT_ID)).resolves.toBeUndefined()
    expect(requests[0]).toMatchObject({ method: "DELETE" })
  })

  it("setFavorite actualiza solo la membresía del usuario", async () => {
    const { repo, requests } = setup(json([{ id: "m1" }]))

    await repo.setFavorite(PROJECT_ID, true)

    const { url, body, method } = requests[0]!
    expect(method).toBe("PATCH")
    expect(body).toEqual({ is_favorite: true })
    expect(url.searchParams.get("project_id")).toBe(`eq.${PROJECT_ID}`)
    expect(url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`)
  })
})
