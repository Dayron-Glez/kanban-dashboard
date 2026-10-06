import { useEffect, useRef, useState } from "react"
import { IconPlus, IconSearch } from "@tabler/icons-react"
import { Link } from "react-router"
import {
  Button,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/shared"
import type { Project } from "@/shared/supabase"

interface Props {
  projects: Project[]
  taskCounts: Record<string, number>
  activeProjectId: string | undefined
  onCreateProject: () => void
}

export function SidebarProjectList({
  projects,
  taskCounts,
  activeProjectId,
  onCreateProject,
}: Props) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      {/* Search */}
      <div className="px-3 pb-2">
        <div className="border-border bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-1.5">
          <IconSearch size={13} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proyecto..."
            className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-xs outline-none"
          />
          <span className="text-muted-foreground border-border shrink-0 rounded border px-1 text-[10px]">
            ⌘K
          </span>
        </div>
      </div>

      {/* Favoritos */}
      <SidebarGroup>
        <SidebarGroupLabel>Favoritos</SidebarGroupLabel>
        <SidebarGroupContent>
          <p className="text-muted-foreground px-3 text-xs">Sin favoritos aún</p>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Todos los proyectos */}
      <SidebarGroup>
        <SidebarGroupLabel>Todos los proyectos</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filtered.length === 0 && query ? (
              <p className="text-muted-foreground px-3 text-xs">Sin resultados</p>
            ) : (
              filtered.map((project) => {
                const isActive = project.id === activeProjectId
                const count = taskCounts[project.id] ?? 0
                return (
                  <SidebarMenuItem key={project.id}>
                    <Link
                      to={`/projects/${project.id}`}
                      className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-muted text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-primary"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="flex-1 truncate">{project.name}</span>
                      <span className="shrink-0 text-xs tabular-nums">{count}</span>
                    </Link>
                  </SidebarMenuItem>
                )
              })
            )}
          </SidebarMenu>
          <div className="mt-2 flex items-center justify-between px-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary h-auto gap-1 px-0 py-0 text-xs"
              onClick={onCreateProject}
            >
              <IconPlus size={12} />
              Nuevo
            </Button>
            <Link
              to="/projects"
              className="text-muted-foreground hover:text-primary text-xs transition-colors"
            >
              Ver todos →
            </Link>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}
