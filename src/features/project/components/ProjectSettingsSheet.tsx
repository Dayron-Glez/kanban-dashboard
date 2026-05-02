import { useState } from "react"
import { IconCopy, IconCheck, IconUserMinus, IconX } from "@tabler/icons-react"
import {
  Button,
  Input,
  Label,
  ScrollArea,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/index"
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

interface ProjectSettingsSheetProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectSettingsSheet({
  projectId,
  open,
  onOpenChange,
}: ProjectSettingsSheetProps) {
  const { userRole } = useKanban()
  const isOwner = userRole === "owner"

  const { members, invitations, loading, inviteMember, cancelInvitation, removeMember } =
    useProjectMembers(projectId)

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="border-transparent flex flex-col gap-6 overflow-hidden">
        <SheetHeader>
          <SheetTitle className="font-semibold text-primary">
            Ajustes del proyecto
          </SheetTitle>
          <SheetDescription>
            Gestiona los miembros y las invitaciones del proyecto.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-1">
          <div className="flex flex-col gap-6 pb-4">
            {/* ── Miembros actuales ── */}
            <div>
              <p className="text-sm font-medium text-primary mb-3">
                Miembros ({members.length})
              </p>
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin miembros aún.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold shrink-0">
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
            </div>

            {/* ── Invitar miembro (solo owner) ── */}
            {isOwner && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-primary">Invitar miembro</p>
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
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
                      <p className="text-xs text-muted-foreground flex-1 truncate">
                        {inviteLink}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleCopy(inviteLink)}
                        title="Copiar enlace"
                      >
                        {copiedToken === inviteLink ? (
                          <IconCheck size={14} className="text-green-500" />
                        ) : (
                          <IconCopy size={14} />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* ── Invitaciones pendientes ── */}
                {invitations.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-primary mb-3">
                        Invitaciones pendientes ({invitations.length})
                      </p>
                      <div className="flex flex-col gap-2">
                        {invitations.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
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
                                  handleCopy(
                                    `${window.location.origin}/invite/${inv.token}`,
                                  )
                                }
                                title="Copiar enlace"
                              >
                                {copiedToken ===
                                `${window.location.origin}/invite/${inv.token}` ? (
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
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
