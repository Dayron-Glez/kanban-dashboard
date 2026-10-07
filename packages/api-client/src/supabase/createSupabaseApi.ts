import type { SupabaseClient } from "@supabase/supabase-js"
import type { ApiClient } from "../ApiClient"
import { createColumnsRepository } from "./columnsRepository"
import type { Database } from "./database.types"
import { createHistoryRepository } from "./historyRepository"
import { createInvitationsRepository } from "./invitationsRepository"
import { createMembersRepository } from "./membersRepository"
import { createProjectsRepository } from "./projectsRepository"
import { createTasksRepository } from "./tasksRepository"

export const createSupabaseApi = (client: SupabaseClient<Database>): ApiClient => ({
  projects: createProjectsRepository(client),
  members: createMembersRepository(client),
  invitations: createInvitationsRepository(client),
  columns: createColumnsRepository(client),
  tasks: createTasksRepository(client),
  history: createHistoryRepository(client),
})
