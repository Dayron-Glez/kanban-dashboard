import { IconCalendar } from "@tabler/icons-react"
import { Tooltip, TooltipContent, TooltipTrigger, cn } from "@/shared/index"
import { DUE_STATE_CHIP, formatDueFull, formatDueLabel, getDueState } from "../lib/dueDate"

interface DueDateChipProps {
  dueDate: string | null | undefined
  className?: string
}

/**
 * Vencimiento de una tarea, en el mismo formato de píldora que la prioridad y
 * el tamaño. La etiqueta es relativa («Hoy», «En 3 días») porque en una tarjeta
 * lo que importa es cuánto queda, no la fecha exacta; esa va en el tooltip.
 *
 * No pinta nada si la tarea no tiene fecha: una píldora «Sin fecha» en cada
 * tarjeta sería ruido en un tablero donde la mayoría no la tendrá.
 */
export function DueDateChip({ dueDate, className }: DueDateChipProps) {
  if (!dueDate) return null

  const state = getDueState(dueDate)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            // inline-flex, no flex: dentro de una celda de tabla un span en
            // display:flex se estira a todo el ancho.
            "inline-flex cursor-default items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            DUE_STATE_CHIP[state],
            className
          )}
        >
          <IconCalendar size={11} className="shrink-0" />
          {formatDueLabel(dueDate)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{formatDueFull(dueDate)}</TooltipContent>
    </Tooltip>
  )
}
