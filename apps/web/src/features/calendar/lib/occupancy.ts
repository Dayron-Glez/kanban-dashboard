import type { CalendarPlan } from "@repo/contracts"
import { fromIsoDate, toIsoDate } from "@repo/domain"
import type { CalendarOccupancy } from "../components/PlanCalendar"
import { isAction } from "./elementTree"

/**
 * Lo que ya hay cada día en la fase de un elemento: sus acciones, salvo él
 * mismo. Es lo que enseña el calendario al elegir fechas, para no pisarse.
 * Una acción sin fin solo ocupa su día.
 */
export function occupancyFor(plan: CalendarPlan, elementId: string): CalendarOccupancy {
  const byId = new Map(plan.elements.map((element) => [element.id, element]))
  const phaseOf = (id: string) => {
    let current = byId.get(id)
    while (current?.parentId) current = byId.get(current.parentId)
    return current
  }
  const phase = phaseOf(elementId)
  const days: CalendarOccupancy["days"] = {}
  if (!phase) return { scope: "", days }

  for (const element of plan.elements) {
    if (element.id === elementId || !isAction(element) || !element.startsOn) continue
    if (phaseOf(element.id)?.id !== phase.id) continue
    const owner = element.parentId ? (byId.get(element.parentId)?.name ?? null) : null
    const start = fromIsoDate(element.startsOn)
    const end = element.endsOn ? fromIsoDate(element.endsOn) : start
    for (let day = start; day <= end; day++) {
      const iso = toIsoDate(day)
      days[iso] = [...(days[iso] ?? []), { element, owner }]
    }
  }
  return { scopeId: phase.id, scope: phase.name, days }
}
