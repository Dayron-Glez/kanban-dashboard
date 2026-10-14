import type { ActionKind } from "@repo/contracts"
import { fromIsoDate, type EpochDay } from "@repo/domain"
import { cn } from "@/shared/index"
import { descendantActions, ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { phaseVars } from "../lib/phaseColors"
import { formatShortDay } from "../lib/planFormat"
import { cellAt, timelineX, type Timeline } from "../lib/timeline"
import { ActionGlyph } from "./ActionGlyph"

interface ActionMarksProps {
  node: ElementNode
  /** Plegada, la fila enseña también las acciones de lo que cuelga de ella. */
  expanded: boolean
  timeline: Timeline
  onOpen: (elementId: string) => void
}

const label = (action: ElementNode) => {
  const { kind, name, startsOn, endsOn } = action.element
  const when =
    endsOn && endsOn !== startsOn ? `${short(startsOn!)} → ${short(endsOn)}` : short(startsOn!)
  return `${ELEMENT_KIND_LABELS[kind]}: ${name}, ${when}`
}
const short = (iso: string) => formatShortDay(fromIsoDate(iso))

// Un día o un periodo: lo que dura más de un día, o la contratación sin baja.
const isPeriod = (action: ElementNode) =>
  action.element.endsOn == null || action.element.endsOn !== action.element.startsOn

/**
 * Las acciones de una fila, en la franja de abajo de sus celdas. Los periodos son
 * barras finas; los días, una forma por tipo. Si en una celda hay varias, o son de
 * lo que cuelga de una fila plegada, un número.
 */
export function ActionMarks({ node, expanded, timeline, onOpen }: Readonly<ActionMarksProps>) {
  const own = node.actions.filter((action) => action.element.startsOn)
  const hidden = expanded ? [] : descendantActions(node).filter((action) => action.element.startsOn)
  if (own.length === 0 && hidden.length === 0) return null

  const x = (day: EpochDay) => timelineX(day, timeline)
  const cells = new Map<EpochDay, { own: ElementNode[]; hidden: ElementNode[] }>()
  const addPoint = (action: ElementNode, group: "own" | "hidden") => {
    const start = cellAt(timeline, fromIsoDate(action.element.startsOn!)).start
    const cell = cells.get(start) ?? { own: [], hidden: [] }
    cell[group].push(action)
    cells.set(start, cell)
  }
  own.filter((action) => !isPeriod(action)).forEach((action) => addPoint(action, "own"))
  hidden.filter((action) => !isPeriod(action)).forEach((action) => addPoint(action, "hidden"))

  const period = (action: ElementNode, faded: boolean) => {
    const start = fromIsoDate(action.element.startsOn!)
    const end = action.element.endsOn ? fromIsoDate(action.element.endsOn) : null
    // Sin baja, un tramo que se desvanece: no se sabe hasta cuándo.
    const width =
      end == null
        ? 3 * cellAt(timeline, start).days * timeline.pxPerDay
        : (end - start + 1) * timeline.pxPerDay
    const shape = cn(
      "absolute top-[27px] h-1.5 rounded-full",
      action.element.kind === "hiring"
        ? "bg-[repeating-linear-gradient(90deg,currentColor_0_6px,transparent_6px_9px)]"
        : "bg-current",
      end == null && "[mask-image:linear-gradient(90deg,#000_50%,transparent)]"
    )
    const style = { left: x(start) + 3, width: Math.max(width - 6, 6) }
    return faded ? (
      <span key={action.element.id} aria-hidden className={cn(shape, "opacity-50")} style={style} />
    ) : (
      <button
        key={action.element.id}
        type="button"
        data-bar
        aria-label={label(action)}
        title={label(action)}
        onClick={() => onOpen(action.element.id)}
        className={cn(shape, "cursor-pointer hover:h-2 hover:-translate-y-px")}
        style={style}
      />
    )
  }

  return (
    <div className="phase-ink" style={phaseVars(node.phaseColor)}>
      {own.filter(isPeriod).map((action) => period(action, false))}
      {hidden.filter(isPeriod).map((action) => period(action, true))}
      {[...cells].map(([start, cell]) => {
        const width = cellAt(timeline, start).days * timeline.pxPerDay
        const total = cell.own.length + cell.hidden.length
        const single = total === 1 && cell.own[0] && timeline.zoom === "dia" ? cell.own[0] : null
        if (single) {
          return (
            <button
              key={start}
              type="button"
              data-bar
              aria-label={label(single)}
              title={label(single)}
              onClick={() => onOpen(single.element.id)}
              className="absolute top-[24px] flex h-3 -translate-x-1/2 cursor-pointer items-center justify-center hover:scale-125"
              style={{ left: x(start) + width / 2 }}
            >
              <ActionGlyph kind={single.element.kind as ActionKind} />
            </button>
          )
        }
        const names = [...cell.own, ...cell.hidden].map(label).join("\n")
        return (
          <span
            key={start}
            title={names}
            aria-label={`${total} ${total === 1 ? "acción" : "acciones"}: ${names}`}
            className="bg-background border-border text-foreground pointer-events-none absolute top-[23px] flex h-[15px] min-w-[18px] -translate-x-1/2 items-center justify-center rounded-full border px-1 text-[10px] font-bold tabular-nums"
            style={{ left: x(start) + width / 2 }}
          >
            {total}
          </span>
        )
      })}
    </div>
  )
}
