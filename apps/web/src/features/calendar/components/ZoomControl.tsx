import { ToggleGroup, ToggleGroupItem } from "@/shared/index"
import type { PlanZoom } from "../lib/timeline"

const OPTIONS: { value: PlanZoom; label: string }[] = [
  { value: "dia", label: "Día" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
]

interface ZoomControlProps {
  value: PlanZoom
  onChange: (zoom: PlanZoom) => void
}

/** El zoom del Gantt: una columna por día, por semana o por mes. */
export function ZoomControl({ value, onChange }: Readonly<ZoomControlProps>) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label="Zoom"
      value={value}
      // Pulsar el que ya está elegido no lo deja sin zoom.
      onValueChange={(next) => next && onChange(next as PlanZoom)}
    >
      {OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="h-8 px-3 text-sm">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
