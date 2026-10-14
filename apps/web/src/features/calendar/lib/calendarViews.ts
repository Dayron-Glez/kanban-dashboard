/** Las vistas de calendario del prototipo: todas muestran el mismo plan, de otra forma. */
export const CALENDAR_VIEWS = [
  {
    id: "gantt",
    label: "Gantt (día a día)",
    description: "Una fila por fase, subfase y proceso; una columna por día",
    pending: null,
  },
  {
    id: "semanal-1",
    label: "Semanal 1",
    description: "Una columna por semana con los días efectivos de cada fase",
    pending: "Llega con los festivos",
  },
  {
    id: "vertical",
    label: "Vertical",
    description: "Un día por fila, con las fases en columnas y las acciones del día",
    pending: "Llega con las acciones",
  },
  {
    id: "mensual",
    label: "Mensual",
    description: "Un almanaque por mes, con las acciones de cada día",
    pending: "Llega con las acciones",
  },
  {
    id: "scroll",
    label: "Scroll",
    description: "Todo el calendario como lista de días, como la agenda del móvil",
    pending: "Llega con las acciones",
  },
  {
    id: "semanal-3",
    label: "Semanal 3",
    description: "Una semana con sus horas, como el calendario del móvil",
    pending: "Llega con las acciones y los horarios",
  },
  {
    id: "semanal-2",
    label: "Semanal 2",
    description: "Agenda de lunes a domingo con inicios de fase, acciones, altas y bajas",
    pending: "Llega con las acciones y el equipo",
  },
] as const satisfies readonly {
  id: string
  label: string
  description: string
  /** Si aún no se puede usar, con qué llega. */
  pending: string | null
}[]

export type CalendarView = (typeof CALENDAR_VIEWS)[number]["id"]

/** La vista de la URL, si existe y ya se puede usar; si no, el Gantt. */
export const pickView = (value: string | null): CalendarView =>
  CALENDAR_VIEWS.find((view) => view.id === value && view.pending == null)?.id ?? "gantt"
