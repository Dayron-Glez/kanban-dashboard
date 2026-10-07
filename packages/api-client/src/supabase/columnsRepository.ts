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
    category: row.category,
  })

export const createColumnsRepository = (client: SupabaseClient<Database>): ColumnsRepository => ({
  listByProject: async (projectId) => {
    const rows = unwrap(
      await client.from("columns").select().eq("project_id", projectId).order("position")
    )
    return rows.map(toColumn)
  },

  create: async ({ projectId, title, category = "todo" }) => {
    const existing = await client
      .from("columns")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
    check(existing)

    // Insertarla ya como «done» chocaría con el índice único si hay otra: se
    // crea como «todo» y la RPC hace el intercambio en una transacción.
    const row = unwrap(
      await client
        .from("columns")
        .insert({
          project_id: projectId,
          title,
          category: category === "done" ? "todo" : category,
          position: existing.count ?? 0,
        })
        .select()
        .single()
    )
    if (category !== "done") return toColumn(row)

    check(await client.rpc("set_column_category", { p_column_id: row.id, p_category: "done" }))
    return toColumn({ ...row, category: "done" })
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

  setCategory: async (id, category) => {
    check(await client.rpc("set_column_category", { p_column_id: id, p_category: category }))
  },
})
