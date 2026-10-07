import type { SupabaseClient } from "@supabase/supabase-js"
import { ColumnSchema } from "@repo/contracts"
import type { ColumnsRepository } from "../ApiClient"
import type { Database, Tables } from "./database.types"
import { check, parseWith, requireRows, unwrap } from "./result"

const toColumn = (row: Tables<"columns">) =>
  parseWith(ColumnSchema, {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    position: row.position,
  })

export const createColumnsRepository = (client: SupabaseClient<Database>): ColumnsRepository => ({
  listByProject: async (projectId) => {
    const rows = unwrap(
      await client.from("columns").select().eq("project_id", projectId).order("position")
    )
    return rows.map(toColumn)
  },

  create: async ({ projectId, title }) => {
    const existing = await client
      .from("columns")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
    check(existing)

    const row = unwrap(
      await client
        .from("columns")
        .insert({ project_id: projectId, title, position: existing.count ?? 0 })
        .select()
        .single()
    )
    return toColumn(row)
  },

  rename: async (id, title) => {
    requireRows(unwrap(await client.from("columns").update({ title }).eq("id", id).select("id")))
  },

  remove: async (id) => {
    requireRows(unwrap(await client.from("columns").delete().eq("id", id).select("id")))
  },

  reorder: async (projectId, orderedColumnIds) => {
    check(
      await client.rpc("reorder_columns", {
        p_project_id: projectId,
        p_ordered_column_ids: orderedColumnIds,
      })
    )
  },
})
