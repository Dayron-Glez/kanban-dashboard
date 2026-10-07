import type { ReactNode } from "react"
import { useNavigate, useParams } from "react-router"
import { IconLoader2 } from "@tabler/icons-react"
import type { User } from "@supabase/supabase-js"
import type { InvitationPreview } from "@repo/contracts"
import { useAuth } from "@/features/auth"
import { Button } from "@/shared"
import { errorMessage } from "@/shared/api"
import { useAcceptInvitation, useInvitationPreview } from "./api/invitation"

type InviteView =
  | { kind: "loading" }
  | { kind: "login" }
  | { kind: "ready"; invitation: InvitationPreview }
  | { kind: "mismatch"; message: string }
  | { kind: "invalid" | "expired"; message: string }
  | { kind: "error"; error: unknown }

interface ResolveViewInput {
  token: string | undefined
  user: User | null
  authLoading: boolean
  isPending: boolean
  error: unknown
  invitation: InvitationPreview | null | undefined
}

const isExpired = (iso: string) => new Date(iso).getTime() <= Date.now()

// Los avisos son para dar un mensaje claro antes de intentarlo, pero quien
// decide es accept_invitation en la base.
const resolveView = ({
  token,
  user,
  authLoading,
  isPending,
  error,
  invitation,
}: ResolveViewInput): InviteView => {
  if (authLoading) return { kind: "loading" }
  if (!user) return { kind: "login" }
  if (!token) return { kind: "invalid", message: "El enlace de invitación no es válido." }
  if (error) return { kind: "error", error }
  if (isPending) return { kind: "loading" }
  if (!invitation) return { kind: "invalid", message: "El enlace de invitación no existe." }
  if (invitation.status !== "pending") {
    return { kind: "invalid", message: "Esta invitación ya fue utilizada." }
  }
  if (isExpired(invitation.expiresAt)) {
    return {
      kind: "expired",
      message: "Esta invitación ha expirado. Pide al dueño del proyecto que te envíe una nueva.",
    }
  }
  if (invitation.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return {
      kind: "mismatch",
      message: `La invitación se envió a ${invitation.email} y has entrado como ${user.email}. Inicia sesión con la cuenta invitada para aceptarla.`,
    }
  }
  return { kind: "ready", invitation }
}

interface InviteCardProps {
  icon: ReactNode
  title?: string
  message: string
  children?: ReactNode
}

function InviteCard({ icon, title, message, children }: Readonly<InviteCardProps>) {
  return (
    <>
      {icon}
      <div>
        {title && <h1 className="text-primary mb-2 text-xl font-semibold">{title}</h1>}
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
      {children}
    </>
  )
}

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const preview = useInvitationPreview(token, Boolean(user))
  const accept = useAcceptInvitation()

  const view = resolveView({
    token,
    user,
    authLoading,
    isPending: preview.isPending,
    error: preview.error,
    invitation: preview.data,
  })

  const goToLogin = () => navigate(`/login?redirect=/invite/${token}`)

  const handleAccept = () => {
    if (!token) return
    accept.mutate(token, { onSuccess: (projectId) => navigate(`/projects/${projectId}`) })
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="bg-card flex w-full max-w-md flex-col items-center gap-6 rounded-xl p-8 text-center shadow-lg">
        {view.kind === "loading" && (
          <InviteCard
            icon={<IconLoader2 size={48} className="text-primary animate-spin" />}
            message="Verificando invitación…"
          />
        )}

        {view.kind === "login" && (
          <InviteCard
            icon={<div className="text-4xl">👋</div>}
            title="Te han invitado a un proyecto"
            message="Inicia sesión o crea una cuenta para aceptar la invitación."
          >
            <Button onClick={goToLogin} className="w-full">
              Iniciar sesión
            </Button>
          </InviteCard>
        )}

        {view.kind === "ready" && (
          <InviteCard
            icon={<div className="text-4xl">✉️</div>}
            title={`Te han invitado a «${view.invitation.projectName}»`}
            message={`Entrarás como miembro con ${user?.email}.`}
          >
            <Button onClick={handleAccept} disabled={accept.isPending} className="w-full">
              {accept.isPending ? "Uniéndote…" : "Unirme al proyecto"}
            </Button>
          </InviteCard>
        )}

        {view.kind === "mismatch" && (
          <InviteCard
            icon={<div className="text-4xl">⚠️</div>}
            title="La invitación es para otra cuenta"
            message={view.message}
          >
            <Button onClick={goToLogin} className="w-full">
              Entrar con otra cuenta
            </Button>
          </InviteCard>
        )}

        {(view.kind === "invalid" || view.kind === "expired") && (
          <InviteCard
            icon={<div className="text-4xl">{view.kind === "expired" ? "⏰" : "❌"}</div>}
            title={view.kind === "expired" ? "Invitación expirada" : "Invitación no válida"}
            message={view.message}
          >
            <Button variant="outline" onClick={() => navigate("/projects")} className="w-full">
              Ir a mis proyectos
            </Button>
          </InviteCard>
        )}

        {view.kind === "error" && (
          <InviteCard
            icon={<div className="text-4xl">❌</div>}
            title="No se pudo cargar la invitación"
            message={errorMessage(view.error)}
          >
            <Button variant="outline" onClick={() => preview.refetch()} className="w-full">
              Reintentar
            </Button>
          </InviteCard>
        )}
      </div>
    </div>
  )
}
