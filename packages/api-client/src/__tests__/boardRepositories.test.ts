import { describe, expect, it } from "vitest"
import { createColumnsRepository } from "../supabase/columnsRepository"
import { createTasksRepository } from "../supabase/tasksRepository"
import { createFakeSupabase, json, noContent, USER_ID } from "./fakeSupabase"

const PROJECT_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"
const COLUMN_ID = "550e8400-e29b-41d4-a716-446655440000"
const TASK_ID = "9b2f4c1e-3d5a-4b6c-8d7e-0f1a2b3c4d5e"

const columnRow = {
  id: COLUMN_ID,
  project_id: PROJECT_ID,
  title: "Pendiente",
  position: 2,
  category: "todo",
}

const taskRow = (overrides: Record<string, unknown> = {}) => ({
  id: TASK_ID,
  project_id: PROJECT_ID,
  column_id: COLUMN_ID,
  content: "Localizar exteriores",
  priority: "p1",
  size: "m",
  due_date: "2026-11-02",
  position: 0,
  assignee_id: USER_ID,
  created_at: "2026-10-07T10:00:00+00:00",
  ...overrides,
})

// PostgREST devuelve el total de un count en Content-Range: "*/3" son 3 filas.
const counted = (total: number) =>
  new Response(null, { status: 200, headers: { "Content-Range": `*/${total}` } })

describe("columnsRepository", () => {
  const setup = (...replies: Parameters<typeof createFakeSupabase>) => {
    const { client, requests } = createFakeSupabase(...replies)
    return { repo: createColumnsRepository(client), requests }
  }

  it("listByProject mapea a camelCase", async () => {
    const { repo } = setup(json([columnRow]))

    await expect(repo.listByProject(PROJECT_ID)).resolves.toEqual([
      { id: COLUMN_ID, projectId: PROJECT_ID, title: "Pendiente", position: 2, category: "todo" },
    ])
  })

  it("create la coloca al final del tablero", async () => {
    const { repo, requests } = setup(counted(2), json(columnRow, 201))

    await repo.create({ projectId: PROJECT_ID, title: "Pendiente" })

    expect(requests[1]).toMatchObject({
      method: "POST",
      body: { project_id: PROJECT_ID, title: "Pendiente", category: "todo", position: 2 },
    })
  })

  it("create como hecha la inserta por hacer y hace el intercambio con la RPC", async () => {
    const { repo, requests } = setup(counted(2), json(columnRow, 201), noContent())

    const column = await repo.create({ projectId: PROJECT_ID, title: "Archivo", category: "done" })

    expect(requests[1]!.body).toMatchObject({ category: "todo" })
    expect(requests[2]!.url.pathname).toBe("/rest/v1/rpc/set_column_category")
    expect(requests[2]!.body).toEqual({ p_column_id: COLUMN_ID, p_category: "done" })
    expect(column.category).toBe("done")
  })

  it("reorder llama a la RPC con el orden completo", async () => {
    const { repo, requests } = setup(noContent())

    await repo.reorder(PROJECT_ID, ["c2", "c1"])

    expect(requests[0]!.url.pathname).toBe("/rest/v1/rpc/reorder_columns")
    expect(requests[0]!.body).toEqual({
      p_project_id: PROJECT_ID,
      p_ordered_column_ids: ["c2", "c1"],
    })
  })

  it("reorder traduce el rechazo a quien no es propietario", async () => {
    const { repo } = setup(json({ code: "42501", message: "Solo el propietario" }, 403))

    await expect(repo.reorder(PROJECT_ID, [])).rejects.toMatchObject({ code: "forbidden" })
  })

  it("setCategory llama a la RPC que mantiene una sola columna hecha", async () => {
    const { repo, requests } = setup(noContent())

    await repo.setCategory(COLUMN_ID, "done")

    expect(requests[0]!.url.pathname).toBe("/rest/v1/rpc/set_column_category")
    expect(requests[0]!.body).toEqual({ p_column_id: COLUMN_ID, p_category: "done" })
  })

  it("rechaza una categoría que no está en el contrato", async () => {
    const { repo } = setup(json([{ ...columnRow, category: "archivada" }]))

    await expect(repo.listByProject(PROJECT_ID)).rejects.toMatchObject({
      code: "invalid_response",
    })
  })

  it("rename lanza forbidden si la RLS no deja actualizar", async () => {
    const { repo } = setup(json([]))

    await expect(repo.rename(COLUMN_ID, "Hecho")).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("tasksRepository", () => {
  const setup = (...replies: Parameters<typeof createFakeSupabase>) => {
    const { client, requests } = createFakeSupabase(...replies)
    return { repo: createTasksRepository(client), requests }
  }

  it("listByProject mapea a camelCase", async () => {
    const { repo } = setup(json([taskRow()]))

    const [task] = await repo.listByProject(PROJECT_ID)

    expect(task).toEqual({
      id: TASK_ID,
      projectId: PROJECT_ID,
      columnId: COLUMN_ID,
      content: "Localizar exteriores",
      priority: "p1",
      size: "m",
      dueDate: "2026-11-02",
      position: 0,
      assigneeId: USER_ID,
    })
  })

  it("rechaza una prioridad que no está en el contrato", async () => {
    const { repo } = setup(json([taskRow({ priority: "urgente" })]))

    await expect(repo.listByProject(PROJECT_ID)).rejects.toMatchObject({
      code: "invalid_response",
    })
  })

  it("create la coloca al final de su columna y guarda la fecha vacía como null", async () => {
    const { repo, requests } = setup(counted(3), json(taskRow({ position: 3 }), 201))

    await repo.create({
      projectId: PROJECT_ID,
      columnId: COLUMN_ID,
      content: "Localizar exteriores",
      priority: "p1",
      size: "m",
      dueDate: "",
      assigneeId: null,
    })

    expect(requests[0]!.url.searchParams.get("column_id")).toBe(`eq.${COLUMN_ID}`)
    expect(requests[1]!.body).toMatchObject({ position: 3, due_date: null, assignee_id: null })
  })

  it("update solo envía los campos editables", async () => {
    const { repo, requests } = setup(json([{ id: TASK_ID }]))

    await repo.update(TASK_ID, {
      content: "Nuevo",
      priority: "p0",
      size: "s",
      dueDate: null,
      assigneeId: null,
    })

    expect(requests[0]!.body).toEqual({
      content: "Nuevo",
      priority: "p0",
      size: "s",
      due_date: null,
      assignee_id: null,
    })
  })

  it("move llama a la RPC con el orden de la columna de destino", async () => {
    const { repo, requests } = setup(noContent())

    await repo.move({ taskId: TASK_ID, toColumnId: COLUMN_ID, orderedTaskIds: [TASK_ID] })

    expect(requests[0]!.url.pathname).toBe("/rest/v1/rpc/move_task")
    expect(requests[0]!.body).toEqual({
      p_task_id: TASK_ID,
      p_to_column_id: COLUMN_ID,
      p_ordered_task_ids: [TASK_ID],
    })
  })

  it("move traduce una columna de otro proyecto a invalid_input", async () => {
    const { repo } = setup(json({ code: "22023", message: "La columna no es del proyecto" }, 400))

    await expect(
      repo.move({ taskId: TASK_ID, toColumnId: COLUMN_ID, orderedTaskIds: [] })
    ).rejects.toMatchObject({ code: "invalid_input" })
  })
})
