import { useState } from "react"
import { useParams } from "react-router"
import {
  IconCheck,
  IconCopy,
  IconLink,
  IconMail,
  IconSettings,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Separator,
} from "@/shared/index"
import { useKanban } from "@/features/board/index"
import { useProjectMembers } from "../hooks/useProjectMembers"
import type { MemberRole } from "@/shared/supabase"

const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-600",
  "bg-violet-500/15 text-violet-600",
  "bg-emerald-500/15 text-emerald-600",
  "bg-amber-500/15 text-amber-600",
  "bg-rose-500/15 text-rose-600",
  "bg-cyan-500/15 text-cyan-600",
]

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const getAvatarColor = (userId: string): string => {
  const idx = userId.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

const RoleBadge = ({ role }: { role: MemberRole }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      role === "owner"
        ? "bg-primary/10 text-primary"
        : "bg-muted text-muted-foreground"
    }`}
  >
    {role === "owner" ? "Propietario" : "Miembro"}
  </span>
)

export function ProjectSettingsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { userRole } = useKanban()
  const isOwner = userRole === "owner"

  const { members, invitations, loading, inviteMember, cancelInvitation, removeMember } =
    useProjectMembers(projectId ?? "")

  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const handleInvite = async () => {
    if (!email.trim()) return
    setInviting(true)
    const result = await inviteMember(email.trim())
    setInviting(false)
    if (result) {
      setInviteLink(`${window.location.origin}/invite/${result.token}`)
      setEmail("")
    }
  }

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedToken(link)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl w-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 pb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <IconSettings size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary leading-tight">Ajustes del proyecto</h1>
          <p className="text-sm text-muted-foreground">Gestiona los miembros y las invitaciones.</p>
        </div>
      </div>

      {/* ── Miembros actuales ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <IconUsers size={16} className="text-muted-foreground" />
            <span className="font-semibold text-sm">
              Miembros{" "}
              <span className="text-muted-foreground font-normal">({members.length})</span>
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin miembros aún.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div
                    className={`h-10 w-10 rounded-full text-sm flex items-center justify-center font-bold shrink-0 ${getAvatarColor(m.user_id)}`}
                  >
                    {getInitials(m.profiles?.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium leading-tight">
                        {m.profiles?.full_name ?? "Sin nombre"}
                      </p>
                      <RoleBadge role={m.role} />
                    </div>
                    {m.profiles?.email && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <IconMail size={11} />
                        {m.profiles.email}
                      </p>
                    )}
                  </div>
                  {isOwner && m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeMember(m.id)}
                      title="Eliminar miembro"
                    >
                      <IconUserMinus size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Invitar miembro (solo owner) ── */}
      {isOwner && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <IconUserPlus size={16} className="text-muted-foreground" />
                <span className="font-semibold text-sm">Invitar miembro</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="invite-email" className="sr-only">
                    Email del invitado
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleInvite()
                    }}
                  />
                </div>
                <Button onClick={handleInvite} disabled={inviting || !email.trim()}>
                  {inviting ? "Enviando…" : "Invitar"}
                </Button>
              </div>

              {inviteLink && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <IconLink size={12} />
                      Comparte este enlace con el invitado (válido 7 días)
                    </p>
                    <Button
                      variant="outline"
                      className="w-full gap-2 font-normal"
                      onClick={() => handleCopy(inviteLink)}
                    >
                      {copiedToken === inviteLink ? (
                        <>
                          <IconCheck size={15} className="text-emerald-500 shrink-0" />
                          <span className="text-emerald-600">¡Enlace copiado!</span>
                        </>
                      ) : (
                        <>
                          <IconCopy size={15} className="shrink-0" />
                          <span className="truncate text-left">{inviteLink}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Invitaciones pendientes ── */}
          {invitations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <IconMail size={16} className="text-muted-foreground" />
                  <span className="font-semibold text-sm">
                    Invitaciones pendientes{" "}
                    <span className="text-muted-foreground font-normal">({invitations.length})</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col divide-y divide-border">
                  {invitations.map((inv) => {
                    const link = `${window.location.origin}/invite/${inv.token}`
                    const isCopied = copiedToken === link
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <IconMail size={15} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{inv.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Expira el{" "}
                            {new Date(inv.expires_at).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCopy(link)}
                            title="Copiar enlace"
                          >
                            {isCopied ? (
                              <IconCheck size={14} className="text-emerald-500" />
                            ) : (
                              <IconCopy size={14} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="hover:text-destructive hover:bg-destructive/10"
                            onClick={() => cancelInvitation(inv.id)}
                            title="Cancelar invitación"
                          >
                            <span className="text-base leading-none">×</span>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
