import { IconAdjustmentsHorizontal, IconChevronDown } from "@tabler/icons-react"
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/index"
import { GANTT_FIELDS, type GanttFields } from "../lib/ganttFields"
import { MARK_PARTS } from "../lib/ganttMarks"
import type { TimelineMarks } from "../lib/timeline"

interface ViewOptionsMenuProps {
  fields: GanttFields
  onFieldsChange: (fields: GanttFields) => void
  marks: TimelineMarks
  onMarksChange: (marks: TimelineMarks) => void
}

const SECTION = "text-muted-foreground text-sm font-semibold"

/**
 * «Vista»: cómo se ve el Gantt. Son preferencias que se ajustan una vez, así que
 * van juntas en un solo menú y no ocupan la barra.
 */
export function ViewOptionsMenu({
  fields,
  onFieldsChange,
  marks,
  onMarksChange,
}: Readonly<ViewOptionsMenuProps>) {
  // El menú sigue abierto al marcar: se suelen cambiar varias cosas a la vez.
  const keepOpen = (event: Event) => event.preventDefault()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-sm">
          <IconAdjustmentsHorizontal className="size-3.5" aria-hidden />
          Vista
          <IconChevronDown className="text-muted-foreground size-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {(["Cabecera", "Columnas"] as const).map((group, index) => (
          <div key={group}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className={SECTION}>
              {group === "Cabecera" ? "Filas de la cabecera" : "Columnas"}
            </DropdownMenuLabel>
            {GANTT_FIELDS.filter((field) => field.group === group).map((field) => (
              <DropdownMenuCheckboxItem
                key={field.key}
                checked={fields[field.key]}
                onSelect={keepOpen}
                onCheckedChange={(checked) => onFieldsChange({ ...fields, [field.key]: checked })}
              >
                {field.label}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className={SECTION}>Marcas del tiempo</DropdownMenuLabel>
        {MARK_PARTS.map((part) => (
          <DropdownMenuCheckboxItem
            key={part.key}
            checked={marks[part.key]}
            onSelect={keepOpen}
            onCheckedChange={(checked) => onMarksChange({ ...marks, [part.key]: checked })}
          >
            {part.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
