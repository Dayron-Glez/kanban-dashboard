import { supabase } from "./client"

/**
 * Lee una invitación por su token. Sustituye al `select` directo sobre
 * `project_invitations`, que exigía dejar la tabla abierta a cualquiera porque
 * quien abre el enlace todavía no es miembro del proyecto.
 */
export async function invitationByToken(token: string) {
  const { data, error } = await supabase.rpc("invitation_by_token", { p_token: token })
  return { invitation: data?.[0] ?? null, error }
}

/**
 * Acepta una invitación y devuelve el proyecto al que da acceso. La comproba-
 * ción de que esté pendiente, sin caducar y dirigida a quien la acepta vive en
 * la función de Postgres, no aquí: es la única forma de que no se pueda saltar
 * desde la consola del navegador.
 */
export async function acceptInvitation(token: string) {
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token })
  return { projectId: data ?? null, error }
}
