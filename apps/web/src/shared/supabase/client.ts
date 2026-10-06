import { createClient } from "@supabase/supabase-js"
import type { Database } from "@repo/api-client"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  // Los reintentos los decide TanStack Query; con los dos activos se multiplican.
  db: { retry: false },
})
