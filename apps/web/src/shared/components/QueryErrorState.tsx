import { IconRefresh } from "@tabler/icons-react"
import { errorMessage } from "@/shared/api"
import { Button } from "./ui/button"

interface QueryErrorStateProps {
  error: unknown
  onRetry: () => void
}

export function QueryErrorState({ error, onRetry }: Readonly<QueryErrorStateProps>) {
  return (
    <div
      role="alert"
      className="border-border text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center"
    >
      <p className="text-sm">{errorMessage(error)}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <IconRefresh className="mr-1 h-4 w-4" />
        Reintentar
      </Button>
    </div>
  )
}
