import type { SupabaseClient } from "@supabase/supabase-js"
import { ProjectSchema, ProjectSummarySchema } from "@repo/contracts"
import type { ProjectsRepository } from "../ApiClient"
import type { Database, Tables } from "./database.types"
import { parseWith, requireRows, unwrap } from "./result"
import { currentUserId } from "./session"

const DEFAULT_COLUMNS = ["Backlog", "Ready", "In Progress", "In Review", "Done"]

const toProjectShape = (row: Tables<"projects">) => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  description: row.description,
  color: row.color,
  createdAt: row.created_at,
})

export const createProjectsRepository = (client: SupabaseClient<Database>): ProjectsRepository => ({
  listMine: async () => {
    const userId = await currentUserId(client)
    const rows = unwrap(
      await client
        .from("project_members")
        .select("role, is_favorite, project:projects(*, tasks(count))")
        .eq("user_id", userId)
    )

    return rows
      .map(({ role, is_favorite, project }) =>
        parseWith(ProjectSummarySchema, {
          ...toProjectShape(project),
          role,
          isFavorite: is_favorite,
          taskCount: project.tasks[0]?.count ?? 0,
        })
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  create: async (input) => {
    const ownerId = await currentUserId(client)
    // La membresía de propietario la crea el trigger on_project_created.
    const row = unwrap(
      await client
        .from("projects")
        .insert({
          owner_id: ownerId,
          name: input.name,
          // Un campo de formulario vacío llega como "": se guarda como ausencia.
          description: input.description || null,
          color: input.color,
        })
        .select()
        .single()
    )

    const columns = await client
      .from("columns")
      .insert(DEFAULT_COLUMNS.map((title, position) => ({ project_id: row.id, title, position })))
      .select("id")

    if (columns.error) {
      // Sin esto, reintentar crearía un segundo proyecto y dejaría el primero sin columnas.
      await client.from("projects").delete().eq("id", row.id)
      unwrap(columns)
    }

    return parseWith(ProjectSchema, toProjectShape(row))
  },

  rename: async (id, name) => {
    requireRows(unwrap(await client.from("projects").update({ name }).eq("id", id).select("id")))
  },

  remove: async (id) => {
    requireRows(unwrap(await client.from("projects").delete().eq("id", id).select("id")))
  },

  setFavorite: async (projectId, isFavorite) => {
    const userId = await currentUserId(client)
    requireRows(
      unwrap(
        await client
          .from("project_members")
          .update({ is_favorite: isFavorite })
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .select("id")
      )
    )
  },
})
