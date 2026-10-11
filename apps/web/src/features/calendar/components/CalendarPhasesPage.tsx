import { useMemo } from "react"
import { useParams } from "react-router"
import { IconTemplate } from "@tabler/icons-react"
import { Button, QueryErrorState, Skeleton } from "@/shared/index"
import { useProject } from "@/features/project"
import { useElements, useGenerateFromTemplate } from "../api/elements"
import { buildElementTree } from "../lib/elementTree"
import { ElementTree } from "./ElementTree"

export function CalendarPhasesPage() {
  const { id: projectId = "" } = useParams<{ id: string }>()
  const elements = useElements(projectId)
  const generate = useGenerateFromTemplate(projectId)
  const isOwner = useProject(projectId).data?.role === "owner"
  const tree = useMemo(() => buildElementTree(elements.data ?? []), [elements.data])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">Fases</h1>

      {elements.isPending ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : elements.isError ? (
        <QueryErrorState error={elements.error} onRetry={() => void elements.refetch()} />
      ) : tree.length === 0 ? (
        <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center text-sm">
          <p>Este proyecto todavía no tiene fases.</p>
          {isOwner ? (
            <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
              <IconTemplate className="mr-1 h-4 w-4" />
              Generar desde la plantilla
            </Button>
          ) : (
            <p>Solo el propietario puede generarlas desde la plantilla.</p>
          )}
        </div>
      ) : (
        <ElementTree nodes={tree} />
      )}
    </div>
  )
}
