import { useState } from "react"
import { useParams, useNavigate } from "react-router"
import { motion } from "framer-motion"
import {
  IconCheck,
  IconCopy,
  IconLink,
  IconMail,
  IconPencil,
  IconSettings,
  IconShieldX,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
  IconX,
} from "@tabler/icons-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  Input,
  Label,
} from "@/shared/index"
import { useKanban } from "@/features/board/index"
import { useProjectMembers } from "../hooks/useProjectMembers"
import { useProjectsContext } from "../context/projectsCtx"
import type { MemberRole } from "@/shared/supabase"

// ── Paleta de avatares ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: "rgba(99,102,241,.14)", txt: "#6366f1" },
  { bg: "rgba(16,185,129,.14)", txt: "#059669" },
  { bg: "rgba(249,115,22,.14)", txt: "#ea580c" },
  { bg: "rgba(14,165,233,.14)", txt: "#0284c7" },
  { bg: "rgba(168,85,247,.14)", txt: "#9333ea" },
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

const getAvatarColor = (userId: string) =>
  AVATAR_COLORS[userId.charCodeAt(userId.length - 1) % AVATAR_COLORS.length]

// ── RoleBadge ──────────────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: MemberRole }) => (
  <span
    className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-wide whitespace-nowrap ${
      role === "owner" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
    }`}
  >
    {role === "owner" ? "Propietario" : "Miembro"}
  </span>
)

// ── CardHead ───────────────────────────────────────────────────────────────
type ChipVariant = "default" | "warn" | "danger"

const chipClass: Record<ChipVariant, string> = {
  default: "bg-primary/10 text-primary",
  warn: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  danger: "bg-red-100   dark:bg-red-950/40   text-red-600   dark:text-red-400",
}

interface CardHeadProps {
  icon: React.ReactNode
  variant?: ChipVariant
  title: string
  count?: number
  note?: string
}

const CardHead = ({ icon, variant = "default", title, count, note }: CardHeadProps) => (
  <div className="border-border flex items-center gap-[9px] border-b px-4 py-3">
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${chipClass[variant]}`}
    >
      {icon}
    </div>
    <span className="text-foreground flex-1 text-[13px] font-bold">{title}</span>
    {count != null && (
      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10.5px] font-bold">
        {count}
      </span>
    )}
    {note && <span className="text-muted-foreground text-[11.5px]">{note}</span>}
  </div>
)

// ── Página de ajustes ──────────────────────────────────────────────────────
export function ProjectSettingsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userRole } = useKanban()
  const isOwner = userRole === "owner"
  const { projects, deleteProject, renameProject } = useProjectsContext()

  const currentProject = projects.find((p) => p.id === projectId)

  const { members, invitations, loading, inviteMember, cancelInvitation, removeMember } =
    useProjectMembers(projectId ?? "")

  const [email, setEmail] = useState<string>("")
  const [inviting, setInviting] = useState<boolean>(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false)
  const [newName, setNewName] = useState(currentProject?.name ?? "")
  const [renaming, setRenaming] = useState<boolean>(false)
  const [renamed, setRenamed] = useState<boolean>(false)

  const handleInvite = async (): Promise<void> => {
    if (!email.trim()) return
    setInviting(true)
    const result = await inviteMember(email.trim())
    setInviting(false)
    if (result) {
      setInviteLink(`${window.location.origin}/invite/${result.token}`)
      setEmail("")
    }
  }

  const handleCopy = (link: string): void => {
    navigator.clipboard.writeText(link)
    setCopiedToken(link)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleDeleteProject = async (): Promise<void> => {
    if (!projectId) return
    await deleteProject(projectId)
    navigate("/projects")
  }

  const handleRename = async (): Promise<void> => {
    if (!projectId || !newName.trim() || newName.trim() === currentProject?.name) return
    setRenaming(true)
    await renameProject(projectId, newName.trim())
    setRenaming(false)
    setRenamed(true)
    setTimeout(() => setRenamed(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14 }}
      className="flex min-h-[calc(100vh-4rem)] w-full flex-col gap-3 p-3"
    >
      {/* ── Header de página ── */}
      <div className="flex items-center gap-3 pb-1">
        <div className="bg-primary/10 rounded-lg p-2">
          <IconSettings size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-foreground text-[15px] leading-tight font-bold">
            Ajustes del proyecto
          </h1>
          <p className="text-muted-foreground text-[12px]">
            Miembros · Invitaciones · Configuración general
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[11.5px] font-bold">
            {members.length} {members.length === 1 ? "miembro" : "miembros"}
          </span>
          {invitations.length > 0 && (
            <span className="bg-warn/10 text-warn rounded-full px-2.5 py-0.5 text-[11.5px] font-bold">
              {invitations.length} pendientes
            </span>
          )}
        </div>
      </div>

      {/* ── Grid D1: 3 columnas ── */}
      <div className="grid grid-cols-3 items-start gap-3">
        {/* ── Col 1: Miembros ── */}
        <Card className="hover:ring-primary/50 gap-4 overflow-hidden py-4 transition-all duration-200 hover:ring-2">
          <CardHead icon={<IconUsers size={15} />} title="Miembros" count={members.length} />
          <div className="px-4">
            {loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-muted h-12 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm">Sin miembros aún.</p>
            ) : (
              members.map((m) => {
                const av = getAvatarColor(m.user_id)
                return (
                  <div
                    key={m.id}
                    className="group border-border flex items-center gap-2.5 border-b py-[9px] last:border-0"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold"
                      style={{ background: av.bg, color: av.txt }}
                    >
                      {getInitials(m.profiles?.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground truncate text-[13px] font-semibold">
                          {m.profiles?.full_name ?? "Sin nombre"}
                        </span>
                        <RoleBadge role={m.role} />
                      </div>
                      {m.profiles?.email && (
                        <span className="text-muted-foreground truncate text-[11.5px]">
                          {m.profiles.email}
                        </span>
                      )}
                    </div>
                    {isOwner && m.role !== "owner" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="group-hover:bg-destructive/10 group-hover:text-destructive cursor-pointer rounded-md border-0 bg-transparent p-[5px] text-transparent transition-all">
                            <IconUserMinus size={13} />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <strong>
                                {m.profiles?.full_name ?? m.profiles?.email ?? "Este miembro"}
                              </strong>{" "}
                              perderá el acceso al proyecto. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => removeMember(m.id)}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* ── Cols 2+3: sub-grid 2×2 (CSS grid iguala alturas por fila) ── */}
        {isOwner && (
          <div className="col-span-2 grid grid-cols-2 gap-3">
            {/* Fila 1 — Invitar miembro */}
            <Card className="hover:ring-primary/50 gap-4 overflow-hidden py-4 transition-all duration-200 hover:ring-2">
              <CardHead
                icon={<IconUserPlus size={15} />}
                title="Invitar miembro"
                note="Válido 7 días"
              />
              <div className="flex flex-col gap-4 p-4">
                <div className="flex gap-4">
                  <Label htmlFor="invite-email" className="sr-only">
                    Correo electrónico
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
                    className="flex-1"
                  />
                  <Button
                    onClick={handleInvite}
                    disabled={inviting || !email.trim()}
                    className="shrink-0 transition-colors"
                  >
                    {inviting ? "Enviando…" : "Invitar"}
                  </Button>
                </div>
                {inviteLink && (
                  <div className="bg-muted border-border flex items-center gap-2 rounded-lg border px-3 py-2">
                    <IconLink size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground flex-1 overflow-hidden text-[11.5px] text-ellipsis whitespace-nowrap">
                      {inviteLink}
                    </span>
                    <button
                      onClick={() => handleCopy(inviteLink)}
                      className="text-muted-foreground flex cursor-pointer border-0 bg-transparent p-[3px] transition-colors hover:text-emerald-500"
                    >
                      {copiedToken === inviteLink ? (
                        <IconCheck size={13} className="text-emerald-500" />
                      ) : (
                        <IconCopy size={13} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Fila 1 — Renombrar proyecto */}
            <Card className="gap-4 overflow-hidden py-4 transition-all duration-200 hover:ring-2 hover:ring-amber-400/50">
              <CardHead icon={<IconPencil size={14} />} variant="warn" title="Renombrar proyecto" />
              <div className="flex flex-col gap-4 p-4">
                <div className="flex gap-4">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename()
                    }}
                    placeholder="Nombre del proyecto"
                    className="min-w-0 flex-1"
                  />
                  <Button
                    variant={renamed ? "outline" : "default"}
                    className={`shrink-0 transition-colors ${
                      renamed ? "border-emerald-400/60 text-emerald-600" : ""
                    }`}
                    onClick={handleRename}
                    disabled={
                      renaming || !newName.trim() || newName.trim() === currentProject?.name
                    }
                  >
                    {renamed ? (
                      <>
                        <IconCheck size={13} /> Guardado
                      </>
                    ) : renaming ? (
                      "Guardando…"
                    ) : (
                      "Guardar"
                    )}
                  </Button>
                </div>
                <p className="text-muted-foreground text-[11.5px]">
                  Visible para todos los miembros del proyecto.
                </p>
              </div>
            </Card>

            {/* Fila 2 — Invitaciones pendientes */}
            <Card className="hover:ring-primary/50 gap-4 overflow-hidden py-4 transition-all duration-200 hover:ring-2">
              <CardHead
                icon={<IconMail size={15} />}
                title="Invitaciones pendientes"
                count={invitations.length}
              />
              {invitations.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-4">
                  <p className="text-muted-foreground text-center text-sm">
                    No hay invitaciones pendientes.
                  </p>
                </div>
              ) : (
                <div className="px-4">
                  {invitations.map((inv) => {
                    const link = `${window.location.origin}/invite/${inv.token}`
                    const isCopied = copiedToken === link
                    return (
                      <div
                        key={inv.id}
                        className="border-border flex items-center gap-2 border-b py-3 last:border-0"
                      >
                        <span className="text-foreground flex-1 overflow-hidden text-[12.5px] text-ellipsis whitespace-nowrap">
                          {inv.email}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                          exp.{" "}
                          {new Date(inv.expires_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <button
                          onClick={() => handleCopy(link)}
                          className="text-muted-foreground flex cursor-pointer border-0 bg-transparent p-[3px] transition-colors hover:text-emerald-500"
                          title="Copiar enlace"
                        >
                          {isCopied ? (
                            <IconCheck size={13} className="text-emerald-500" />
                          ) : (
                            <IconCopy size={13} />
                          )}
                        </button>
                        <button
                          onClick={() => cancelInvitation(inv.id)}
                          className="text-muted-foreground hover:text-destructive flex cursor-pointer border-0 bg-transparent p-[3px] transition-colors"
                          title="Cancelar invitación"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Fila 2 — Zona de peligro */}
            <Card className="hover:ring-destructive/50 gap-4 overflow-hidden py-4 transition-all duration-200 hover:ring-2">
              <CardHead icon={<IconShieldX size={15} />} variant="danger" title="Zona de peligro" />
              <div className="flex flex-col gap-4 p-4">
                <div className="flex items-center gap-4">
                  <p className="text-muted-foreground flex-1 text-[11.5px]">
                    Elimina permanentemente todas las columnas, tareas, miembros e invitaciones.
                    Esta acción no se puede deshacer.
                  </p>
                  <Button
                    className="bg-destructive hover:bg-destructive/90 text-white transition-colors"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <IconTrash size={13} />
                    Eliminar proyecto
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── AlertDialog eliminar proyecto ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán permanentemente todas las columnas,
              tareas, miembros e invitaciones del proyecto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProject}
            >
              Eliminar proyecto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
