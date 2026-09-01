import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { IconLoader2 } from "@tabler/icons-react"
import { supabase } from "@/shared/supabase"
import { useAuth } from "@/features/auth"
import { Button } from "@/shared"

type InviteState =
  | "loading"
  | "not-authenticated"
  | "accepting"
  | "invalid"
  | "expired"
  | "already-member"
  | "email-mismatch"
  | "error"

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<InviteState>("loading")
  const [message, setMessage] = useState<string>("")

  const doAccept = async (invitationId: string, projectId: string) => {
    setState("accepting")

    // Verificar si ya es miembro (sin .single() para evitar 406 cuando no hay filas)
    const { data: existingRows } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user!.id)

    if (existingRows && existingRows.length > 0) {
      // Ya es miembro — limpiar la invitación si aún quedó pendiente
      await supabase
        .from("project_invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId)
      setState("already-member")
      setTimeout(() => navigate(`/projects/${projectId}`), 1500)
      return
    }

    const [{ error: memberError }, { error: inviteError }] = await Promise.all([
      supabase.from("project_members").insert({
        project_id: projectId,
        user_id: user!.id,
        role: "member",
      }),
      supabase.from("project_invitations").update({ status: "accepted" }).eq("id", invitationId),
    ])

    if (memberError || inviteError) {
      // 23505 = unique_violation: el usuario ya es miembro (intento duplicado)
      if (memberError?.code === "23505") {
        // Ya es miembro — limpiar la invitación si aún quedó pendiente
        await supabase
          .from("project_invitations")
          .update({ status: "accepted" })
          .eq("id", invitationId)
        setState("already-member")
        setTimeout(() => navigate(`/projects/${projectId}`), 1500)
        return
      }
      setState("error")
      setMessage("Ocurrió un error al aceptar la invitación. Inténtalo de nuevo.")
      return
    }

    navigate(`/projects/${projectId}`)
  }

  useEffect(() => {
    const run = async () => {
      if (authLoading) return

      if (!user) {
        setState("not-authenticated")
        return
      }

      if (!token) {
        setState("invalid")
        setMessage("El enlace de invitación no es válido.")
        return
      }

      setState("accepting")

      const { data: invitation, error } = await supabase
        .from("project_invitations")
        .select("*")
        .eq("token", token)
        .single()

      if (error || !invitation) {
        setState("invalid")
        setMessage("El enlace de invitación no existe o ha expirado.")
        return
      }

      if (invitation.status !== "pending") {
        setState("invalid")
        setMessage("Esta invitación ya fue utilizada.")
        return
      }

      if (new Date(invitation.expires_at) < new Date()) {
        setState("expired")
        setMessage(
          "Esta invitación ha expirado. Pide al dueño del proyecto que te envíe una nueva."
        )
        return
      }

      if (invitation.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
        setMessage(
          `La invitación fue enviada a ${invitation.email}, pero estás autenticado como ${user.email}. Puedes continuar de todas formas.`
        )
        setState("email-mismatch")
        return
      }

      await doAccept(invitation.id, invitation.project_id)
    }

    run()
  }, [authLoading, user, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginRedirect = () => {
    navigate(`/login?redirect=/invite/${token}`)
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="bg-card flex w-full max-w-md flex-col items-center gap-6 rounded-xl p-8 text-center shadow-lg">
        {(state === "loading" || state === "accepting") && (
          <>
            <IconLoader2 size={48} className="text-primary animate-spin" />
            <p className="text-muted-foreground">
              {state === "loading" ? "Verificando invitación…" : "Aceptando invitación…"}
            </p>
          </>
        )}

        {state === "not-authenticated" && (
          <>
            <div className="text-4xl">👋</div>
            <div>
              <h1 className="text-primary mb-2 text-xl font-semibold">
                Te han invitado a un proyecto
              </h1>
              <p className="text-muted-foreground text-sm">
                Inicia sesión o crea una cuenta para aceptar la invitación.
              </p>
            </div>
            <Button onClick={handleLoginRedirect} className="w-full">
              Iniciar sesión
            </Button>
          </>
        )}

        {state === "email-mismatch" && (
          <>
            <div className="text-4xl">⚠️</div>
            <div>
              <h1 className="text-primary mb-2 text-xl font-semibold">Email diferente</h1>
              <p className="text-muted-foreground text-sm">{message}</p>
            </div>
            <Button
              onClick={async () => {
                const { data: invitation } = await supabase
                  .from("project_invitations")
                  .select("id, project_id")
                  .eq("token", token!)
                  .single()
                if (invitation) await doAccept(invitation.id, invitation.project_id)
              }}
              className="w-full"
            >
              Continuar de todas formas
            </Button>
          </>
        )}

        {state === "already-member" && (
          <>
            <div className="text-4xl">✅</div>
            <p className="text-muted-foreground">Ya eres miembro de este proyecto. Redirigiendo…</p>
          </>
        )}

        {(state === "invalid" || state === "expired" || state === "error") && (
          <>
            <div className="text-4xl">{state === "expired" ? "⏰" : "❌"}</div>
            <div>
              <h1 className="text-primary mb-2 text-xl font-semibold">
                {state === "expired" ? "Invitación expirada" : "Invitación no válida"}
              </h1>
              <p className="text-muted-foreground text-sm">{message}</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/projects")} className="w-full">
              Ir a mis proyectos
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
