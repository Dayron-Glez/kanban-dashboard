import { useMemo, useState } from "react"
import { IconPlus, IconStar } from "@tabler/icons-react"
import {
  Button,
  Header,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared"
import type { Project } from "@/shared/supabase"
import { useProjectsContext } from "../context/projectsCtx"
import { ProjectCard } from "./ProjectCard"
import { CreateProjectModal } from "./CreateProjectModal"
import type { ProjectFormValues } from "../schemas/project.schema"

type SortKey = "recent" | "name" | "tasks"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recientes" },
  { value: "name", label: "Nombre" },
  { value: "tasks", label: "Más tareas" },
]

/** Label de sección, con el mismo lenguaje que los del selector de proyectos. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.07em] uppercase">
      {children}
    </div>
  )
}

export function ProjectsPage() {
  const { projects, loading, taskCounts, favoriteIds, createProject } = useProjectsContext()
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("recent")

  const handleCreate = async (values: ProjectFormValues) => {
    await createProject(values)
  }

  const { favorites, rest } = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = term
      ? projects.filter((p) => p.name.toLowerCase().includes(term))
      : [...projects]

    const sorters: Record<SortKey, (a: Project, b: Project) => number> = {
      recent: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      name: (a, b) => a.name.localeCompare(b.name, "es"),
      tasks: (a, b) => (taskCounts[b.id] ?? 0) - (taskCounts[a.id] ?? 0),
    }
    filtered.sort(sorters[sortKey])

    return {
      favorites: filtered.filter((p) => favoriteIds[p.id]),
      rest: filtered.filter((p) => !favoriteIds[p.id]),
    }
  }, [projects, query, sortKey, taskCounts, favoriteIds])

  const isSearching = query.trim().length > 0
  const noResults = isSearching && favorites.length === 0 && rest.length === 0

  const grid = (items: Project[]) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )

  return (
    <div className="bg-background flex h-screen flex-col">
      <Header />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-8">
          <h1 className="text-foreground text-xl font-bold">Proyectos</h1>

          {/* Toolbar: búsqueda + orden + crear, como la página Projects de Supabase */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="max-w-xs flex-1">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar proyecto..."
                className="h-8"
              />
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger size="sm" className="w-36" aria-label="Ordenar proyectos">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <IconPlus className="mr-1 h-4 w-4" />
              Nuevo proyecto
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-muted h-36 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-24">
              <p className="text-lg">No tienes proyectos todavía.</p>
              <Button variant="outline" onClick={() => setModalOpen(true)}>
                <IconPlus className="mr-2 h-4 w-4" />
                Crear primer proyecto
              </Button>
            </div>
          ) : noResults ? (
            <p className="text-muted-foreground py-24 text-center text-sm">
              Sin resultados para «{query.trim()}»
            </p>
          ) : (
            <>
              {favorites.length > 0 && (
                <section className="flex flex-col gap-2.5">
                  <SectionLabel>
                    <IconStar size={11} className="fill-amber-400 text-amber-400" />
                    Favoritos
                  </SectionLabel>
                  {grid(favorites)}
                </section>
              )}

              {rest.length > 0 && (
                <section className="flex flex-col gap-2.5">
                  {favorites.length > 0 && <SectionLabel>Todos los proyectos</SectionLabel>}
                  {grid(rest)}
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <CreateProjectModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={handleCreate} />
    </div>
  )
}
