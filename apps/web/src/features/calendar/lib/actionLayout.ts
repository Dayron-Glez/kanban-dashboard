import { fromIsoDate, type EpochDay } from "@repo/domain"
import type { ElementNode } from "./elementTree"
import { cellAt, type Timeline } from "./timeline"

/** Un periodo: dura más de un día, o es una contratación sin baja. Lo demás va en su día. */
export const isPeriod = ({ element }: ElementNode) =>
  element.endsOn == null ? element.kind === "hiring" : element.endsOn !== element.startsOn

/** Lo que ocupa un periodo en la rejilla. Sin baja, tres celdas: no se sabe hasta cuándo. */
export function periodSpan(action: ElementNode, timeline: Timeline) {
  const start = fromIsoDate(action.element.startsOn!)
  const end = action.element.endsOn
    ? fromIsoDate(action.element.endsOn)
    : start + 3 * cellAt(timeline, start).days - 1
  return { start, end }
}

export interface ActionLayout {
  /** Los periodos, repartidos en carriles sin que se pisen. */
  lanes: ElementNode[][]
  /** Por celda, lo que se resume en ella: las de un día y los periodos que no caben. */
  cells: Map<EpochDay, ElementNode[]>
}

/**
 * Coloca las acciones de una fila: cada periodo en el primer carril donde no pisa
 * a otro, hasta `maxLanes`; los que no caben y las de un día se agrupan en la
 * celda donde empiezan.
 */
export function layoutActions(
  actions: ElementNode[],
  timeline: Timeline,
  maxLanes: number
): ActionLayout {
  const dated = actions.filter((action) => action.element.startsOn)
  const lanes: { action: ElementNode; end: EpochDay }[][] = []
  const cells = new Map<EpochDay, ElementNode[]>()
  const addToCell = (action: ElementNode) => {
    const start = cellAt(timeline, fromIsoDate(action.element.startsOn!)).start
    cells.set(start, [...(cells.get(start) ?? []), action])
  }

  const periods = dated
    .filter(isPeriod)
    .map((action) => ({ action, ...periodSpan(action, timeline) }))
    .sort((a, b) => a.start - b.start || b.end - a.end)
  for (const period of periods) {
    const lane = lanes.find((candidate) => candidate.at(-1)!.end < period.start)
    if (lane) lane.push(period)
    else if (lanes.length < maxLanes) lanes.push([period])
    else addToCell(period.action)
  }
  dated.filter((action) => !isPeriod(action)).forEach(addToCell)

  return { lanes: lanes.map((lane) => lane.map(({ action }) => action)), cells }
}
