import type { Duration } from "@repo/contracts"
import type { TemplateDependency } from "./calendarTemplate.js"

/**
 * El proyecto de ejemplo del productor (Proyecto_de_ejemplo_plantilla.xlsx,
 * hoja «Fases»), escrito sobre nuestra plantilla de cine. Lo usan la prueba de
 * aceptación del motor y el seed local.
 */
export const EXAMPLE_PROJECT = {
  name: "Proyecto de ejemplo",
  fixedStarts: { desarrollo: "2026-01-01", rodaje: "2027-04-05" } as Record<string, string>,
  durations: {
    desarrollo: { amount: 3, unit: "months" },
    softpre: { amount: 3.85, unit: "months" },
    preparacion: { amount: 9, unit: "weeks" },
    rodaje: { amount: 6, unit: "weeks" },
    "rodaje.wrap": { amount: 2, unit: "weeks" },
    postproduccion: { amount: 30, unit: "weeks" },
    "postproduccion.edicion": { amount: 20, unit: "weeks" },
    "postproduccion.vfx": { amount: 5, unit: "weeks" },
    "postproduccion.vfx.creacion": { amount: 3, unit: "weeks" },
    "postproduccion.vfx.integracion": { amount: 2.5, unit: "weeks" },
    "postproduccion.vfx.render": { amount: 3, unit: "days" },
  } as Record<string, Duration>,
  /** Sus reglas propias, que sustituyen a las de la plantilla para ese extremo. */
  rules: [
    {
      predecessorKey: "postproduccion.edicion",
      predecessorPoint: "end",
      successorKey: "postproduccion.vfx",
      successorPoint: "start",
      lagAmount: -4,
      lagUnit: "weeks",
    },
    {
      predecessorKey: "postproduccion.vfx.creacion",
      predecessorPoint: "end",
      successorKey: "postproduccion.vfx.integracion",
      successorPoint: "start",
      lagAmount: 1,
      lagUnit: "days",
    },
    {
      predecessorKey: "postproduccion.vfx.integracion",
      predecessorPoint: "end",
      successorKey: "postproduccion.vfx.render",
      successorPoint: "start",
      lagAmount: 1,
      lagUnit: "days",
    },
  ] as TemplateDependency[],
  /** Las 12 filas con fechas de su hoja, tal como las calcula su prototipo. */
  expectedDates: {
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
  } as Record<string, [start: string, end: string]>,
}

/** Las dependencias de la plantilla con las reglas propias del ejemplo en su sitio. */
export function withExampleRules(dependencies: TemplateDependency[]): TemplateDependency[] {
  const replaced = (dependency: TemplateDependency) =>
    EXAMPLE_PROJECT.rules.some(
      (rule) =>
        rule.successorKey === dependency.successorKey &&
        rule.successorPoint === dependency.successorPoint
    )
  return [...dependencies.filter((dependency) => !replaced(dependency)), ...EXAMPLE_PROJECT.rules]
}
