import { IconAlertTriangle } from "@tabler/icons-react"
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/index"

/** El aviso de una acción sin duración: solo ocupa su día de inicio. */
export function MissingDurationHint() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          aria-label="Sin duración"
          className="bg-warn-soft text-warn border-warn/30"
        >
          <IconAlertTriangle aria-hidden />
          sin duración
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Sin duración: solo ocupa su día de inicio</TooltipContent>
    </Tooltip>
  )
}
