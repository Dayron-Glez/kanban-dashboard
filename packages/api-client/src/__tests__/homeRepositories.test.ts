import { describe, expect, it } from "vitest"
import { createHistoryRepository } from "../supabase/historyRepository"
import { createTasksRepository } from "../supabase/tasksRepository"
import { createFakeSupabase, json, USER_ID } from "./fakeSupabase"

const PROJECT_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"
const TASK_ID = "9b2f4c1e-3d5a-4b6c-8d7e-0f1a2b3c4d5e"
const FROM_ID = "550e8400-e29b-41d4-a716-446655440000"
const TO_ID = "2b7e1c4a-9f3d-4e8a-b5c6-1d2e3f4a5b6d"

describe("tasksRepository.listAssignedToMe", () => {
  it("pide las tareas asignadas al usuario con su proyecto y su columna", async () => {
    const { client, requests } = createFakeSupabase(
      json([
        {
          id: TASK_ID,
          project_id: PROJECT_ID,
          content: "Localizar exteriores",
          priority: "p0",
          size: "l",
          project: { name: "Largometraje", color: "#6366f1" },
          column: { title: "En curso" },
        },
      ])
    )

    const tasks = await createTasksRepository(client).listAssignedToMe()

    const { url } = requests[0]!
    expect(url.searchParams.get("assignee_id")).toBe(`eq.${USER_ID}`)
    expect(url.searchParams.get("select")).toBe(
      "id,project_id,content,priority,size,project:projects(name,color),column:columns(title)"
    )
    expect(tasks).toEqual([
      {
        id: TASK_ID,
        projectId: PROJECT_ID,
        content: "Localizar exteriores",
        priority: "p0",
        size: "l",
        projectName: "Largometraje",
        projectColor: "#6366f1",
        columnTitle: "En curso",
      },
    ])
  })
})

describe("historyRepository.listByProject", () => {
  it("filtra por proyecto en la consulta, con un join interno", async () => {
    const { client, requests } = createFakeSupabase(
      json([
        {
          id: FROM_ID,
          task_id: TASK_ID,
          from_column_id: null,
          to_column_id: TO_ID,
          moved_at: "2026-10-07T12:12:40.480778+00:00",
          task: { content: "Localizar exteriores" },
        },
      ])
    )

    const history = await createHistoryRepository(client).listByProject(PROJECT_ID)

    const { url } = requests[0]!
    expect(url.pathname).toBe("/rest/v1/task_history")
    expect(url.searchParams.get("task.project_id")).toBe(`eq.${PROJECT_ID}`)
    expect(url.searchParams.get("select")).toContain("task:tasks!inner(content)")
    expect(url.searchParams.get("order")).toBe("moved_at.desc")
    expect(history).toEqual([
      {
        id: FROM_ID,
        taskId: TASK_ID,
        taskContent: "Localizar exteriores",
        fromColumnId: null,
        toColumnId: TO_ID,
        movedAt: "2026-10-07T12:12:40.480778+00:00",
      },
    ])
  })
})
