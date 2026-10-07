import {
  createHttpApi,
  createHttpClient,
  createSupabaseApi,
  type ApiClient,
} from "@repo/api-client"
import { supabase } from "@/shared/supabase"

const apiUrl = import.meta.env.VITE_API_URL as string | undefined

// Con VITE_API_URL, los datos van a la API propia y de Supabase solo queda la
// sesión. Sin ella, todo va a Supabase como antes: la vuelta atrás, hasta que
// better-auth (4.2) retire supabase-js de la web.
export const createApi = (): ApiClient => {
  if (!apiUrl) return createSupabaseApi(supabase)

  return createHttpApi(
    createHttpClient({
      baseUrl: apiUrl,
      // getSession renueva el token si ha caducado antes de devolverlo.
      getAccessToken: async () =>
        (await supabase.auth.getSession()).data.session?.access_token ?? null,
    })
  )
}
