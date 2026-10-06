import { createClient } from "@supabase/supabase-js"
import { vi } from "vitest"
import type { Database } from "../supabase/database.types"

export const USER_ID = "2b7e1c4a-9f3d-4e8a-b5c6-1d2e3f4a5b6c"

export interface RecordedRequest {
  method: string
  url: URL
  body: unknown
}

type Reply = Response | Error

export const noContent = () => new Response(null, { status: 204 })

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

/**
 * Cliente de supabase-js real con un fetch falso: se prueba el constructor de
 * consultas de verdad sin levantar la base. Las respuestas se consumen en orden.
 */
export const createFakeSupabase = (...replies: Reply[]) => {
  const requests: RecordedRequest[] = []
  const queue = [...replies]

  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof init?.body === "string" ? init.body : undefined
    requests.push({
      method: init?.method ?? "GET",
      url: new URL(input instanceof Request ? input.url : input),
      body: raw ? JSON.parse(raw) : undefined,
    })
    const reply = queue.shift()
    if (!reply) throw new Error("El test no preparó respuesta para esta petición")
    if (reply instanceof Error) throw reply
    return reply
  }

  const client = createClient<Database>("http://supabase.test", "anon-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
    // Igual que en la app: los reintentos son cosa de TanStack Query.
    db: { retry: false },
  })

  vi.spyOn(client.auth, "getSession").mockResolvedValue({
    data: { session: { user: { id: USER_ID } } },
    error: null,
  } as Awaited<ReturnType<typeof client.auth.getSession>>)

  return { client, requests }
}
