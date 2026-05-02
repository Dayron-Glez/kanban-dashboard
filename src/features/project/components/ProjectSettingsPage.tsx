import { useState } from "react"
import { useParams, useNavigate } from "react-router"
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
  { bg: "rgba(99,102,241,.14)",  txt: "#6366f1" },
  { bg: "rgba(16,185,129,.14)",  txt: "#059669" },
  { bg: "rgba(249,115,22,.14)",  txt: "#ea580c" },
  { bg: "rgba(14,165,233,.14)",  txt: "#0284c7" },
  { bg: "rgba(168,85,247,.14)",  txt: "#9333ea" },
]

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?"
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

const getAvatarColor = (userId: string) =>
  AVATAR_COLORS[userId.charCodeAt(userId.length - 1) % AVATAR_COLORS.length]

// ── RoleBadge ──────────────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: MemberRole }) => (
  <span
    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap tracking-wide ${
      role === "owner"
        ? "bg-primary/10 text-primary"
        : "bg-muted text-muted-foreground"
    }`}
  >
    {role === "owner" ? "Propietario" : "Miembro"}
  </span>
)

// ── CardHead ───────────────────────────────────────────────────────────────
type ChipVariant = "default" | "warn" | "danger"

const chipClass: Record<ChipVariant, string> = {
  default: "bg-primary/10 text-primary",
  warn:    "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  danger:  "bg-red-100   dark:bg-red-950/40   text-red-600   dark:text-red-400",
}

interface CardHeadProps {
  icon:     React.ReactNode
  variant?: ChipVariant
  title:    string
  count?:   number
  note?:    string
}

const CardHead = ({ icon, variant = "default", title, count, note }: CardHeadProps) => (
  <div className="flex items-center gap-[9px] px-4 py-3 border-b border-border">
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${chipClass[variant]}`}>
      {icon}
    </div>
    <span className="text-[13px] font-bold text-foreground flex-1">{title}</span>
    {count != null && (
      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        {count}
      </span>
    )}
    {note && <span className="text-[11.5px] text-muted-foreground">{note}</span>}
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

  const [email,    setEmail]    = useState("")
  const [inviting, setInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [inviteLink,  setInviteLink]  = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [newName,  setNewName]  = useState(currentProject?.name ?? "")
  const [renaming, setRenaming] = useState(false)
  const [renamed,  setRenamed]  = useState(false)

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

  const handleDeleteProject = async () => {
    if (!projectId) return
    await deleteProject(projectId)
    navigate("/projects")
  }

  const handleRename = async () => {
    if (!projectId || !newName.trim() || newName.trim() === currentProject?.name) return
    setRenaming(true)
    await renameProject(projectId, newName.trim())
    setRenaming(false)
    setRenamed(true)
    setTimeout(() => setRenamed(false), 2000)
  }

  return (
    <div className="p-6 flex flex-col gap-6 w-full min-h-[calc(100vh-4rem)]">

      {/* ── Header de página ── */}
      <div className="flex items-center gap-3 pb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <IconSettings size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary leading-tight">Ajustes del proyecto</h1>
          <p className="text-sm text-muted-foreground">
            Miembros · Invitaciones · Configuración general
          </p>
        </div>
      </div>

      {/* ── Grid D1: 3 columnas ── */}
      <div className="grid grid-cols-3 gap-3 items-start">

        {/* ──────────────────── Col 1: Miembros ──────────────────── */}
        <Card className="overflow-hidden">
          <CardHead
            icon={<IconUsers size={15} />}
            title="Miembros"
            count={members.length}
          />
          <div className="px-4">
            {loading ? (
              <div className="flex flex-col gap-2 py-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin miembros aún.</p>
            ) : (
              members.map((m) => {
                const av = getAvatarColor(m.user_id)
                return (
                  <div
                    key={m.id}
                    className="group flex items-center gap-[10px] py-[9px] border-b border-border last:border-0"
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-extrabold"
                      style={{ background: av.bg, color: av.txt }}
                    >
                      {getInitials(m.profiles?.full_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-foreground truncate">
                          {m.profiles?.full_name ?? "Sin nombre"}
                        </span>
                        <RoleBadge role={m.role} />
                      </div>
                      {m.profiles?.email && (
                        <span className="text-[11.5px] text-muted-foreground truncate">
                          {m.profiles.email}
                        </span>
                      )}
                    </div>

                    {/* Remove */}
                    {isOwner && m.role !== "owner" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-[5px] rounded-md cursor-pointer border-0 bg-transparent text-transparent group-hover:bg-destructive/10 group-hover:text-destructive transition-all"
                          >
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

        {/* ──── Cols 2+3: sub-grid 2×2 (filas igualadas por CSS grid) ──── */}
        {isOwner && (
          <div className="col-span-2 grid grid-cols-2 gap-3">

            {/* Fila 1, col A: Invitar miembro */}
            <Card className="overflow-hidden">
              <CardHead
                icon={<IconUserPlus size={15} />}
                title="Invitar miembro"
                note="Válido 7 días"
              />
              <div className="p-4 flex flex-col gap-4">
                <div className="flex gap-2">
                  <Label htmlFor="invite-email" className="sr-only">
                    Correo electrónico
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite() }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleInvite}
                    disabled={inviting || !email.trim()}
                    className="shrink-0 hover:shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-shadow"
                  >
                    {inviting ? "Enviando…" : "Invitar"}
                  </Button>
                </div>

                {/* Enlace generado tras invitar */}
                {inviteLink && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
                    <IconLink size={13} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 text-[11.5px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                      {inviteLink}
                    </span>
                    <button
                      onClick={() => handleCopy(inviteLink)}
                      className="p-[3px] cursor-pointer border-0 bg-transparent flex text-muted-foreground hover:text-emerald-500 transition-colors"
                    >
                      {copiedToken === inviteLink
                        ? <IconCheck size={13} className="text-emerald-500" />
                        : <IconCopy size={13} />
                      }
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Fila 1, col B: Renombrar proyecto */}
            <Card className="overflow-hidden">
              <CardHead
                icon={<IconPencil size={14} />}
                variant="warn"
                title="Renombrar proyecto"
              />
              <div className="p-4 flex flex-col gap-4">
                <div className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename() }}
                    placeholder="Nombre del proyecto"
                    className="flex-1 min-w-0"
                  />
                  <Button
                    variant={renamed ? "outline" : "default"}
                    className={`shrink-0 hover:shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-shadow ${
                      renamed ? "text-emerald-600 border-emerald-400/60" : ""
                    }`}
                    onClick={handleRename}
                    disabled={renaming || !newName.trim() || newName.trim() === currentProject?.name}
                  >
                    {renamed ? (
                      <><IconCheck size={13} /> Guardado</>
                    ) : renaming ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
                <p className="text-[11.5px] text-muted-foreground">
                  Visible para todos los miembros del proyecto.
                </p>
              </div>
            </Card>

            {/* Fila 2, col A: Invitaciones pendientes (siempre visible) */}
            <Card className="overflow-hidden">
              <CardHead
                icon={<IconMail size={15} />}
                title="Invitaciones pendientes"
                count={invitations.length}
              />
              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 px-4">
                  No hay invitaciones pendientes.
                </p>
              ) : (
                <div className="px-4 py-1">
                  {invitations.map((inv) => {
                    const link = `${window.location.origin}/invite/${inv.token}`
                    const isCopied = copiedToken === link
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center gap-2 py-3 border-b border-border last:border-0"
                      >
                        <span className="text-[12.5px] flex-1 text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                          {inv.email}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          exp.{" "}
                          {new Date(inv.expires_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <button
                          onClick={() => handleCopy(link)}
                          className="p-[3px] cursor-pointer border-0 bg-transparent flex text-muted-foreground hover:text-emerald-500 transition-colors"
                          title="Copiar enlace"
                        >
                          {isCopied
                            ? <IconCheck size={13} className="text-emerald-500" />
                            : <IconCopy size={13} />
                          }
                        </button>
                        <button
                          onClick={() => cancelInvitation(inv.id)}
                          className="p-[3px] cursor-pointer border-0 bg-transparent flex text-muted-foreground hover:text-destructive transition-colors"
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

            {/* Fila 2, col B: Zona de peligro */}
            <Card className="overflow-hidden">
              <CardHead
                icon={<IconShieldX size={15} />}
                variant="danger"
                title="Zona de peligro"
              />
              <div className="p-4 flex flex-col gap-4">
                <p className="text-[12.5px] text-muted-foreground leading-[1.55]">
                  Elimina permanentemente todas las columnas, tareas, miembros e invitaciones.
                </p>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/40 hover:shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all"
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
    </div>
  )
}
