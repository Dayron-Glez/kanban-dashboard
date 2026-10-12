import { useState } from "react"
import { IconAnchor, IconChevronRight, IconPin } from "@tabler/icons-react"
import type {
  CalendarElement,
  DatePoint,
  ElementDependency,
  UpdateElementPlanInput,
} from "@repo/contracts"
import { fromIsoDate, positionOf, spanOf } from "@repo/domain"
import { cn } from "@/shared/index"
import { ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { describeIssue, describeRule, formatDuration, formatPlanDate } from "../lib/planFormat"
import { trackBackground, type PlanView, type Timeline } from "../lib/timeline"
import { DateEditor, DurationEditor } from "./PlanEditors"
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
  view = "tabla",
  timeline = null,
}: Readonly<ElementTreeProps>) {
  // Las fases empiezan abiertas y el resto cerrado: se guarda lo que el usuario cambia.
  const [toggled, setToggled] = useState<Set<string>>(new Set())
  const showTimeline = view !== "tabla" && timeline != null
  const background = showTimeline ? trackBackground(timeline) : undefined

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
    if (!timeline) return null
    const { element, depth } = node
    if (!element.startsOn) return null
    const start = fromIsoDate(element.startsOn)
    const color = shade(node.phaseColor, depth === 0 ? 0 : depth + 1) ?? "var(--muted-foreground)"
    const left = positionOf(start, timeline.range) * timeline.width
    const label = `${element.name}: ${formatPlanDate(element.startsOn)}${element.endsOn ? ` → ${formatPlanDate(element.endsOn)}` : ", sin fin"}`
    const selected = element.id === selectedId
    const tooltip = rule ? `${label} · ${rule}` : label

    if (!element.endsOn) {
      // Sin fin: un punto y una estela que se desvanece.
      return (
        <button
          type="button"
          aria-label={label}
          title={tooltip}
          onClick={() => onOpen(element.id)}
          className="absolute top-1/2 flex -translate-y-1/2 items-center"
          style={{ left }}
        >
          <span className="size-2.5 rounded-full border-2" style={{ borderColor: color }} />
          <span
            className="h-0.5 w-8"
            style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
          />
        </button>
      )
    }

    const width = Math.max(
      spanOf(start, fromIsoDate(element.endsOn), timeline.range) * timeline.width,
      3
    )
    return (
      <button
        type="button"
        aria-label={label}
        title={tooltip}
        onClick={() => onOpen(element.id)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 overflow-hidden rounded-[5px] text-left transition-shadow",
          depth === 0 ? "h-[18px]" : "h-3.5",
          selected && "ring-primary ring-offset-background ring-2 ring-offset-1"
        )}
        style={{ left, width, backgroundColor: color }}
      >
        {depth === 0 && element.duration && width > 64 && (
          <span className="text-background absolute inset-y-0 left-2 flex items-center text-[11px] font-semibold whitespace-nowrap">
            {formatDuration(element.duration)}
          </span>
        )}
      </button>
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

  return (
    <div className={cn("relative", showTimeline && "overflow-x-auto")}>
      <div className={cn(showTimeline && "w-max min-w-full")}>
        <div className="border-border flex h-9 border-b text-xs font-medium">
          <div
            aria-hidden
            className={cn(
              "bg-background text-muted-foreground sticky left-0 z-10 grid shrink-0 items-center gap-2 pr-2",
              TABLE_COLUMNS[view],
              showTimeline && "border-border/60 border-r"
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
    </div>
  )
}
