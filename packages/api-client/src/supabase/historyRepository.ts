import type { SupabaseClient } from "@supabase/supabase-js"
import { TaskHistoryEntrySchema } from "@repo/contracts"
import type { HistoryRepository } from "../ApiClient"
import type { Database } from "./database.types"
import { parseWith, unwrap } from "./result"

export const createHistoryRepository = (client: SupabaseClient<Database>): HistoryRepository => ({
  // task_history no guarda el proyecto: se filtra por el de la tarea, con un
  // join interno para que el filtro lo haga la base y no el navegador.
  listByProject: async (projectId) => {
    const rows = unwrap(
      await client
        .from("task_history")
        .select("id, task_id, from_column_id, to_column_id, moved_at, task:tasks!inner(content)")
        .eq("task.project_id", projectId)
        .order("moved_at", { ascending: false })
    )

    return rows.map((row) =>
      parseWith(TaskHistoryEntrySchema, {
        id: row.id,
        taskId: row.task_id,
        taskContent: row.task.content,
        fromColumnId: row.from_column_id,
        toColumnId: row.to_column_id,
        movedAt: row.moved_at,
      })
    )
  },
})
