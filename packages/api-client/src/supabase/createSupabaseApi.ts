import type { SupabaseClient } from "@supabase/supabase-js"
import type { ApiClient } from "../ApiClient"
import type { Database } from "./database.types"
import { createInvitationsRepository } from "./invitationsRepository"
import { createMembersRepository } from "./membersRepository"
import { createProjectsRepository } from "./projectsRepository"

export const createSupabaseApi = (client: SupabaseClient<Database>): ApiClient => ({
  projects: createProjectsRepository(client),
  members: createMembersRepository(client),
  invitations: createInvitationsRepository(client),
})
