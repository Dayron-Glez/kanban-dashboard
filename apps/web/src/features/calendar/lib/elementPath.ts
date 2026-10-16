import type { CalendarElement } from "@repo/contracts"
import { ELEMENT_KIND_LABELS } from "./elementTree"

/** «Rodaje › Bloque 1 › Proceso»: de dónde cuelga un elemento y qué es. */
export function elementPath(
  elements: readonly CalendarElement[],
  element: CalendarElement
): string[] {
  const byId = new Map(elements.map((candidate) => [candidate.id, candidate]))
  const names: string[] = []
  for (let parent = byId.get(element.parentId ?? ""); parent;) {
    names.unshift(parent.name)
    parent = byId.get(parent.parentId ?? "")
  }
  return [...names, ELEMENT_KIND_LABELS[element.kind]]
}
