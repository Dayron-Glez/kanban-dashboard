import type { Ref } from "react"
import {
  IconAlertTriangle,
  IconAnchor,
  IconChevronRight,
  IconChevronsDown,
  IconChevronsUp,
  IconPin,
} from "@tabler/icons-react"
import {
  ACTION_PARENT_KINDS,
  type CalendarElement,
  type CreateActionInput,
  type DatePoint,
  type ElementDependency,
  type UpdateElementPlanInput,
} from "@repo/contracts"
import {
  Button,
  cn,
  Popover,
  PopoverAnchor,
  PopoverContent,
  ScrollArea,
  ScrollBar,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/index"
import { useGanttCells } from "../hooks/useGanttCells"
import { actionsInSpan, ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { DEFAULT_GANTT_FIELDS, tableLayout, type GanttFields } from "../lib/ganttFields"
import { phaseTint } from "../lib/phaseColors"
import { describeIssue, describeRule, formatPlanDate, formatShortDay } from "../lib/planFormat"
import {
  barDragModes,
  cellAt,
  ROW_HEIGHT,
  timelineX,
  trackBackground,
  type BarDrag,
  type PlanView,
  type Timeline,
  type TimelineCell,
  type TimelineMarks,
} from "../lib/timeline"
import { ActionMarks } from "./ActionMarks"
import { CellMenu } from "./CellMenu"
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
  /** Crear una acción en las celdas elegidas; `done` cierra el menú si sale bien. */
  onCreateAction?: (parentId: string, input: CreateActionInput, done: () => void) => void
  creating?: boolean
  /** El elemento que hace scroll, para llevar el Gantt a un día. */
  viewportRef?: Ref<HTMLDivElement>
  /** Desplegar todo, o plegarlo si hay algo abierto: va en la cabecera de la columna. */
  onToggleAll?: () => void
  /** Lo desplegado. Todo empieza plegado. */
  expanded: ReadonlySet<string>
  onToggle: (elementId: string) => void
  selectedId?: string | null
  view?: PlanView
  /** Las columnas de la tabla junto al Gantt (en el móvil van todas). */
  fields?: Pick<GanttFields, "duration" | "start" | "end">
  /** Hoy, la semana 1 y los fines de semana, que la leyenda puede apagar. */
  marks?: TimelineMarks
  /** Las filas de la cabecera del Gantt. */
  headerRows?: Pick<GanttFields, "month" | "week" | "day">
  timeline?: Timeline | null
}

// En el móvil, la tabla con todas sus columnas; junto al Gantt, las que se elijan.
const MOBILE_TABLE = { gridTemplateColumns: "minmax(0,1fr) 7rem 7rem 7rem" }

const CHIP =
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-medium whitespace-nowrap"

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
  onCreateAction,
  creating = false,
  expanded: expandedIds,
  onToggle,
  onToggleAll,
  viewportRef,
  selectedId = null,
  view = "tabla",
  fields = DEFAULT_GANTT_FIELDS,
  headerRows = DEFAULT_GANTT_FIELDS,
  marks,
  timeline = null,
}: Readonly<ElementTreeProps>) {
  const showTimeline = view !== "tabla" && timeline != null
  const columns = view === "tabla" ? { duration: true, start: true, end: true } : fields
  const ganttTable = tableLayout({ ...DEFAULT_GANTT_FIELDS, ...fields })
  const table = view === "tabla" ? MOBILE_TABLE : ganttTable
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
  const background = showTimeline ? trackBackground(timeline, marks) : undefined
  const isOpen = (id: string) => expandedIds.has(id) || selectedPath.has(id)
  const visibleIds = (list: ElementNode[]): string[] =>
    list.flatMap((node) => [
      node.element.id,
      ...(isOpen(node.element.id) ? visibleIds(node.children) : []),
    ])
  const { hovered, selection, span, trackProps, menuOpen, closeMenu } = useGanttCells(
    showTimeline ? timeline : null,
    visibleIds(nodes)
  )

  const names = new Map<string, string>()
  const collect = (list: ElementNode[]) =>
    list.forEach((node) => {
      names.set(node.element.id, node.element.name)
      collect(node.children)
    })
  collect(nodes)
  const nameOf = (id: string) => names.get(id) ?? "otro elemento"

  const cellDays = (start: number) => (timeline ? cellAt(timeline, start).days : 1)
  const spanLabel = (cell: TimelineCell) => {
    const end = cell.start + cell.days - 1
    const days = `${cell.days} ${cell.days === 1 ? "día" : "días"}`
    return cell.days === 1
      ? formatShortDay(cell.start)
      : `${formatShortDay(cell.start)} → ${formatShortDay(end)} · ${days}`
  }

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
        tint={phaseTint(node.phaseColor, depth === 0)}
        timeline={timeline}
        selected={element.id === selectedId}
        tooltip={tooltip}
        modes={editable && !pending ? modes : null}
        onOpen={() => onOpen(element.id)}
        onDrag={(drag, days) => onDragBar(element.id, drag, days)}
        limit={limitDrag && ((drag, days) => limitDrag(element.id, drag, days))}
        weekends={(marks?.weekends ?? true) && timeline.zoom === "dia"}
      />
    )
  }

  // Lo que hay en las celdas elegidas y, si se puede, crear ahí.
  const cellMenu = (node: ElementNode, expanded: boolean) => {
    const { element } = node
    if (!menuOpen || selection?.id !== element.id || !span || !timeline) return null
    const end = span.days === cellDays(span.start) ? span.start : span.start + span.days - 1
    const inCell = actionsInSpan(node, expanded, span.start, span.start + span.days - 1)
    const canCreate =
      editable && onCreateAction != null && ACTION_PARENT_KINDS.includes(element.kind)
    if (inCell.length === 0 && !canCreate) return null
    return (
      <Popover open onOpenChange={(open) => !open && closeMenu()}>
        <PopoverAnchor asChild>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0"
            style={{
              left: timelineX(span.start, timeline),
              width: span.days * timeline.pxPerDay,
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-80 p-2"
          // Al cerrarse, el foco vuelve a la fila, para seguir con el teclado.
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            document
              .querySelector<HTMLElement>(`[data-track="${element.id}"]`)
              ?.focus({ preventScroll: true })
          }}
        >
          <CellMenu
            start={span.start}
            end={end}
            parentName={element.name}
            actions={inCell.map((action) => ({
              element: action.element,
              owner:
                action.element.parentId === element.id ? null : nameOf(action.element.parentId!),
            }))}
            canCreate={canCreate}
            pending={creating}
            onOpen={(id) => {
              closeMenu()
              onOpen(id)
            }}
            onCancel={closeMenu}
            onCreate={(input) => onCreateAction?.(element.id, input, closeMenu)}
          />
        </PopoverContent>
      </Popover>
    )
  }

  const renderNode = (node: ElementNode) => {
    const { element, depth, children } = node
    const expanded = isOpen(element.id)
    const hasChildren = children.length > 0
    const rule = describeRule(element, dependencies, nameOf)
    const selected = element.id === selectedId

    return (
      <li key={element.id} role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
        <div
          aria-selected={selected}
          className={cn(
            "group/row border-border/40 flex border-b text-base transition-colors",
            selected ? "bg-primary/5" : "hover:bg-muted/40"
          )}
          style={{ height: ROW_HEIGHT }}
        >
          <div
            className={cn(
              "bg-background sticky left-0 z-10 grid shrink-0 items-center gap-2 pr-2",
              view === "tabla" && "flex-1",
              showTimeline && "border-border/60 border-r",
              selected && "shadow-[inset_2px_0_0_var(--primary)]"
            )}
            style={table}
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
                className={cn(
                  "shrink-0 rounded-full",
                  depth === 0 ? "h-4 w-1" : "size-1.5",
                  phaseTint(node.phaseColor, depth === 0).className
                )}
                style={phaseTint(node.phaseColor, depth === 0).style}
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
                // Con el Gantt, la regla se lee en la barra y en el inspector; en la
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
              {view === "tabla" && node.actions.length > 0 && (
                // Sin rejilla (el móvil), las acciones de la fila se cuentan.
                <span className={cn(CHIP, "bg-muted text-muted-foreground")}>
                  {node.actions.length} {node.actions.length === 1 ? "acción" : "acciones"}
                </span>
              )}
              {depth === 0 && element.duration == null && (
                // Solo el icono: con texto, el badge cortaba el nombre de la fase.
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      aria-label="Sin duración"
                      className="bg-warn-soft text-warn border-warn/30 flex size-5 shrink-0 items-center justify-center rounded-full border"
                    >
                      <IconAlertTriangle size={11} aria-hidden />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Sin duración: no tiene fin, y lo que depende de ella tampoco
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {columns.duration && (
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
            {columns.start && dateCell(element, "start")}
            {columns.end && dateCell(element, "end")}
          </div>

          {showTimeline && (
            <div
              {...trackProps(element.id)}
              aria-label={`Días de ${element.name}`}
              // isolate: lo que se pinta dentro (barras, acciones) no pasa por encima
              // de la columna fija de la tabla al desplazar el Gantt.
              className="relative isolate shrink-0 outline-none"
              style={{ width: timeline.width, ...background }}
            >
              {hovered?.id === element.id && (
                <span
                  aria-hidden
                  className="bg-primary/10 ring-primary/60 pointer-events-none absolute inset-y-0 rounded-[3px] ring-1 ring-inset"
                  style={{
                    left: timelineX(hovered.cell.start, timeline),
                    width: hovered.cell.days * timeline.pxPerDay,
                  }}
                />
              )}
              {selection?.id === element.id && span && (
                <span
                  aria-hidden
                  data-cell-selection
                  className="bg-primary/15 ring-primary pointer-events-none absolute inset-y-0 rounded-[3px] ring-2 ring-inset"
                  style={{
                    left: timelineX(span.start, timeline),
                    width: span.days * timeline.pxPerDay,
                  }}
                >
                  {span.days > cellDays(span.start) && (
                    <span className="bg-primary text-primary-foreground absolute -top-1 left-0 z-20 -translate-y-full rounded px-1.5 py-0.5 text-sm font-medium whitespace-nowrap tabular-nums shadow-sm">
                      {spanLabel(span)}
                    </span>
                  )}
                </span>
              )}
              {cellMenu(node, expanded)}
              {bar(node, rule)}
              <ActionMarks node={node} expanded={expanded} timeline={timeline} onOpen={onOpen} />
            </div>
          )}
        </div>
        {hasChildren && expanded && <ul role="group">{children.map(renderNode)}</ul>}
      </li>
    )
  }

  const content = (
    <div className={cn(showTimeline && "w-max min-w-full")}>
      <div className="border-border bg-background sticky top-0 z-20 flex min-h-9 border-b text-sm font-medium">
        <div
          data-grid-labels
          // Con el Gantt, los títulos van a la altura de la fila de los días.
          className={cn(
            "bg-background text-muted-foreground sticky left-0 z-10 grid shrink-0 items-center gap-2 pr-2",
            view === "tabla" && "flex-1",
            showTimeline && "border-border/60 items-end border-r pb-2.5"
          )}
          style={table}
        >
          <span className="flex items-center gap-1 pl-1">
            {onToggleAll ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={onToggleAll}
                    aria-label={expandedIds.size > 0 ? "Plegar todo" : "Desplegar todo"}
                  >
                    {expandedIds.size > 0 ? (
                      <IconChevronsUp aria-hidden />
                    ) : (
                      <IconChevronsDown aria-hidden />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {expandedIds.size > 0 ? "Plegar todo" : "Desplegar todo"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className="size-8" />
            )}
            <span aria-hidden>Elemento</span>
          </span>
          {columns.duration && (
            <span aria-hidden className="px-1.5">
              Duración
            </span>
          )}
          {columns.start && (
            <span aria-hidden className="px-1.5">
              Inicio
            </span>
          )}
          {columns.end && (
            <span aria-hidden className="px-1.5">
              Fin
            </span>
          )}
        </div>
        {showTimeline && (
          <TimelineScale
            timeline={timeline}
            rows={headerRows}
            marks={marks}
            hovered={hovered?.cell.start ?? null}
          />
        )}
      </div>

      <div>
        {/* Lo elegido en el Gantt, para los lectores de pantalla. */}
        <span role="status" className="sr-only">
          {selection && span && `${names.get(selection.id) ?? ""}: ${spanLabel(span)}`}
        </span>
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
        <ScrollBar orientation="horizontal" className="z-30" style={{ left: ganttTable.width }} />
      )}
    </ScrollArea>
  )
}
