import { SINGLE_DAY_ACTION_KINDS, type ActionKind, type ElementDependency } from "@repo/contracts"
import { fromIsoDate, type EpochDay } from "@repo/domain"
import { cn } from "@/shared/index"
import { draggedSpan, useBarDrag } from "../hooks/useBarDrag"
import { isPeriod, layoutActions, periodSpan } from "../lib/actionLayout"
import { ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { formatShortDay } from "../lib/planFormat"
import { barDragModes, cellAt, timelineX, type BarDrag, type Timeline } from "../lib/timeline"
import { ACTION_COLOR } from "../lib/actionStyle"
import { ActionContextMenu, type ActionMenuHandlers } from "./ActionContextMenu"
import { ActionGlyph } from "./ActionGlyph"

const short = (iso: string) => formatShortDay(fromIsoDate(iso))
const label = (action: ElementNode) => {
  const { kind, name, startsOn, endsOn } = action.element
  const when =
    endsOn && endsOn !== startsOn ? `${short(startsOn!)} → ${short(endsOn)}` : short(startsOn!)
  return `${ELEMENT_KIND_LABELS[kind]}: ${name}, ${when}`
}
// Los tipos de una marca, para resaltarla con su filtro (ver tailwind.css).
const kindsOf = (list: ElementNode[]) =>
  [...new Set(list.map((action) => action.element.kind))].join(" ")
const countLabel = (list: ElementNode[]) =>
  `${list.length} ${list.length === 1 ? "acción" : "acciones"}: ${list.map(label).join("\n")}`

// Invertido (fondo del color del texto): se lee en los dos temas y no compite con
// los colores de las fases ni con el cian de hoy y de la selección.
const COUNT =
  "bg-foreground text-background pointer-events-none absolute flex -translate-1/2 items-center justify-center rounded-full font-bold tabular-nums"

// La línea de un periodo, con el color de su tipo.
const periodShape = (kind: string, endless: boolean) =>
  cn(
    "absolute rounded-full",
    ACTION_COLOR[kind as ActionKind],
    kind === "hiring"
      ? "bg-[repeating-linear-gradient(90deg,currentColor_0_6px,transparent_6px_9px)]"
      : "bg-current",
    endless && "[mask-image:linear-gradient(90deg,#000_50%,transparent)]"
  )

const cellCenter = (start: EpochDay, timeline: Timeline) =>
  timelineX(start, timeline) + (cellAt(timeline, start).days * timeline.pxPerDay) / 2

interface ActionLaneProps {
  /** El elemento cuyas acciones se pintan, en su fila «Acciones». */
  node: ElementNode
  timeline: Timeline
  onOpen: (elementId: string) => void
  /** Si se pueden arrastrar: la propietaria, y sin otro cambio guardándose. */
  editable: boolean
  dependencies: ElementDependency[]
  onDrag: (elementId: string, drag: BarDrag, days: number) => void
  limit?: (
    elementId: string,
    drag: BarDrag,
    days: number
  ) => { days: number; reason: string | null }
  /** El clic derecho: cambiar de tipo y borrar. Sin él, el menú solo abre. */
  menu?: ActionMenuHandlers
}

// En la fila de 48 px: las de un día y los números arriba, los periodos en dos carriles debajo.
const POINT_Y = 17
const LANE_Y = [31, 39]

/**
 * La fila «Acciones» de un elemento: las de un día con la forma de su tipo, los
 * periodos como líneas en dos carriles y, donde no caben, un número. Se arrastran
 * como las barras: el cuerpo las mueve y el borde del fin las alarga.
 */
export function ActionLane({
  node,
  timeline,
  onOpen,
  editable,
  dependencies,
  onDrag,
  limit,
  menu,
}: Readonly<ActionLaneProps>) {
  const { lanes, cells } = layoutActions(node.actions, timeline, LANE_Y.length)

  // Como en las barras, pero reuniones y recordatorios no se alargan: son de un día.
  const freeOf = (action: ElementNode) => {
    if (!editable) return null
    const modes = barDragModes(action.element, dependencies)
    if (modes.locked) return null
    const single = SINGLE_DAY_ACTION_KINDS.includes(action.element.kind as ActionKind)
    return { start: false, end: modes.end && !single }
  }
  const markProps = (action: ElementNode, y: number) => ({
    action,
    timeline,
    y,
    free: freeOf(action),
    onOpen: () => onOpen(action.element.id),
    onDrag: (drag: BarDrag, days: number) => onDrag(action.element.id, drag, days),
    limit: limit && ((drag: BarDrag, days: number) => limit(action.element.id, drag, days)),
    menu: editable ? menu : undefined,
  })

  return (
    <div>
      {lanes.map((lane, index) =>
        lane.map((action) => (
          <ActionMark key={action.element.id} {...markProps(action, LANE_Y[index]!)} />
        ))
      )}
      {[...cells].map(([start, list]) =>
        list.length === 1 && timeline.zoom === "dia" && !isPeriod(list[0]!) ? (
          <ActionMark key={start} {...markProps(list[0]!, POINT_Y)} />
        ) : (
          <span
            key={start}
            data-action-kind={kindsOf(list)}
            title={list.map(label).join("\n")}
            aria-label={countLabel(list)}
            className={cn(COUNT, "h-[18px] min-w-5 px-1.5 text-xs")}
            style={{ left: cellCenter(start, timeline), top: POINT_Y }}
          >
            {list.length}
          </span>
        )
      )}
    </div>
  )
}

/**
 * El resumen de lo que hay dentro de una fila plegada, debajo de su barra: marcas
 * pequeñas y una línea fina por periodo. No se toca: para eso se despliega.
 */
export function ActionRollup({
  actions,
  timeline,
}: Readonly<{ actions: ElementNode[]; timeline: Timeline }>) {
  if (actions.length === 0) return null
  const { lanes, cells } = layoutActions(actions, timeline, 1)
  return (
    <div className="pointer-events-none">
      {lanes[0]?.map((action) => {
        const { start, end } = periodSpan(action, timeline)
        return (
          <span
            key={action.element.id}
            data-action-kind={action.element.kind}
            role="img"
            aria-label={label(action)}
            title={label(action)}
            // Los mismos colores, más apagados, para no competir con la barra; los números no.
            className={cn(
              periodShape(action.element.kind, !action.element.endsOn),
              "h-[3px] opacity-65"
            )}
            style={{
              top: 42,
              left: timelineX(start, timeline) + 4,
              width: Math.max((end - start + 1) * timeline.pxPerDay - 8, 4),
            }}
          />
        )
      })}
      {[...cells].map(([start, list]) =>
        list.length === 1 && timeline.zoom === "dia" ? (
          <span
            key={start}
            data-action-kind={kindsOf(list)}
            role="img"
            aria-label={label(list[0]!)}
            title={label(list[0]!)}
            className="absolute flex -translate-1/2 items-center justify-center"
            style={{ left: cellCenter(start, timeline), top: 34 }}
          >
            <ActionGlyph
              kind={list[0]!.element.kind as ActionKind}
              className="size-[13px] opacity-65"
            />
          </span>
        ) : (
          <span
            key={start}
            data-action-kind={kindsOf(list)}
            title={list.map(label).join("\n")}
            aria-label={countLabel(list)}
            className={cn(COUNT, "h-4 min-w-[18px] px-1.5 text-[10px]")}
            style={{ left: cellCenter(start, timeline), top: 34 }}
          >
            {list.length}
          </span>
        )
      )}
    </div>
  )
}

interface ActionMarkProps {
  action: ElementNode
  timeline: Timeline
  /** El centro vertical, en píxeles desde arriba de la fila. */
  y: number
  free: { start: boolean; end: boolean } | null
  onOpen: () => void
  onDrag: (drag: BarDrag, days: number) => void
  limit?: (drag: BarDrag, days: number) => { days: number; reason: string | null }
  menu?: ActionMenuHandlers
}

// Una acción: un periodo (línea) o un día (su forma), que se abre, se arrastra y
// tiene su menú con el clic derecho.
function ActionMark({
  action,
  timeline,
  y,
  free,
  onOpen,
  onDrag,
  limit,
  menu,
}: Readonly<ActionMarkProps>) {
  const { state, begin, pointer, onKeyDown, onClick } = useBarDrag({
    timeline,
    free,
    onOpen,
    onDrag,
    limit,
  })
  const start = fromIsoDate(action.element.startsOn!)
  const end = action.element.endsOn ? fromIsoDate(action.element.endsOn) : null
  const span = draggedSpan(start, end, state)
  const x = (day: EpochDay) => timelineX(day, timeline)
  const moving = state != null && state.days !== 0

  const common = {
    type: "button" as const,
    "data-bar": true,
    "data-action-kind": action.element.kind,
    "aria-label": label(action),
    "aria-keyshortcuts": free ? "ArrowLeft ArrowRight" : undefined,
    title: label(action),
    onKeyDown,
    onClick,
    ...pointer,
  }

  const dates = state != null && (moving || state.reason != null) && (
    <span
      aria-hidden
      className="bg-foreground text-background pointer-events-none absolute top-1 z-20 -translate-y-full rounded px-1.5 py-0.5 text-sm font-medium whitespace-nowrap tabular-nums shadow-sm"
      style={{ left: x(span.start) }}
    >
      {formatShortDay(span.start)}
      {span.end != null && span.end !== span.start && ` → ${formatShortDay(span.end)}`}
      {state.reason && ` · tope: ${state.reason}`}
    </span>
  )

  if (!isPeriod(action)) {
    return (
      <>
        {dates}
        <ActionContextMenu action={action.element} onOpen={onOpen} handlers={menu}>
          <button
            {...common}
            className={cn(
              "absolute z-[2] flex size-5 -translate-1/2 touch-none items-center justify-center hover:scale-125",
              free ? "cursor-grab" : "cursor-pointer",
              moving && "cursor-grabbing"
            )}
            style={{ left: cellCenter(span.start, timeline), top: y }}
          >
            <ActionGlyph kind={action.element.kind as ActionKind} />
          </button>
        </ActionContextMenu>
      </>
    )
  }

  const width =
    span.end == null
      ? 3 * cellAt(timeline, span.start).days * timeline.pxPerDay
      : (span.end - span.start + 1) * timeline.pxPerDay
  return (
    <>
      {dates}
      <ActionContextMenu action={action.element} onOpen={onOpen} handlers={menu}>
        <button
          {...common}
          className={cn(
            periodShape(action.element.kind, span.end == null),
            "z-[2] h-1 -translate-y-1/2 touch-none hover:h-1.5",
            free ? "cursor-grab" : "cursor-pointer",
            moving && "h-1.5 cursor-grabbing"
          )}
          style={{ top: y + 2, left: x(span.start) + 4, width: Math.max(width - 8, 6) }}
        >
          {free?.end && (
            <span
              aria-hidden
              onPointerDown={begin("end")}
              className="absolute -inset-y-2 -right-1.5 w-3 cursor-ew-resize"
            />
          )}
        </button>
      </ActionContextMenu>
    </>
  )
}
