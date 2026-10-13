import type { Ref } from "react"
import { IconAnchor, IconChevronRight, IconPin } from "@tabler/icons-react"
import type {
  CalendarElement,
  DatePoint,
  ElementDependency,
  UpdateElementPlanInput,
} from "@repo/contracts"
import { cn, ScrollArea, ScrollBar } from "@/shared/index"
import { ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { describeIssue, describeRule, formatPlanDate } from "../lib/planFormat"
import {
  barDragModes,
  trackBackground,
  type BarDrag,
  type PlanView,
  type Timeline,
} from "../lib/timeline"
import { DateEditor, DurationEditor } from "./PlanEditors"
import { TimelineBar } from "./TimelineBar"
import { TimelineScale } from "./TimelineScale"

interface ElementTreeProps {
  nodes: ElementNode[]
  dependencies: ElementDependency[]
  editable: boolean
  pending: boolean
  onUpdate: (elementId: string, input: UpdateElementPlanInput) => void
  onOpen: (elementId: string) => void
  /** Escribir a mano el inicio o el fin: la regla que lo produce se ajusta. */
  onMoveDate: (elementId: string, point: DatePoint, date: string) => void
  /** Una barra arrastrada o movida con las flechas, en días. */
  onDragBar: (elementId: string, drag: BarDrag, days: number) => void
  /** Hasta dónde puede llegar un arrastre sin romper el orden de las fases. */
  limitDrag?: (
    elementId: string,
    drag: BarDrag,
    days: number
  ) => { days: number; reason: string | null }
  /** El elemento que hace scroll, para llevar el Gantt a un día. */
  viewportRef?: Ref<HTMLDivElement>
  /** Lo desplegado. Todo empieza plegado. */
  expanded: ReadonlySet<string>
  onToggle: (elementId: string) => void
  selectedId?: string | null
  view?: PlanView
  timeline?: Timeline | null
}

// Los hijos toman el color de su fase, más claro cuanto más hondo.
const shade = (color: string | null, depth: number) =>
  color
    ? `color-mix(in oklch, ${color} ${Math.max(100 - depth * 25, 30)}%, transparent)`
    : undefined

// Las columnas de la parte de tabla, según la vista: con cronograma, las
// fechas se leen en las barras y la tabla se queda con el nombre.
const TABLE_COLUMNS: Record<PlanView, string> = {
  tabla: "grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] flex-1",
  ambos: "grid-cols-[minmax(0,1fr)_6.5rem] w-[24rem]",
  cronograma: "grid-cols-[minmax(0,1fr)] w-[16rem]",
}

// Lo que ocupa la parte de tabla junto al Gantt: la barra horizontal empieza ahí,
// porque esa parte no se desplaza.
const TABLE_WIDTH: Record<PlanView, string> = { tabla: "0", ambos: "24rem", cronograma: "16rem" }

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
  onDragBar,
  limitDrag,
  expanded: expandedIds,
  onToggle,
  viewportRef,
  selectedId = null,
  view = "tabla",
  timeline = null,
}: Readonly<ElementTreeProps>) {
  const showTimeline = view !== "tabla" && timeline != null
  // Lo que contiene al elemento seleccionado se abre solo, para que se vea.
  const selectedPath = new Set<string>()
  const findPath = (list: ElementNode[], path: string[]): boolean =>
    list.some((node) => {
      if (node.element.id === selectedId) {
        path.forEach((id) => selectedPath.add(id))
        return true
      }
      return findPath(node.children, [...path, node.element.id])
    })
  if (selectedId) findPath(nodes, [])
  const background = showTimeline ? trackBackground(timeline) : undefined

  const names = new Map<string, string>()
  const collect = (list: ElementNode[]) =>
    list.forEach((node) => {
      names.set(node.element.id, node.element.name)
      collect(node.children)
    })
  collect(nodes)
  const nameOf = (id: string) => names.get(id) ?? "otro elemento"

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
    const writesStart = point === "start" && (element.isAnchor || element.isPinned)
    return (
      <DateEditor
        label={`${point === "start" ? "Inicio" : "Fin"} de ${element.name}`}
        value={value}
        editable
        pending={pending}
        emptyLabel={writesStart ? "Escribir fecha" : "+ fecha"}
        quiet={!writesStart}
        reason={reason}
        onSave={(date) => onMoveDate(element.id, point, date)}
      />
    )
  }

  const bar = (node: ElementNode, rule: string | null) => {
    if (!timeline || !node.element.startsOn) return null
    const { element, depth } = node
    const label = `${element.name}: ${formatPlanDate(element.startsOn!)}${element.endsOn ? ` → ${formatPlanDate(element.endsOn)}` : ", sin fin"}`
    const modes = barDragModes(element, dependencies)
    const lockedBy = modes.locked ? `Se mueve con ${modes.by.map(nameOf).join(" y ")}` : null
    const tooltip = [label, rule, editable ? lockedBy : null].filter(Boolean).join(" · ")
    return (
      <TimelineBar
        element={element}
        isPhase={depth === 0}
        color={shade(node.phaseColor, depth === 0 ? 0 : depth + 1) ?? "var(--muted-foreground)"}
        timeline={timeline}
        selected={element.id === selectedId}
        tooltip={tooltip}
        modes={editable && !pending ? modes : null}
        onOpen={() => onOpen(element.id)}
        onDrag={(drag, days) => onDragBar(element.id, drag, days)}
        limit={limitDrag && ((drag, days) => limitDrag(element.id, drag, days))}
      />
    )
  }

  const renderNode = (node: ElementNode) => {
    const { element, depth, children } = node
    const expanded = expandedIds.has(element.id) || selectedPath.has(element.id)
    const hasChildren = children.length > 0
    const rule = describeRule(element, dependencies, nameOf)
    const selected = element.id === selectedId

    return (
      <li key={element.id} role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
        <div
          aria-selected={selected}
          className={cn(
            "group/row border-border/40 flex h-9 border-b text-sm transition-colors",
            selected ? "bg-primary/5" : "hover:bg-muted/40"
          )}
        >
          <div
            className={cn(
              "bg-background sticky left-0 z-10 grid shrink-0 items-center gap-2 pr-2",
              TABLE_COLUMNS[view],
              showTimeline && "border-border/60 border-r",
              selected && "shadow-[inset_2px_0_0_var(--primary)]"
            )}
          >
            <div
              className="flex min-w-0 items-center gap-2"
              style={{ paddingLeft: `${depth * 20 + 4}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggle(element.id)}
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
                title={element.name}
                className={cn(
                  "hover:text-primary min-w-0 truncate text-left transition-colors",
                  depth === 0 && "font-semibold"
                )}
              >
                {element.name}
              </button>
              {element.isAnchor ? (
                <span
                  className={cn(CHIP, "bg-primary/10 text-primary")}
                  title="Fecha clave del plan"
                >
                  <IconAnchor size={11} aria-hidden />
                  clave
                </span>
              ) : element.isPinned ? (
                <span className={cn(CHIP, "bg-muted text-muted-foreground")} title="Fecha fija">
                  <IconPin size={11} aria-hidden />
                  fija
                </span>
              ) : (
                // Con cronograma, la regla se lee en la barra y en el inspector; en la
                // tabla aparece al pasar el ratón, sin quitar sitio al nombre.
                rule &&
                view === "tabla" && (
                  <span
                    className={cn(
                      CHIP,
                      "bg-muted text-muted-foreground min-w-0 truncate",
                      !selected && "hidden group-hover/row:inline-flex"
                    )}
                  >
                    {rule}
                  </span>
                )
              )}
            </div>

            {view !== "cronograma" && (
              <DurationEditor
                label={`Duración de ${element.name}`}
                value={element.duration}
                editable={editable}
                pending={pending}
                emptyLabel="+ duración"
                quiet
                onSave={(duration) => onUpdate(element.id, { duration })}
              />
            )}
            {view === "tabla" && dateCell(element, "start")}
            {view === "tabla" && dateCell(element, "end")}
          </div>

          {showTimeline && (
            <div className="relative shrink-0" style={{ width: timeline.width, ...background }}>
              {bar(node, rule)}
            </div>
          )}
        </div>
        {hasChildren && expanded && <ul role="group">{children.map(renderNode)}</ul>}
      </li>
    )
  }

  const content = (
    <div className={cn(showTimeline && "w-max min-w-full")}>
      <div className="border-border bg-background sticky top-0 z-20 flex min-h-9 border-b text-xs font-medium">
        <div
          aria-hidden
          data-grid-labels
          // Con el Gantt, los títulos van a la altura de la fila de los días.
          className={cn(
            "bg-background text-muted-foreground sticky left-0 z-10 grid shrink-0 items-center gap-2 pr-2",
            TABLE_COLUMNS[view],
            showTimeline && "border-border/60 items-end border-r pb-2.5"
          )}
        >
          <span className="pl-8">Elemento</span>
          {view !== "cronograma" && <span className="px-1.5">Duración</span>}
          {view === "tabla" && <span className="px-1.5">Inicio</span>}
          {view === "tabla" && <span className="px-1.5">Fin</span>}
        </div>
        {showTimeline && <TimelineScale timeline={timeline} />}
      </div>

      <div>
        <ul role="tree" aria-label="Fases del proyecto">
          {nodes.map(renderNode)}
        </ul>
      </div>
    </div>
  )

  // La cuadrícula ocupa el alto que le dejan y lleva su propio scroll, con la
  // cabecera fija: las dos barras quedan siempre a la vista.
  return (
    <ScrollArea className="h-full w-full" viewportRef={viewportRef}>
      {content}
      {showTimeline && (
        <ScrollBar orientation="horizontal" className="z-30" style={{ left: TABLE_WIDTH[view] }} />
      )}
    </ScrollArea>
  )
}
