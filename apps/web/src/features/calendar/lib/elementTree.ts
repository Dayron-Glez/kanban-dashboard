import { ACTION_KINDS, type CalendarElement, type ElementKind } from "@repo/contracts"
import { fromIsoDate, type EpochDay } from "@repo/domain"

export interface ElementNode {
  element: CalendarElement
  depth: number
  /** El color de la fase de la que cuelga, o null en las acciones sueltas. */
  phaseColor: string | null
  /** Fases, subfases y procesos: las filas del árbol. */
  children: ElementNode[]
  /** Las acciones no son filas: se pintan en la celda de lo que cuelgan. */
  actions: ElementNode[]
}

export const isAction = (element: CalendarElement) =>
  (ACTION_KINDS as readonly string[]).includes(element.kind)

/** Sin fin y sin ser una contratación (cuya baja puede no conocerse): le falta la duración. */
export const lacksDuration = (element: CalendarElement) =>
  element.endsOn == null && element.kind !== "hiring"

/** Las acciones de lo que cuelga de un elemento, a cualquier profundidad. */
export const descendantActions = (node: ElementNode): ElementNode[] =>
  node.children.flatMap((child) => [...child.actions, ...descendantActions(child)])

/**
 * Las acciones de una fila que tocan unos días: las suyas y, si está plegada, las
 * de lo que cuelga de ella. Una contratación sin baja sigue en curso; lo demás sin
 * fin (le falta la duración) solo ocupa su día de inicio.
 */
export function actionsInSpan(
  node: ElementNode,
  expanded: boolean,
  from: EpochDay,
  to: EpochDay
): ElementNode[] {
  const all = expanded ? node.actions : [...node.actions, ...descendantActions(node)]
  return all.filter(({ element }) => {
    if (!element.startsOn) return false
    const start = fromIsoDate(element.startsOn)
    const end = element.endsOn
      ? fromIsoDate(element.endsOn)
      : element.kind === "hiring"
        ? Infinity
        : start
    return start <= to && end >= from
  })
}

/** Todos los elementos en el orden del árbol, cada acción tras su padre. */
export const flattenTree = (nodes: ElementNode[]): ElementNode[] =>
  nodes.flatMap((node) => [node, ...node.actions, ...flattenTree(node.children)])

export const ELEMENT_KIND_LABELS: Record<ElementKind, string> = {
  phase: "Fase",
  subphase: "Subfase",
  process: "Proceso",
  event: "Evento",
  task: "Tarea",
  meeting: "Reunión",
  reminder: "Recordatorio",
  hiring: "Contratación",
  travel: "Viaje",
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
        const nested = build(element.id, depth + 1, color)
        return {
          element,
          depth,
          phaseColor: color,
          children: nested.filter((node) => !isAction(node.element)),
          actions: nested.filter((node) => isAction(node.element)),
        }
      })

  return build(null, 0, null)
}
