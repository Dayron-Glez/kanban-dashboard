import { ACTION_KINDS, type ActionKind } from "@repo/contracts"
import { descendantActions, isAction, type ElementNode } from "./elementTree"

const STORAGE_KEY = "cauce.gantt.acciones-ocultas"

/** Los tipos de acción ocultos en el Gantt, recordados en este navegador. */
export function loadHiddenKinds(): ActionKind[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown
    return Array.isArray(saved) ? ACTION_KINDS.filter((kind) => saved.includes(kind)) : []
  } catch {
    return []
  }
}

export function saveHiddenKinds(hidden: readonly ActionKind[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden))
  } catch {
    // Sin almacenamiento (modo privado): la elección dura lo que la pestaña.
  }
}

/** Ocultar o volver a mostrar un tipo. */
export const toggleKind = (hidden: readonly ActionKind[], kind: ActionKind): ActionKind[] =>
  hidden.includes(kind)
    ? hidden.filter((other) => other !== kind)
    : ACTION_KINDS.filter((other) => other === kind || hidden.includes(other))

/** Dejar solo un tipo; si ya era el único, se vuelven a ver todos. */
export function soloKind(hidden: readonly ActionKind[], kind: ActionKind): ActionKind[] {
  const others = ACTION_KINDS.filter((other) => other !== kind)
  const alreadySolo = hidden.length === others.length && !hidden.includes(kind)
  return alreadySolo ? [] : others
}

/** El árbol sin las acciones de los tipos ocultos, a cualquier profundidad. */
export function hideActionKinds(
  nodes: ElementNode[],
  hidden: readonly ActionKind[]
): ElementNode[] {
  if (hidden.length === 0) return nodes
  const shown = (node: ElementNode) => !hidden.includes(node.element.kind as ActionKind)
  const strip = (node: ElementNode): ElementNode => ({
    ...node,
    actions: node.actions.filter(shown),
    children: node.children.map(strip),
  })
  // Una acción suelta, sin padre, es una fila más.
  return nodes.filter(shown).map(strip)
}

/** Cuántas acciones hay de cada tipo en el plan. */
export function countActionKinds(nodes: ElementNode[]): Record<ActionKind, number> {
  const counts = Object.fromEntries(ACTION_KINDS.map((kind) => [kind, 0])) as Record<
    ActionKind,
    number
  >
  for (const node of nodes) {
    const own = isAction(node.element) ? [node] : []
    for (const action of [...own, ...node.actions, ...descendantActions(node)]) {
      counts[action.element.kind as ActionKind] += 1
    }
  }
  return counts
}
