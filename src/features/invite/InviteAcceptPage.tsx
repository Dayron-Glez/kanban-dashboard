import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { IconLoader2 } from "@tabler/icons-react"
import { acceptInvitation, invitationByToken } from "@/shared/supabase"
import { useAuth } from "@/features/auth"
import { Button } from "@/shared"

type InviteState =
  | "loading"
  | "not-authenticated"
  | "accepting"
  | "invalid"
  | "expired"
  | "email-mismatch"
  | "error"

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<InviteState>("loading")
  const [message, setMessage] = useState<string>("")

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

      // La lectura pasa por una función de Postgres: la tabla de invitaciones
      // ya no es legible directamente, porque para permitir este caso —quien
      // abre el enlace aún no es miembro— había que dejarla abierta a
      // cualquiera, con sus tokens y correos dentro.
      const { invitation } = await invitationByToken(token)

      if (!invitation) {
        setState("invalid")
        setMessage("El enlace de invitación no existe.")
        return
      }

      if (invitation.status !== "pending") {
        setState("invalid")
        setMessage("Esta invitación ya fue utilizada.")
        return
      }

      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        setState("expired")
        setMessage(
          "Esta invitación ha expirado. Pide al dueño del proyecto que te envíe una nueva."
        )
        return
      }

      // Se avisa antes de intentarlo para dar un mensaje claro, pero quien
      // decide es la base: aceptar una invitación ajena está denegado ahí.
      if (invitation.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
        setState("email-mismatch")
        setMessage(
          `La invitación se envió a ${invitation.email} y has entrado como ${user.email}. Inicia sesión con la cuenta invitada para aceptarla.`
        )
        return
      }

      const { projectId, error } = await acceptInvitation(token)

      if (error || !projectId) {
        setState("error")
        setMessage("Ocurrió un error al aceptar la invitación. Inténtalo de nuevo.")
        return
      }

      navigate(`/projects/${projectId}`)
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
              <h1 className="text-primary mb-2 text-xl font-semibold">
                La invitación es para otra cuenta
              </h1>
              <p className="text-muted-foreground text-sm">{message}</p>
            </div>
            <Button onClick={handleLoginRedirect} className="w-full">
              Entrar con otra cuenta
            </Button>
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
