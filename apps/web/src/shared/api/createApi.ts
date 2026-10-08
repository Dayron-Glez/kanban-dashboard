import { createHttpApi, createHttpClient, type ApiClient } from "@repo/api-client"

// La API se sirve bajo /api del propio dominio y la sesión viaja en la cookie
// de better-auth: el navegador la manda sola en cada petición.
export const createApi = (): ApiClient => createHttpApi(createHttpClient({ baseUrl: "/api" }))
