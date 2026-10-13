/**
 * Las partes de la leyenda del Gantt. Hoy, la semana 1 y los fines de semana
 * se encienden y apagan también en el gráfico.
 */
export interface GanttLegend {
  /** Si la leyenda se ve. */
  visible: boolean
  today: boolean
  week1: boolean
  weekends: boolean
  bars: boolean
  marks: boolean
}

export type LegendPart = Exclude<keyof GanttLegend, "visible">

export const LEGEND_PARTS = [
  { key: "today", label: "Hoy (y su línea)" },
  { key: "week1", label: "Semana 1 (y su línea)" },
  { key: "weekends", label: "Fines de semana" },
  { key: "bars", label: "Tipos de barra" },
  { key: "marks", label: "Clave y fija" },
] as const satisfies readonly { key: LegendPart; label: string }[]

export const DEFAULT_LEGEND: GanttLegend = {
  visible: true,
  today: true,
  week1: true,
  weekends: true,
  bars: true,
  marks: true,
}

const STORAGE_KEY = "cauce.gantt.leyenda"

export function loadLegend(): GanttLegend {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<GanttLegend>
    return { ...DEFAULT_LEGEND, ...saved }
  } catch {
    return DEFAULT_LEGEND
  }
}

export function saveLegend(legend: GanttLegend) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legend))
  } catch {
    // Sin almacenamiento (modo privado): la elección dura lo que la pestaña.
  }
}

/** «Ver todo» enciende las seis partes si falta alguna; si están todas, las apaga. */
export function toggleAllParts(legend: GanttLegend): GanttLegend {
  const all = LEGEND_PARTS.every((part) => legend[part.key])
  return {
    ...legend,
    ...Object.fromEntries(LEGEND_PARTS.map((part) => [part.key, !all])),
  }
}
