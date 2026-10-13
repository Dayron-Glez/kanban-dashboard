import { IconLayoutList } from "@tabler/icons-react"
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/index"
import { GANTT_FIELDS, type GanttFields } from "../lib/ganttFields"

interface FieldsMenuProps {
  value: GanttFields
  onChange: (fields: GanttFields) => void
}

/** «Campos visibles»: qué filas de la cabecera y qué columnas de la tabla se ven. */
export function FieldsMenu({ value, onChange }: Readonly<FieldsMenuProps>) {
  const groups = [...new Set(GANTT_FIELDS.map((field) => field.group))]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-muted-foreground h-8 text-sm">
          <IconLayoutList className="size-3.5" aria-hidden />
          Campos visibles
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {groups.map((group) => (
          <div key={group}>
            <DropdownMenuLabel className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
              {group}
            </DropdownMenuLabel>
            {GANTT_FIELDS.filter((field) => field.group === group).map((field) => (
              <DropdownMenuCheckboxItem
                key={field.key}
                checked={value[field.key]}
                // El menú sigue abierto: se suelen cambiar varios a la vez.
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) => onChange({ ...value, [field.key]: checked })}
              >
                {field.label}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
