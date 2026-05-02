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
  CardContent,
  Input,
  Label,
  Separator,
} from "@/shared/index"
import { useKanban } from "@/features/board/index"
import { useProjectMembers } from "../hooks/useProjectMembers"
import { useProjectsContext } from "../context/projectsCtx"
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

interface CardHeadProps {
  iconBg: string
  iconColor: string
  icon: React.ReactNode
  title: string
  subtitle?: string
}

const CardHead = ({ iconBg, iconColor, icon, title, subtitle }: CardHeadProps) => (
  <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-semibold leading-tight">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  </div>
)

export function ProjectSettingsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userRole } = useKanban()
  const isOwner = userRole === "owner"
  const { projects, deleteProject, renameProject } = useProjectsContext()

  const currentProject = projects.find((p) => p.id === projectId)

  const { members, invitations, loading, inviteMember, cancelInvitation, removeMember } =
    useProjectMembers(projectId ?? "")

  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [newName, setNewName] = useState(currentProject?.name ?? "")
  const [renaming, setRenaming] = useState(false)
  const [renamed, setRenamed] = useState(false)

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
      {/* ── Header ── */}
      <div className="flex items-center gap-3 pb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <IconSettings size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary leading-tight">Ajustes del proyecto</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los miembros, invitaciones y configuración general del proyecto.
          </p>
        </div>
      </div>

      {/* ── Grid D1: 3 columnas ── */}
      <div className="grid grid-cols-3 gap-4 items-start">

        {/* ── Col 1: Miembros ── */}
        <Card className="overflow-hidden">
          <CardHead
            iconBg="bg-indigo-100 dark:bg-indigo-950/40"
            iconColor="text-indigo-600 dark:text-indigo-400"
            icon={<IconUsers size={15} />}
            title="Miembros"
            subtitle={`${members.length} en este proyecto`}
          />
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin miembros aún.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-center gap-3 px-5 py-3"
                  >
                    <div
                      className={`h-9 w-9 rounded-full text-sm flex items-center justify-center font-bold shrink-0 ${getAvatarColor(m.user_id)}`}
                    >
                      {getInitials(m.profiles?.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-tight truncate">
                          {m.profiles?.full_name ?? "Sin nombre"}
                        </p>
                        <RoleBadge role={m.role} />
                      </div>
                      {m.profiles?.email && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {m.profiles.email}
                        </p>
                      )}
                    </div>
                    {isOwner && m.role !== "owner" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 shrink-0 transition-opacity"
                            title="Eliminar miembro"
                          >
                            <IconUserMinus size={15} />
                          </Button>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Col 2: Invitar + Pendientes ── */}
        <div className="flex flex-col gap-4">

          {/* Invitar miembro */}
          {isOwner && (
            <Card className="overflow-hidden">
              <CardHead
                iconBg="bg-emerald-100 dark:bg-emerald-950/40"
                iconColor="text-emerald-600 dark:text-emerald-400"
                icon={<IconUserPlus size={15} />}
                title="Invitar miembro"
                subtitle="Envía un enlace de acceso por email"
              />
              <CardContent className="flex flex-col gap-4 pt-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite-email" className="text-xs text-muted-foreground">
                    Correo electrónico
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite() }}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleInvite}
                    disabled={inviting || !email.trim()}
                    className="hover:shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-shadow"
                  >
                    {inviting ? "Enviando…" : "Invitar"}
                  </Button>
                </div>

                {inviteLink && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <IconLink size={12} />
                        Comparte este enlace (válido 7 días)
                      </p>
                      <Button
                        variant="outline"
                        className="w-full gap-2 font-normal hover:shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-shadow"
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
          )}

          {/* Invitaciones pendientes */}
          {isOwner && invitations.length > 0 && (
            <Card className="overflow-hidden">
              <CardHead
                iconBg="bg-amber-100 dark:bg-amber-950/40"
                iconColor="text-amber-600 dark:text-amber-400"
                icon={<IconMail size={15} />}
                title="Invitaciones pendientes"
                subtitle={`${invitations.length} en espera de aceptación`}
              />
              <CardContent className="p-0">
                <div className="flex flex-col divide-y divide-border">
                  {invitations.map((inv) => {
                    const link = `${window.location.origin}/invite/${inv.token}`
                    const isCopied = copiedToken === link
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <IconMail size={14} className="text-muted-foreground" />
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
        </div>

        {/* ── Col 3: Renombrar + Zona de peligro ── */}
        {isOwner && (
          <div className="flex flex-col gap-4">

            {/* Renombrar proyecto */}
            <Card className="overflow-hidden">
              <CardHead
                iconBg="bg-violet-100 dark:bg-violet-950/40"
                iconColor="text-violet-600 dark:text-violet-400"
                icon={<IconPencil size={15} />}
                title="Renombrar proyecto"
                subtitle="Cambia el nombre visible para todos los miembros"
              />
              <CardContent className="flex flex-col gap-4 pt-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="project-name" className="text-xs text-muted-foreground">
                    Nombre del proyecto
                  </Label>
                  <Input
                    id="project-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename() }}
                    placeholder="Nombre del proyecto"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant={renamed ? "outline" : "default"}
                    className={`hover:shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-shadow ${
                      renamed ? "text-emerald-600 border-emerald-400/60" : ""
                    }`}
                    onClick={handleRename}
                    disabled={renaming || !newName.trim() || newName.trim() === currentProject?.name}
                  >
                    {renamed ? (
                      <><IconCheck size={14} /> Guardado</>
                    ) : renaming ? "Guardando…" : "Guardar cambios"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Zona de peligro */}
            <Card className="overflow-hidden">
              <CardHead
                iconBg="bg-red-100 dark:bg-red-950/40"
                iconColor="text-red-600 dark:text-red-400"
                icon={<IconShieldX size={15} />}
                title="Zona de peligro"
                subtitle="Las acciones de esta sección son permanentes"
              />
              <CardContent className="flex flex-col gap-3 pt-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Eliminar este proyecto</p>
                  <p className="text-xs text-muted-foreground">
                    Se eliminarán todas las columnas, tareas, miembros e invitaciones. Esta acción
                    no se puede deshacer.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="hover:shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-shadow"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <IconTrash size={14} />
                    Eliminar proyecto
                  </Button>
                </div>
              </CardContent>
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
