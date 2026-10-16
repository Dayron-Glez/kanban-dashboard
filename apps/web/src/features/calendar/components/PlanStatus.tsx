import type { ReactNode } from "react"
import { IconTemplate } from "@tabler/icons-react"
import { Button, QueryErrorState, Skeleton } from "@/shared/index"

interface PlanStatusProps {
  pending: boolean
  error: Error | null
  onRetry: () => void
  /** Sin fases: se ofrece generarlas desde la plantilla (solo a quien es propietario). */
  empty: boolean
  canGenerate: boolean
  generating: boolean
  onGenerate: () => void
  /** El plan, cuando ya hay algo que enseñar. */
  children: ReactNode
}

/** Mientras carga, si falla o si aún no hay fases; si no, el plan. */
export function PlanStatus({
  pending,
  error,
  onRetry,
  empty,
  canGenerate,
  generating,
  onGenerate,
  children,
}: Readonly<PlanStatusProps>) {
  if (pending) {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    )
  }
  if (error) return <QueryErrorState error={error} onRetry={onRetry} />
  if (!empty) return children
  return (
    <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center text-base">
      <p>Este proyecto todavía no tiene fases.</p>
      {canGenerate ? (
        <Button size="sm" onClick={onGenerate} disabled={generating}>
          <IconTemplate className="mr-1 h-4 w-4" />
          Generar desde la plantilla
        </Button>
      ) : (
        <p>Solo el propietario puede generarlas desde la plantilla.</p>
      )}
    </div>
  )
}
