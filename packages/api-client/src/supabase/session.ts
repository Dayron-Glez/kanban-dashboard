import type { SupabaseClient } from "@supabase/supabase-js"
import { ApiError } from "../errors"
import type { Database } from "./database.types"

export const currentUserId = async (client: SupabaseClient<Database>): Promise<string> => {
  const { data } = await client.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) throw new ApiError("unauthorized", "No hay ninguna sesión iniciada")
  return userId
}
