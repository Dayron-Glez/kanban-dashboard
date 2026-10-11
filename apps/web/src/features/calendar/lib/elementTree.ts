import type { CalendarElement, ElementKind } from "@repo/contracts"

export interface ElementNode {
  element: CalendarElement
  depth: number
  /** El color de la fase de la que cuelga, o null en las acciones sueltas. */
  phaseColor: string | null
  children: ElementNode[]
}

export const ELEMENT_KIND_LABELS: Record<ElementKind, string> = {
  phase: "Fase",
  subphase: "Subfase",
  process: "Proceso",
  event: "Evento",
  task: "Tarea",
  meeting: "Reunión",
  reminder: "Recordatorio",
  hiring: "Contratación",
}

/** Del árbol plano de la API al anidado, cada nivel por posición. */
export function buildElementTree(elements: CalendarElement[]): ElementNode[] {
  const byParent = new Map<string | null, CalendarElement[]>()
  for (const element of elements) {
    const siblings = byParent.get(element.parentId) ?? []
    siblings.push(element)
    byParent.set(element.parentId, siblings)
  }

  const build = (
    parentId: string | null,
    depth: number,
    phaseColor: string | null
  ): ElementNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.position - b.position)
      .map((element) => {
        const color = depth === 0 ? element.color : phaseColor
        return { element, depth, phaseColor: color, children: build(element.id, depth + 1, color) }
      })

  return build(null, 0, null)
}
