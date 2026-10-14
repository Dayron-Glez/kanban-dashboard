/** Lo que se puede mostrar u ocultar en el Gantt: filas de la cabecera y columnas de la tabla. */
export interface GanttFields {
  month: boolean
  week: boolean
  day: boolean
  duration: boolean
  start: boolean
  end: boolean
}

export const GANTT_FIELDS = [
  { key: "month", label: "Mes", group: "Cabecera" },
  { key: "week", label: "Semana", group: "Cabecera" },
  { key: "day", label: "Día", group: "Cabecera" },
  { key: "duration", label: "Duración", group: "Columnas" },
  { key: "start", label: "Inicio", group: "Columnas" },
  { key: "end", label: "Fin", group: "Columnas" },
] as const satisfies readonly { key: keyof GanttFields; label: string; group: string }[]

export const DEFAULT_GANTT_FIELDS: GanttFields = {
  month: true,
  week: true,
  day: true,
  duration: true,
  start: false,
  end: false,
}

const STORAGE_KEY = "cauce.gantt.campos"

/** Lo que eligió este navegador la última vez; si no hay nada (o falla), lo de serie. */
export function loadGanttFields(): GanttFields {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<GanttFields>
    return { ...DEFAULT_GANTT_FIELDS, ...saved }
  } catch {
    return DEFAULT_GANTT_FIELDS
  }
}

export function saveGanttFields(fields: GanttFields) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields))
  } catch {
    // Sin almacenamiento (modo privado): la elección dura lo que la pestaña.
  }
}

/** Las columnas de la parte de tabla junto al Gantt, y lo que ocupa (rem). */
export function tableLayout(fields: GanttFields) {
  const columns = [
    "minmax(0,1fr)",
    fields.duration && "6.5rem",
    fields.start && "7rem",
    fields.end && "7rem",
  ].filter(Boolean)
  const width = 17.5 + (fields.duration ? 6.5 : 0) + (fields.start ? 7 : 0) + (fields.end ? 7 : 0)
  return { gridTemplateColumns: columns.join(" "), width: `${width}rem` }
}
