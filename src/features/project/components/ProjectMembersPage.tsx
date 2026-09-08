import { useParams } from "react-router"
import { motion } from "framer-motion"
import { IconUserMinus, IconUsers } from "@tabler/icons-react"
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
  Card,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/index"
import { useKanban } from "@/features/board/index"
import { useProjectMembers } from "../hooks/useProjectMembers"
import { CardHead, RoleBadge } from "./settingsCards"
import { getAvatarColor, getInitials } from "../lib/avatars"

/**
 * Miembros del proyecto en su propia página. Antes vivía como una card dentro
 * de Ajustes, pero el sidebar ya prometía esta entrada y la ruta no existía.
 */
export function ProjectMembersPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { userRole } = useKanban()
  const isOwner = userRole === "owner"
  const { members, loading, removeMember } = useProjectMembers(projectId ?? "")

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3"
    >
      <div className="flex items-center gap-3 pb-1">
        <div className="bg-primary/10 rounded-lg p-2">
          <IconUsers size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-foreground text-[15px] leading-tight font-bold">Miembros</h1>
          <p className="text-muted-foreground text-[12px]">Quién tiene acceso a este proyecto</p>
        </div>
        <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[11.5px] font-bold">
          {members.length} {members.length === 1 ? "miembro" : "miembros"}
        </span>
      </div>

      <Card className="gap-4 overflow-hidden py-4">
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <button
                              aria-label="Eliminar miembro"
                              className="group-hover:bg-destructive/10 group-hover:text-destructive cursor-pointer rounded-md border-0 bg-transparent p-[5px] text-transparent transition-all"
                            >
                              <IconUserMinus size={13} />
                            </button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar miembro</TooltipContent>
                      </Tooltip>
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
    </motion.div>
  )
}
