import type { SupabaseClient } from "@supabase/supabase-js"
import type { ApiClient } from "../ApiClient"
import type { Database } from "./database.types"
import { createProjectsRepository } from "./projectsRepository"

export const createSupabaseApi = (client: SupabaseClient<Database>): ApiClient => ({
  projects: createProjectsRepository(client),
})
