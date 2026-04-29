import { useNavigate } from "react-router"
import type { Project } from "@/shared/supabase"

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group text-left w-full bg-background rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/40 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-1 h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <div className="min-w-0">
          <h3 className="font-semibold text-primary truncate group-hover:text-primary/80">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
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
