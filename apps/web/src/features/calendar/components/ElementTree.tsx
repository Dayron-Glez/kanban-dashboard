import { useState } from "react"
import { IconAnchor, IconChevronRight, IconPin } from "@tabler/icons-react"
import { cn } from "@/shared/index"
import type {
  CalendarElement,
  DatePoint,
  ElementDependency,
  UpdateElementPlanInput,
} from "@repo/contracts"
import { ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { describeIssue, describeRule, formatPlanDate } from "../lib/planFormat"
import { DateEditor, DurationEditor } from "./PlanEditors"

interface ElementTreeProps {
  nodes: ElementNode[]
  dependencies: ElementDependency[]
  editable: boolean
  pending: boolean
  onUpdate: (elementId: string, input: UpdateElementPlanInput) => void
  onOpen: (elementId: string) => void
  /** Escribir a mano el inicio o el fin: la regla que lo produce se ajusta. */
  onMoveDate: (elementId: string, point: DatePoint, date: string) => void
  selectedId?: string | null
}

// Los hijos toman el color de su fase, más claro cuanto más hondo.
const shade = (color: string | null, depth: number) =>
  color
    ? `color-mix(in oklch, ${color} ${Math.max(100 - depth * 25, 30)}%, transparent)`
    : undefined

const COLUMNS = "grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] items-center gap-2"

const CHIP =
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium whitespace-nowrap"

export function ElementTree({
  nodes,
  dependencies,
  editable,
  pending,
  onUpdate,
  onOpen,
  onMoveDate,
  selectedId = null,
}: Readonly<ElementTreeProps>) {
  // Las fases empiezan abiertas y el resto cerrado: se guarda lo que el usuario cambia.
  const [toggled, setToggled] = useState<Set<string>>(new Set())

  const names = new Map<string, string>()
  const collect = (list: ElementNode[]) =>
    list.forEach((node) => {
      names.set(node.element.id, node.element.name)
      collect(node.children)
    })
  collect(nodes)
  const nameOf = (id: string) => names.get(id) ?? "otro elemento"

  const toggle = (id: string) =>
    setToggled((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Lo vacío no se pinta: el motivo queda para el cursor y los lectores de pantalla.
  const missing = (element: CalendarElement) => {
    const reason = element.issue && describeIssue(element.issue, nameOf)
    return (
      <span className="px-1.5" title={reason ?? undefined}>
        {reason && <span className="sr-only">{reason}</span>}
      </span>
    )
  }

  const dateCell = (element: CalendarElement, point: DatePoint) => {
    const value = point === "start" ? element.startsOn : element.endsOn
    const reason = element.issue ? describeIssue(element.issue, nameOf) : undefined
    if (!editable) {
      return value ? <span className="px-1.5">{formatPlanDate(value)}</span> : missing(element)
    }
    return (
      <DateEditor
        label={`${point === "start" ? "Inicio" : "Fin"} de ${element.name}`}
        value={value}
        editable
        pending={pending}
        emptyLabel={
          point === "start" && (element.isAnchor || element.isPinned) ? "Escribir fecha" : "+ fecha"
        }
        quiet={!(point === "start" && (element.isAnchor || element.isPinned))}
        reason={reason}
        onSave={(date) => onMoveDate(element.id, point, date)}
      />
    )
  }

  const renderNode = (node: ElementNode) => {
    const { element, depth, children } = node
    const expanded = toggled.has(element.id) !== (depth === 0)
    const hasChildren = children.length > 0
    const rule = describeRule(element, dependencies, nameOf)
    const selected = element.id === selectedId

    return (
      <li key={element.id} role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
        <div
          aria-selected={selected}
          className={cn(
            COLUMNS,
            "group/row border-border/40 h-9 border-b pr-2 text-sm transition-colors",
            selected ? "bg-primary/5 shadow-[inset_2px_0_0_var(--primary)]" : "hover:bg-muted/40"
          )}
        >
          <div
            className="flex min-w-0 items-center gap-2"
            style={{ paddingLeft: `${depth * 20 + 4}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(element.id)}
                aria-label={`${expanded ? "Plegar" : "Desplegar"} ${element.name}`}
                className="text-muted-foreground hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded"
              >
                <IconChevronRight
                  size={14}
                  className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                />
              </button>
            ) : (
              <span className="size-5 shrink-0" />
            )}
            <span
              aria-hidden
              title={ELEMENT_KIND_LABELS[element.kind]}
              className={cn("shrink-0 rounded-full", depth === 0 ? "h-4 w-1" : "size-1.5")}
              style={{ backgroundColor: shade(node.phaseColor, depth) }}
            />
            <button
              type="button"
              onClick={() => onOpen(element.id)}
              aria-label={`Ver el detalle de ${element.name}`}
              className={cn(
                "hover:text-primary truncate text-left transition-colors",
                depth === 0 && "font-semibold"
              )}
            >
              {element.name}
            </button>
            {element.isAnchor ? (
              <span className={cn(CHIP, "bg-primary/10 text-primary")} title="Fecha clave del plan">
                <IconAnchor size={11} aria-hidden />
                clave
              </span>
            ) : element.isPinned ? (
              <span className={cn(CHIP, "bg-muted text-muted-foreground")} title="Fecha fija">
                <IconPin size={11} aria-hidden />
                fija
              </span>
            ) : (
              rule && (
                <span
                  className={cn(
                    CHIP,
                    "bg-muted text-muted-foreground truncate transition-opacity",
                    !selected && "opacity-0 group-hover/row:opacity-100"
                  )}
                >
                  {rule}
                </span>
              )
            )}
          </div>

          <DurationEditor
            label={`Duración de ${element.name}`}
            value={element.duration}
            editable={editable}
            pending={pending}
            emptyLabel="+ duración"
            quiet
            onSave={(duration) => onUpdate(element.id, { duration })}
          />
          {dateCell(element, "start")}
          {dateCell(element, "end")}
        </div>
        {hasChildren && expanded && <ul role="group">{children.map(renderNode)}</ul>}
      </li>
    )
  }

  return (
    <div>
      <div
        className={`${COLUMNS} text-muted-foreground border-border h-8 border-b pr-2 text-xs font-medium`}
        aria-hidden
      >
        <span className="pl-8">Elemento</span>
        <span className="px-1.5">Duración</span>
        <span className="px-1.5">Inicio</span>
        <span className="px-1.5">Fin</span>
      </div>
      <ul role="tree" aria-label="Fases del proyecto">
        {nodes.map(renderNode)}
      </ul>
    </div>
  )
}
