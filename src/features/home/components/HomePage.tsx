import { useMemo } from "react"
import { IconArrowRight, IconPlus } from "@tabler/icons-react"
import { Link } from "react-router"
import { Button, Skeleton } from "@/shared"
import { useAuth } from "@/features/auth"
import { PRIORITY_CONFIG, sortByPriority } from "@/features/task/index"
import { ProjectCard, useProjectsContext } from "@/features/project"
import { useMyTasks } from "../hooks/useMyTasks"

/** Saludo según la hora local. */
const greeting = (): string => {
  const h = new Date().getHours()
  if (h < 6) return "Buenas noches"
  if (h < 13) return "Buenos días"
  if (h < 21) return "Buenas tardes"
  return "Buenas noches"
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-[10.5px] font-bold tracking-[0.07em] uppercase">
      {children}
    </span>
  )
}

export function HomePage() {
  const { user } = useAuth()
  const { tasks, loading: tasksLoading } = useMyTasks()
  const { projects, loading: projectsLoading } = useProjectsContext()

  const fullName = user?.user_metadata?.full_name as string | undefined
  const firstName = fullName?.trim().split(/\s+/)[0] ?? null

  // P0 primero; el sort es estable, así que dentro de cada prioridad se
  // conserva el orden que devuelve la consulta.
  const ordered = useMemo(() => sortByPriority(tasks), [tasks])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
        <h1 className="text-foreground text-xl font-bold">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>

        {/* ── Asignadas a mí ── */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <SectionLabel>Asignadas a mí</SectionLabel>
            {!tasksLoading && tasks.length > 0 && (
              <span className="text-muted-foreground text-[11px] tabular-nums">
                {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
              </span>
            )}
          </div>

          {tasksLoading ? (
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-11 rounded-lg" />
              ))}
            </div>
          ) : ordered.length === 0 ? (
            <div className="border-border text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="text-sm">No tienes tareas asignadas.</p>
              <p className="mt-1 text-[12.5px]">
                Asígnate una desde el tablero de cualquier proyecto.
              </p>
            </div>
          ) : (
            <ul className="border-border divide-border bg-card divide-y overflow-hidden rounded-xl border">
              {ordered.map((task) => {
                const priority = PRIORITY_CONFIG[task.priority]
                return (
                  <li key={task.id}>
                    <Link
                      to={`/projects/${task.projectId}`}
                      className="hover:bg-muted/60 group flex items-center gap-3 px-3.5 py-2.5 transition-colors"
                    >
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold ${priority.className}`}
                      >
                        {priority.label}
                      </span>
                      <span className="text-foreground min-w-0 flex-1 truncate text-[13px] font-medium">
                        {task.content}
                      </span>
                      <span className="text-muted-foreground hidden shrink-0 items-center gap-1.5 text-[11.5px] sm:flex">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: task.projectColor }}
                        />
                        {task.projectName}
                        <span className="text-muted-foreground/50">·</span>
                        {task.columnTitle}
                      </span>
                      <IconArrowRight
                        size={14}
                        className="text-muted-foreground shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── Tus proyectos ── */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <SectionLabel>Tus proyectos</SectionLabel>
            {projects.length > 0 && (
              <Link
                to="/projects"
                className="text-muted-foreground hover:text-foreground text-[11.5px] transition-colors"
              >
                Ver todos →
              </Link>
            )}
          </div>

          {projectsLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="text-sm">Aún no tienes proyectos.</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/projects">
                  <IconPlus className="mr-1 h-4 w-4" />
                  Crear el primero
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.slice(0, 6).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
