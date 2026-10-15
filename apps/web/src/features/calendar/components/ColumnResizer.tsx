import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { IconGripVertical } from "@tabler/icons-react"
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/index"

interface ColumnResizerProps {
  /** El ancho actual, en píxeles, y dónde se pinta el borde. */
  value: number
  /** Dónde está el borde, en CSS: el ancho de la columna con lo que la acompaña. */
  left: string
  min: number
  max: number
  initial: number
  label: string
  onChange: (width: number) => void
  /** Contraída, el borde la abre: arrastrándolo, con las flechas o con Enter. */
  collapsed?: boolean
  onToggleCollapsed?: () => void
  /** Mientras se arrastra, lo que cambia de ancho no se anima: iría con retraso. */
  onDraggingChange?: (dragging: boolean) => void
}

const STEP = 16

/**
 * El borde entre la tabla y el Gantt: se arrastra para repartir el espacio, el
 * doble clic lo restablece y, con el foco, ← → lo mueven.
 */
export function ColumnResizer({
  value,
  left,
  min,
  max,
  initial,
  label,
  onChange,
  collapsed = false,
  onToggleCollapsed,
  onDraggingChange,
}: Readonly<ColumnResizerProps>) {
  const drag = useRef<{ x: number; width: number } | null>(null)
  const [dragging, setDragging] = useState<boolean>(false)
  const clamp = (width: number) => Math.round(Math.min(max, Math.max(min, width)))

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    drag.current = { x: event.clientX, width: collapsed ? 0 : value }
    setDragging(true)
    onDraggingChange?.(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const moved = event.clientX - drag.current.x
    // Contraída, se abre en cuanto se arrastra un poco a la derecha.
    if (collapsed) {
      if (moved > 40) {
        drag.current = { x: event.clientX, width: value }
        onToggleCollapsed?.()
      }
      return
    }
    const next = clamp(drag.current.width + moved)
    if (next !== value) onChange(next)
  }
  const stop = () => {
    drag.current = null
    setDragging(false)
    onDraggingChange?.(false)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && onToggleCollapsed) {
      event.preventDefault()
      return onToggleCollapsed()
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    if (collapsed) return event.key === "ArrowRight" && onToggleCollapsed?.()
    onChange(clamp(value + (event.key === "ArrowLeft" ? -STEP : STEP)))
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={label}
          aria-valuenow={collapsed ? min : value}
          aria-expanded={onToggleCollapsed ? !collapsed : undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stop}
          onPointerCancel={stop}
          onDoubleClick={() => (collapsed ? onToggleCollapsed?.() : onChange(initial))}
          onKeyDown={onKeyDown}
          data-dragging={dragging || undefined}
          className={cn(
            "group/resizer absolute inset-y-0 z-30 -ml-1 flex w-2.5 cursor-col-resize touch-none justify-center outline-none",
            // La línea se ilumina al pasar, con el foco y mientras se arrastra.
            "before:bg-border before:h-full before:w-px before:transition-all",
            "hover:before:bg-primary focus-visible:before:bg-primary data-dragging:before:bg-primary",
            "hover:before:w-[3px] focus-visible:before:w-[3px] data-dragging:before:w-[3px]",
            // Sigue suave al borde de la tabla cuando cambia de ancho.
            "transition-[left] duration-200 ease-out data-dragging:transition-none motion-reduce:transition-none"
          )}
          style={{ left }}
        >
          <span
            aria-hidden
            className={cn(
              "bg-card border-border text-muted-foreground absolute top-1/2 flex h-8 w-3.5 -translate-y-1/2 items-center justify-center rounded-md border opacity-0 transition-opacity",
              "group-hover/resizer:opacity-100 group-focus-visible/resizer:opacity-100 group-data-dragging/resizer:opacity-100"
            )}
          >
            <IconGripVertical className="size-3" />
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        {collapsed
          ? "Arrastra para abrir la columna"
          : "Arrastra para ajustar · doble clic para restablecer"}
      </TooltipContent>
    </Tooltip>
  )
}
