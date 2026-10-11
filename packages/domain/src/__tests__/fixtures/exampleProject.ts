import type { DurationUnit } from "@repo/contracts"
import { fromIsoDate } from "../../planDates"
import type { ScheduleDependency, ScheduleElement } from "../../schedule"

// El proyecto de ejemplo del productor (Proyecto_de_ejemplo_plantilla.xlsx,
// hoja «Fases»), con los ids de su prototipo traducidos a nuestras claves de
// plantilla y sus reglas a dependencias con desfase literal.

type Duration = [amount: number, unit: DurationUnit]

const element = (
  id: string,
  duration: Duration | null,
  fixed: { anchor?: string; pinned?: string } = {}
): ScheduleElement => {
  const fixedStart = fixed.anchor ?? fixed.pinned
  return {
    id,
    durationAmount: duration?.[0] ?? null,
    durationUnit: duration?.[1] ?? null,
    isAnchor: fixed.anchor != null,
    isPinned: fixed.pinned != null,
    fixedStart: fixedStart ? fromIsoDate(fixedStart) : null,
  }
}

const dependency = (
  predecessor: [id: string, point: "start" | "end"],
  successor: [id: string, point: "start" | "end"],
  lag: Duration = [0, "days"]
): ScheduleDependency => ({
  predecessorId: predecessor[0],
  predecessorPoint: predecessor[1],
  successorId: successor[0],
  successorPoint: successor[1],
  lagAmount: lag[0],
  lagUnit: lag[1],
})

export const exampleElements: ScheduleElement[] = [
  element("desarrollo", [3, "months"], { pinned: "2026-01-01" }),
  element("softpre", [3.85, "months"]),
  element("preparacion", [9, "weeks"]),
  element("rodaje", [6, "weeks"], { anchor: "2027-04-05" }),
  element("rodaje.shooting", [6, "weeks"]),
  element("rodaje.wrap", [2, "weeks"]),
  element("postproduccion", [30, "weeks"]),
  element("postproduccion.edicion", [20, "weeks"]),
  element("postproduccion.vfx", [5, "weeks"]),
  element("postproduccion.vfx.creacion", [3, "weeks"]),
  element("postproduccion.vfx.integracion", [2.5, "weeks"]),
  element("postproduccion.vfx.render", [3, "days"]),
  element("explotacion", null),
]

export const exampleDependencies: ScheduleDependency[] = [
  // «Antes del inicio de»: termina el día antes y se cuenta hacia atrás.
  dependency(["preparacion", "start"], ["softpre", "end"], [-1, "days"]),
  dependency(["rodaje", "start"], ["preparacion", "end"], [-1, "days"]),
  // El Shooting de un rodaje sin bloques ocupa lo mismo que Rodaje.
  dependency(["rodaje", "start"], ["rodaje.shooting", "start"]),
  dependency(["rodaje", "end"], ["rodaje.shooting", "end"]),
  dependency(["rodaje.shooting", "end"], ["rodaje.wrap", "start"], [1, "days"]),
  dependency(["rodaje", "start"], ["postproduccion", "start"]),
  dependency(["postproduccion", "start"], ["postproduccion.edicion", "start"]),
  // «−4 semanas fin de Edición».
  dependency(["postproduccion.edicion", "end"], ["postproduccion.vfx", "start"], [-4, "weeks"]),
  dependency(["postproduccion.vfx", "start"], ["postproduccion.vfx.creacion", "start"]),
  dependency(
    ["postproduccion.vfx.creacion", "end"],
    ["postproduccion.vfx.integracion", "start"],
    [1, "days"]
  ),
  dependency(
    ["postproduccion.vfx.integracion", "end"],
    ["postproduccion.vfx.render", "start"],
    [1, "days"]
  ),
  dependency(["postproduccion", "end"], ["explotacion", "start"], [1, "days"]),
]

/** Las 12 filas con fechas de la hoja «Fases», tal como las calcula su prototipo. */
export const exampleExpectedDates: Record<string, [start: string, end: string]> = {
  desarrollo: ["2026-01-01", "2026-03-31"],
  softpre: ["2026-10-05", "2027-01-31"],
  preparacion: ["2027-02-01", "2027-04-04"],
  rodaje: ["2027-04-05", "2027-05-16"],
  "rodaje.shooting": ["2027-04-05", "2027-05-16"],
  "rodaje.wrap": ["2027-05-17", "2027-05-30"],
  postproduccion: ["2027-04-05", "2027-10-31"],
  "postproduccion.edicion": ["2027-04-05", "2027-08-22"],
  "postproduccion.vfx": ["2027-07-25", "2027-08-28"],
  "postproduccion.vfx.creacion": ["2027-07-25", "2027-08-14"],
  "postproduccion.vfx.integracion": ["2027-08-15", "2027-08-31"],
  "postproduccion.vfx.render": ["2027-09-01", "2027-09-03"],
}
