import type { SupabaseClient } from "@supabase/supabase-js"
import { AssignedTaskSchema, TaskSchema, type TaskInput } from "@repo/contracts"
import type { TasksRepository } from "../ApiClient"
import type { Database, Tables } from "./database.types"
import { check, parseWith, requireRows, unwrap } from "./result"
import { currentUserId } from "./session"

const toTask = (row: Tables<"tasks">) =>
  parseWith(TaskSchema, {
    id: row.id,
    projectId: row.project_id,
    columnId: row.column_id,
    content: row.content,
    priority: row.priority,
    size: row.size,
    dueDate: row.due_date,
    position: row.position,
    assigneeId: row.assignee_id,
  })

// Una fecha vacía del formulario llega como "": se guarda como ausencia.
const toRow = (input: TaskInput) => ({
  content: input.content,
  priority: input.priority,
  size: input.size,
  due_date: input.dueDate || null,
  assignee_id: input.assigneeId,
})

export const createTasksRepository = (client: SupabaseClient<Database>): TasksRepository => ({
  listByProject: async (projectId) => {
    const rows = unwrap(
      await client.from("tasks").select().eq("project_id", projectId).order("position")
    )
    return rows.map(toTask)
  },

  listAssignedToMe: async () => {
    const userId = await currentUserId(client)
    const rows = unwrap(
      await client
        .from("tasks")
        .select(
          "id, project_id, content, priority, size, project:projects(name, color), column:columns!inner(title, category)"
        )
        .eq("assignee_id", userId)
        .neq("column.category", "done")
    )
    return rows.map((row) =>
      parseWith(AssignedTaskSchema, {
        id: row.id,
        projectId: row.project_id,
        content: row.content,
        priority: row.priority,
        size: row.size,
        projectName: row.project.name,
        projectColor: row.project.color,
        columnTitle: row.column.title,
      })
    )
  },

  create: async ({ projectId, columnId, ...input }) => {
    const existing = await client
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("column_id", columnId)
    check(existing)

    const row = unwrap(
      await client
        .from("tasks")
        .insert({
          ...toRow(input),
          project_id: projectId,
          column_id: columnId,
          position: existing.count ?? 0,
        })
        .select()
        .single()
    )
    return toTask(row)
  },

  update: async (id, input) => {
    requireRows(unwrap(await client.from("tasks").update(toRow(input)).eq("id", id).select("id")))
  },

  remove: async (id) => {
    requireRows(unwrap(await client.from("tasks").delete().eq("id", id).select("id")))
  },

  move: async ({ taskId, toColumnId, orderedTaskIds }) => {
    check(
      await client.rpc("move_task", {
        p_task_id: taskId,
        p_to_column_id: toColumnId,
        p_ordered_task_ids: orderedTaskIds,
      })
    )
  },
})
