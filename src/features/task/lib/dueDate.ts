import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export type DueState = "overdue" | "today" | "soon" | "later" | "none"

/** Orden de urgencia; se usa para agrupar y para ordenar. */
export const DUE_STATE_ORDER: DueState[] = ["overdue", "today", "soon", "later", "none"]

export const DUE_STATE_LABELS: Record<DueState, string> = {
  overdue: "Atrasadas",
  today: "Para hoy",
  soon: "Esta semana",
  later: "Más adelante",
  none: "Sin fecha",
}

/** Clases del chip de fecha, sobre los tokens del design system. */
export const DUE_STATE_CHIP: Record<DueState, string> = {
  overdue: "bg-destructive/15 text-destructive",
  today: "bg-warn/15 text-warn",
  soon: "bg-p2/15 text-p2",
  // Translucido y no bg-muted: ese token es opaco y practicamente del mismo
  // tono que la tarjeta, asi que la pildora desaparecia.
  later: "bg-foreground/10 text-foreground/70",
  none: "bg-foreground/10 text-foreground/70",
}

/**
 * Clasifica una fecha de vencimiento respecto a hoy. Se compara por días de
 * calendario, no por horas: una tarea que vence hoy no pasa a «atrasada» por
 * la tarde.
 */
export const getDueState = (dueDate: string | null | undefined): DueState => {
  if (!dueDate) return "none"
  const days = differenceInCalendarDays(parseISO(dueDate), new Date())
  if (days < 0) return "overdue"
  if (days === 0) return "today"
  if (days <= 7) return "soon"
  return "later"
}

/** Etiqueta corta para el chip: «Ayer», «Hoy», «En 3 días», «12 mar». */
export const formatDueLabel = (dueDate: string | null | undefined): string => {
  if (!dueDate) return "Sin fecha"
  const days = differenceInCalendarDays(parseISO(dueDate), new Date())
  if (days === 0) return "Hoy"
  if (days === 1) return "Mañana"
  if (days === -1) return "Ayer"
  if (days < 0) return `Hace ${Math.abs(days)} días`
  if (days <= 7) return `En ${days} días`
  return format(parseISO(dueDate), "d MMM", { locale: es })
}

/**
 * Date -> ISO yyyy-MM-dd, que es lo que guarda una columna `date` de Postgres.
 * Se formatea con los componentes LOCALES a propósito: toISOString() pasa por
 * UTC y en husos negativos devuelve el día anterior, así que una tarea elegida
 * para el día 8 se guardaría como el 7.
 */
export const toISODate = (date: Date): string => format(date, "yyyy-MM-dd")

/** Fecha completa, para tooltips y detalle. */
export const formatDueFull = (dueDate: string): string =>
  format(parseISO(dueDate), "d 'de' MMMM 'de' yyyy", { locale: es })

/** Agrupa por estado de vencimiento conservando el orden de entrada. */
export const groupByDueState = <T extends { due_date?: string | null }>(
  items: T[]
): { state: DueState; items: T[] }[] => {
  const groups = new Map<DueState, T[]>()
  for (const item of items) {
    const state = getDueState(item.due_date)
    const bucket = groups.get(state)
    if (bucket) bucket.push(item)
    else groups.set(state, [item])
  }
  return DUE_STATE_ORDER.filter((s) => groups.has(s)).map((state) => ({
    state,
    items: groups.get(state)!,
  }))
}
