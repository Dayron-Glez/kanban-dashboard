import { IconStar } from "@tabler/icons-react"
import { useNavigate } from "react-router"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared"
import type { Project } from "@/shared/supabase"
import { PRIORITY_CONFIG } from "@/features/task/index"
import { useProjectsContext } from "../context/projectsCtx"

interface ProjectCardProps {
  project: Project
}

const PRIORITY_KEYS = ["p0", "p1", "p2"] as const

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()
  const { favoriteIds, taskCounts, priorityCounts, toggleFavorite } = useProjectsContext()
  const isFav = favoriteIds[project.id] ?? false
  const totalTasks = taskCounts[project.id] ?? 0
  const priorities = priorityCounts[project.id]

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group bg-card border-border hover:border-primary/40 relative flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md"
    >
      {/* Botón estrella */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleFavorite(project.id)
            }}
            aria-label={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
            className={`absolute top-3 right-3 rounded-md p-1 transition-opacity ${
              isFav ? "opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
            }`}
          >
            <IconStar
              size={15}
              className={isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>{isFav ? "Quitar de favoritos" : "Añadir a favoritos"}</TooltipContent>
      </Tooltip>

      <div className="flex items-start gap-3">
        <div
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <div className="min-w-0">
          <h3 className="text-foreground group-hover:text-primary truncate font-semibold transition-colors">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{project.description}</p>
          )}
        </div>
      </div>

      {/* Meta: tareas, prioridades pendientes y fecha */}
      <div className="mt-auto flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">
          {totalTasks} {totalTasks === 1 ? "tarea" : "tareas"}
        </span>
        {priorities &&
          PRIORITY_KEYS.map(
            (p) =>
              priorities[p] > 0 && (
                <span
                  key={p}
                  className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${PRIORITY_CONFIG[p].className}`}
                >
                  {priorities[p]} {PRIORITY_CONFIG[p].label}
                </span>
              )
          )}
        <span className="text-muted-foreground/70 ml-auto text-xs">
          {new Date(project.created_at).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    </button>
  )
}
