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

/** El ancho de la columna «Elemento» junto al Gantt, en píxeles: se arrastra entre min y max. */
export const NAME_WIDTH = { min: 160, max: 480, initial: 280 } as const

const NAME_WIDTH_KEY = "cauce.gantt.anchoElemento"

export const clampNameWidth = (width: number) =>
  Math.round(Math.min(NAME_WIDTH.max, Math.max(NAME_WIDTH.min, width)))

export function loadNameWidth(): number {
  try {
    const saved = Number(localStorage.getItem(NAME_WIDTH_KEY))
    return saved ? clampNameWidth(saved) : NAME_WIDTH.initial
  } catch {
    return NAME_WIDTH.initial
  }
}

export function saveNameWidth(width: number) {
  try {
    localStorage.setItem(NAME_WIDTH_KEY, String(width))
  } catch {
    // Sin almacenamiento: el ancho dura lo que la pestaña.
  }
}

/** El ancho de la columna contraída: la tira con la flecha y el color de cada fila. */
export const RAIL_WIDTH = 56

const flag = (key: string) => ({
  load: () => {
    try {
      return localStorage.getItem(key) === "1"
    } catch {
      return false
    }
  },
  save: (value: boolean) => {
    try {
      localStorage.setItem(key, value ? "1" : "0")
    } catch {
      // Sin almacenamiento: dura lo que la pestaña.
    }
  },
})

/** Si la columna «Elemento» está contraída. */
export const railFlag = flag("cauce.gantt.columnaContraida")
/** Si ya se vio la nota que explica la columna contraída. */
export const railHintFlag = flag("cauce.gantt.pistaColumna")

/** Las columnas de la parte de tabla junto al Gantt, y lo que ocupa. */
export function tableLayout(fields: GanttFields, nameWidth: number = NAME_WIDTH.initial) {
  const columns = [
    "minmax(0,1fr)",
    fields.duration && "6.5rem",
    fields.start && "7rem",
    fields.end && "7rem",
  ].filter(Boolean)
  const extra = (fields.duration ? 6.5 : 0) + (fields.start ? 7 : 0) + (fields.end ? 7 : 0)
  return { gridTemplateColumns: columns.join(" "), width: `calc(${nameWidth}px + ${extra}rem)` }
}
