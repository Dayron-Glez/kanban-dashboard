import { fromIsoDate, type EpochDay } from "./planDates.js"

/** Una fase con sus fechas. Se pasan en el orden del plan. */
export interface PhaseSpan {
  id: string
  start: EpochDay | null
  end: EpochDay | null
}

/** Las fases de un plan (los elementos sin padre) en su orden, con sus fechas. */
export function phaseSpansOf(
  elements: readonly {
    id: string
    parentId: string | null
    position: number
    startsOn: string | null
    endsOn: string | null
  }[]
): PhaseSpan[] {
  return elements
    .filter((element) => element.parentId == null)
    .sort((a, b) => a.position - b.position)
    .map((element) => ({
      id: element.id,
      start: element.startsOn ? fromIsoDate(element.startsOn) : null,
      end: element.endsOn ? fromIsoDate(element.endsOn) : null,
    }))
}

/** Lo más que una fase puede meterse en la siguiente: el 25 % de lo que dura esa siguiente. */
export const MAX_PHASE_OVERLAP = 0.25

export type PhaseRuleViolation =
  /** La siguiente empezaría antes que esta: las fases no cambian de orden. */
  | { kind: "order"; phaseId: string; nextId: string }
  /** Esta se metería en la siguiente más de lo permitido. */
  | {
      kind: "overlap"
      phaseId: string
      nextId: string
      /** Días que se mete en la siguiente. */
      days: number
      /** Días que dura la siguiente. */
      nextDays: number
    }

/**
 * Qué pares de fases seguidas incumplen la regla del experto: las fases no
 * cambian de orden (empezar el mismo día sí vale) y una fase solo puede
 * meterse en la siguiente hasta el 25 % de la duración de esa siguiente, en
 * días naturales. Las fases sin fecha de inicio no cuentan: se compara cada
 * una con la siguiente que tenga fecha.
 */
export function phaseRuleViolations(phases: readonly PhaseSpan[]): PhaseRuleViolation[] {
  const dated = phases.filter((phase) => phase.start != null)
  return dated.slice(0, -1).flatMap((phase, index): PhaseRuleViolation[] => {
    const next = dated[index + 1]!
    if (next.start! < phase.start!) return [{ kind: "order", phaseId: phase.id, nextId: next.id }]
    if (phase.end == null || next.end == null) return []
    const days = phase.end - next.start! + 1
    const nextDays = next.end - next.start! + 1
    return days > nextDays * MAX_PHASE_OVERLAP
      ? [{ kind: "overlap", phaseId: phase.id, nextId: next.id, days, nextDays }]
      : []
  })
}

/** «Preparación empezaría antes que SoftPre», «Preparación se metería un 40 % en Rodaje…». */
export function describePhaseViolation(
  violation: PhaseRuleViolation,
  nameOf: (id: string) => string
): string {
  const phase = nameOf(violation.phaseId)
  const next = nameOf(violation.nextId)
  if (violation.kind === "order") return `${next} empezaría antes que ${phase}`
  // Hacia arriba: un 25,4 % no puede leerse «un 25 %; el máximo es un 25 %».
  const share = Math.ceil((violation.days / violation.nextDays) * 100)
  return `${phase} se metería un ${share} % en ${next}; el máximo es un 25 %`
}
