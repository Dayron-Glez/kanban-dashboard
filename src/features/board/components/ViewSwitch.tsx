import { IconLayoutKanban, IconTable } from "@tabler/icons-react"
import { useSearchParams } from "react-router"
import { Tooltip, TooltipContent, TooltipTrigger, cn } from "@/shared/index"
import { parseView, VIEW_PARAM, type ProjectView } from "../lib/taskTable"

const OPTIONS: { value: ProjectView; label: string; Icon: typeof IconTable }[] = [
  { value: "board", label: "Vista de tablero", Icon: IconLayoutKanban },
  { value: "table", label: "Vista de tabla", Icon: IconTable },
]

/**
 * Alterna entre tablero y tabla. La elección va en la URL y no en estado
 * local para que el enlace se pueda compartir tal cual.
 */
export function ViewSwitch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const current = parseView(searchParams.get(VIEW_PARAM))

  const select = (view: ProjectView): void => {
    const next = new URLSearchParams(searchParams)
    // El tablero es el valor por defecto: no ensucia la URL con ?view=board.
    if (view === "board") next.delete(VIEW_PARAM)
    else next.set(VIEW_PARAM, view)
    setSearchParams(next, { replace: true })
  }

  return (
    <div
      role="group"
      aria-label="Cambiar de vista"
      className="border-border bg-muted/40 flex h-8 shrink-0 items-center gap-0.5 rounded-md border p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = current === value
        return (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => select(value)}
                aria-label={label}
                aria-pressed={active}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
