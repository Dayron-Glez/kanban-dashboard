import type { SupabaseClient } from "@supabase/supabase-js"
import { InvitationPreviewSchema, InvitationSchema } from "@repo/contracts"
import type { InvitationsRepository } from "../ApiClient"
import type { Database, Tables } from "./database.types"
import { parseWith, requireRows, unwrap } from "./result"

const toInvitation = (row: Tables<"project_invitations">) =>
  parseWith(InvitationSchema, {
    id: row.id,
    projectId: row.project_id,
    email: row.email,
    token: row.token,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  })

export const createInvitationsRepository = (
  client: SupabaseClient<Database>
): InvitationsRepository => ({
  listPending: async (projectId) => {
    const rows = unwrap(
      await client
        .from("project_invitations")
        .select()
        .eq("project_id", projectId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
    )
    return rows.map(toInvitation)
  },

  // Token y caducidad (7 días) los pone la base por defecto.
  create: async ({ projectId, email }) => {
    const row = unwrap(
      await client
        .from("project_invitations")
        .insert({ project_id: projectId, email })
        .select()
        .single()
    )
    return toInvitation(row)
  },

  cancel: async (id) => {
    requireRows(unwrap(await client.from("project_invitations").delete().eq("id", id).select("id")))
  },

  findByToken: async (token) => {
    const [row] = unwrap(await client.rpc("invitation_by_token", { p_token: token }))
    if (!row) return null
    return parseWith(InvitationPreviewSchema, {
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      email: row.email,
      status: row.status,
      expiresAt: row.expires_at,
    })
  },

  accept: async (token) => unwrap(await client.rpc("accept_invitation", { p_token: token })),
})
