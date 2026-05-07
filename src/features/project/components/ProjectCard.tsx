import { IconStar } from "@tabler/icons-react"
import { useNavigate } from "react-router"
import type { Project } from "@/shared/supabase"
import { useProjectsContext } from "../context/projectsCtx"

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()
  const { favoriteIds, toggleFavorite } = useProjectsContext()
  const isFav = favoriteIds[project.id] ?? false

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group bg-background border-border hover:border-primary/40 relative w-full rounded-xl border p-5 text-left transition-all duration-200 hover:shadow-md"
    >
      {/* Botón estrella */}
      <span
        role="button"
        onClick={(e) => {
          e.stopPropagation()
          toggleFavorite(project.id)
        }}
        className={`absolute top-3 right-3 rounded-md p-1 transition-opacity ${
          isFav ? "opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
        }`}
        title={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
      >
        <IconStar
          size={15}
          className={isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}
        />
      </span>

      <div className="flex items-start gap-3">
        <div
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <div className="min-w-0">
          <h3 className="text-primary group-hover:text-primary/80 truncate font-semibold">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{project.description}</p>
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            {new Date(project.created_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </button>
  )
}
