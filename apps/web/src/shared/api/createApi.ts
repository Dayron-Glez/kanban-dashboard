import {
  createHttpApi,
  createHttpClient,
  createSupabaseApi,
  type ApiClient,
} from "@repo/api-client"
import { supabase } from "@/shared/supabase"

const apiUrl = import.meta.env.VITE_API_URL as string | undefined

// Mientras dura la migración a la API propia: con VITE_API_URL, proyectos,
// miembros e invitaciones van a ella y el tablero sigue en Supabase. Sin ella,
// todo va a Supabase, que es también la vuelta atrás.
export const createApi = (): ApiClient => {
  const supabaseApi = createSupabaseApi(supabase)
  if (!apiUrl) return supabaseApi

  const http = createHttpClient({
    baseUrl: apiUrl,
    // getSession renueva el token si ha caducado antes de devolverlo.
    getAccessToken: async () =>
      (await supabase.auth.getSession()).data.session?.access_token ?? null,
  })
  return { ...supabaseApi, ...createHttpApi(http) }
}
