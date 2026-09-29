import { useContext, useMemo, useState } from "react"
import { IconArrowsSort, IconSortAscending, IconSortDescending } from "@tabler/icons-react"
import {
  SearchContext,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@/shared/index"
import { DetailsTaskSheet, DueDateChip, PRIORITY_CONFIG, SIZE_CONFIG } from "@/features/task/index"
import { useKanban } from "../hooks/useKanban"
import {
  buildRows,
  filterRows,
  sortRows,
  type SortDirection,
  type SortKey,
  type TaskRow,
} from "../lib/taskTable"
import type { Task } from "../types/board.types"

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "content", label: "Tarea" },
  { key: "column", label: "Estado", className: "w-[15%]" },
  { key: "priority", label: "Prioridad", className: "w-[10%]" },
  { key: "size", label: "Tamaño", className: "w-[10%]" },
  { key: "assignee", label: "Asignado", className: "w-[20%]" },
  { key: "dueDate", label: "Vencimiento", className: "w-[15%]" },
]

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: SortDirection
  onClick: () => void
}) {
  const Icon = !active
    ? IconArrowsSort
    : direction === "asc"
      ? IconSortAscending
      : IconSortDescending
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:text-foreground -mx-1 flex items-center gap-1 rounded px-1 py-0.5 transition-colors",
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
      <Icon size={13} className={cn("shrink-0", active ? "opacity-100" : "opacity-40")} />
    </button>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS.length} className="text-muted-foreground py-12 text-center">
        {children}
      </TableCell>
    </TableRow>
  )
}

/**
 * Las mismas tareas del tablero, en lista densa y ordenables por cualquier
 * columna. Comparte el filtro del navbar con el tablero, así que alternar de
 * vista con un filtro puesto mantiene lo que se está mirando.
 */
export function TaskTable() {
  const { tasks, columns } = useKanban()
  const searchValue = useContext(SearchContext)?.searchValue ?? ""

  const [sortKey, setSortKey] = useState<SortKey>("column")
  const [direction, setDirection] = useState<SortDirection>("asc")
  const [selected, setSelected] = useState<Task | null>(null)

  const rows = useMemo(
    () => sortRows(filterRows(buildRows(tasks, columns), searchValue), sortKey, direction),
    [tasks, columns, searchValue, sortKey, direction]
  )

  const toggle = (key: SortKey): void => {
    if (key === sortKey) setDirection((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setDirection("asc")
    }
  }

  const open = (row: TaskRow): void => {
    setSelected(tasks.find((t) => t.id === row.id) ?? null)
  }

  const filtering = searchValue.trim().length > 0

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 py-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map(({ key, label, className }) => (
                <TableHead
                  key={key}
                  className={className}
                  aria-sort={
                    sortKey === key ? (direction === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <SortButton
                    label={label}
                    active={sortKey === key}
                    direction={direction}
                    onClick={() => toggle(key)}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {tasks.length === 0 ? (
              <EmptyRow>Este proyecto todavía no tiene tareas.</EmptyRow>
            ) : rows.length === 0 && filtering ? (
              <EmptyRow>Ninguna tarea coincide con el filtro.</EmptyRow>
            ) : (
              rows.map((row) => {
                const priority = PRIORITY_CONFIG[row.priority]
                const size = SIZE_CONFIG[row.size]
                return (
                  <TableRow key={row.id} onClick={() => open(row)} className="cursor-pointer">
                    <TableCell className="font-medium">
                      {/* El botón es lo que hace la fila alcanzable con
                          teclado; el onClick de la fila es solo comodidad
                          para el ratón. */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          open(row)
                        }}
                        className="hover:text-primary text-left"
                      >
                        {row.content}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.columnTitle}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority.className}`}
                      >
                        {priority.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${size.className}`}
                      >
                        {size.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">
                      {row.assignee ?? "Sin asignar"}
                    </TableCell>
                    <TableCell>
                      {row.dueDate ? (
                        <DueDateChip dueDate={row.dueDate} />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selected && (
        <DetailsTaskSheet
          task={selected}
          open
          onOpenChange={(next) => !next && setSelected(null)}
        />
      )}
    </>
  )
}
