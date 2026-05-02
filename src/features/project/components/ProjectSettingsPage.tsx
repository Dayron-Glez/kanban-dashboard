import { useState } from "react"
import { useParams } from "react-router"
import { IconCheck, IconCopy, IconUserMinus, IconX } from "@tabler/icons-react"
import { Button, Input, Label, Separator } from "@/shared/index"
import { useKanban } from "@/features/board/index"
import { useProjectMembers } from "../hooks/useProjectMembers"

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

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
    <div className="p-6 flex flex-col gap-8 max-w-2xl w-full">
      <div>
        <h1 className="text-2xl font-bold text-primary">Ajustes del proyecto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona los miembros y las invitaciones del proyecto.
        </p>
      </div>

      {/* ── Miembros actuales ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-primary">
          Miembros ({members.length})
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin miembros aún.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-md border border-border px-4 py-3"
              >
                <div className="h-9 w-9 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold shrink-0">
                  {getInitials(m.profiles?.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.profiles?.full_name ?? "Sin nombre"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                </div>
                {isOwner && m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:text-destructive shrink-0"
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
      </section>

      {/* ── Invitar miembro (solo owner) ── */}
      {isOwner && (
        <>
          <Separator />

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-primary">Invitar miembro</h2>
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
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleCopy(inviteLink)}
              >
                {copiedToken === inviteLink ? (
                  <>
                    <IconCheck size={16} className="text-green-500" />
                    <span className="text-green-500">¡Enlace copiado!</span>
                  </>
                ) : (
                  <>
                    <IconCopy size={16} />
                    Copiar enlace de invitación
                  </>
                )}
              </Button>
            )}
          </section>

          {/* ── Invitaciones pendientes ── */}
          {invitations.length > 0 && (
            <>
              <Separator />

              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-primary">
                  Invitaciones pendientes ({invitations.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 rounded-md border border-border px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Expira:{" "}
                          {new Date(inv.expires_at).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            handleCopy(`${window.location.origin}/invite/${inv.token}`)
                          }
                          title="Copiar enlace de invitación"
                        >
                          {copiedToken === `${window.location.origin}/invite/${inv.token}` ? (
                            <IconCheck size={14} className="text-green-500" />
                          ) : (
                            <IconCopy size={14} />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:text-destructive"
                          onClick={() => cancelInvitation(inv.id)}
                          title="Cancelar invitación"
                        >
                          <IconX size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
