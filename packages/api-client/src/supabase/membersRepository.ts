import type { SupabaseClient } from "@supabase/supabase-js"
import { ProjectMemberSchema } from "@repo/contracts"
import type { MembersRepository } from "../ApiClient"
import type { Database } from "./database.types"
import { parseWith, requireRows, unwrap } from "./result"

export const createMembersRepository = (client: SupabaseClient<Database>): MembersRepository => ({
  listByProject: async (projectId) => {
    const rows = unwrap(
      await client
        .from("project_members")
        .select("id, project_id, user_id, role, joined_at, profile:profiles(*)")
        .eq("project_id", projectId)
        .order("joined_at")
    )

    return rows.map((row) =>
      parseWith(ProjectMemberSchema, {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        role: row.role,
        joinedAt: row.joined_at,
        profile: {
          id: row.profile.id,
          fullName: row.profile.full_name,
          email: row.profile.email,
          avatarUrl: row.profile.avatar_url,
        },
      })
    )
  },

  remove: async (memberId) => {
    requireRows(
      unwrap(await client.from("project_members").delete().eq("id", memberId).select("id"))
    )
  },
})
