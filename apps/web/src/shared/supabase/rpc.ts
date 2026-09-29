import type { PostgrestError } from "@supabase/supabase-js"
import { supabase } from "./client"

/**
 * Llamadas a funciones de Postgres.
 *
 * El tipo `Database` de este proyecto está escrito a mano y no incluye los
 * metadatos de relaciones que genera el CLI. Declarar las funciones ahí activa
 * en supabase-js una inferencia más estricta que, sin esos metadatos, deja de
 * saber resolver los selects anidados y rompe consultas que hoy funcionan
 * —`useAnalytics`, entre otras—.
 *
 * Así que el cliente se destipa **una sola vez, aquí**, y cada función expone
 * su firma real. Cuando los tipos pasen a generarse desde la base (ya es
 * posible: `supabase gen types typescript --local`), esto se puede tirar y
 * llamar a `supabase.rpc` directamente.
 */
const untyped = supabase as unknown as {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: PostgrestError | null }>
}

export interface InvitationByToken {
  id: string
  project_id: string
  project_name: string
  email: string
  status: "pending" | "accepted"
  expires_at: string | null
}

/**
 * Lee una invitación por su token. Sustituye al `select` directo sobre
 * `project_invitations`, que exigía dejar la tabla abierta a cualquiera porque
 * quien abre el enlace todavía no es miembro del proyecto.
 */
export async function invitationByToken(
  token: string
): Promise<{ invitation: InvitationByToken | null; error: PostgrestError | null }> {
  const { data, error } = await untyped.rpc("invitation_by_token", { p_token: token })
  const rows = (data ?? []) as InvitationByToken[]
  return { invitation: rows[0] ?? null, error }
}

/**
 * Acepta una invitación y devuelve el proyecto al que da acceso. La comproba-
 * ción de que esté pendiente, sin caducar y dirigida a quien la acepta vive en
 * la función de Postgres, no aquí: es la única forma de que no se pueda saltar
 * desde la consola del navegador.
 */
export async function acceptInvitation(
  token: string
): Promise<{ projectId: string | null; error: PostgrestError | null }> {
  const { data, error } = await untyped.rpc("accept_invitation", { p_token: token })
  return { projectId: (data as string | null) ?? null, error }
}
