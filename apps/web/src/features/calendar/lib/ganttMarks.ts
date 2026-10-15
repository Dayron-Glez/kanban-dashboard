import type { TimelineMarks } from "./timeline"

/** Las marcas del tiempo que se encienden y apagan en el Gantt, desde «Vista». */
export const MARK_PARTS = [
  { key: "today", label: "Hoy" },
  { key: "week1", label: "Semana 1" },
  { key: "weekends", label: "Fines de semana" },
] as const satisfies readonly { key: keyof TimelineMarks; label: string }[]

export const DEFAULT_MARKS: TimelineMarks = { today: true, week1: true, weekends: true }

// La clave de cuando eran partes de la leyenda: así se conserva lo ya elegido.
const STORAGE_KEY = "cauce.gantt.leyenda"

export function loadMarks(): TimelineMarks {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<TimelineMarks>
    return {
      today: saved?.today ?? DEFAULT_MARKS.today,
      week1: saved?.week1 ?? DEFAULT_MARKS.week1,
      weekends: saved?.weekends ?? DEFAULT_MARKS.weekends,
    }
  } catch {
    return DEFAULT_MARKS
  }
}

export function saveMarks(marks: TimelineMarks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(marks))
  } catch {
    // Sin almacenamiento (modo privado): la elección dura lo que la pestaña.
  }
}
