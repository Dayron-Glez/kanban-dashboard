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
      className="group bg-background border-border hover:border-primary/40 w-full rounded-xl border p-5 text-left transition-all duration-200 hover:shadow-md"
    >
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
