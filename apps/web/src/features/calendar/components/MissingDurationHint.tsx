import { IconAlertTriangle } from "@tabler/icons-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/index"

/** El aviso de una acción sin duración: solo ocupa su día de inicio. */
export function MissingDurationHint() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label="Sin duración"
          className="bg-warn-soft text-warn border-warn/30 inline-flex h-5 shrink-0 items-center justify-center gap-1 rounded-full border px-1.5 text-xs leading-none font-medium"
        >
          <IconAlertTriangle className="size-3" aria-hidden />
          sin duración
        </span>
      </TooltipTrigger>
      <TooltipContent>Sin duración: solo ocupa su día de inicio</TooltipContent>
    </Tooltip>
  )
}
