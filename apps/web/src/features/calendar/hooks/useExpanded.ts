import { useState } from "react"
import type { ElementNode } from "../lib/elementTree"

// Lo que se despliega: lo que tiene hijos o acciones (su fila «Acciones»).
const parentIds = (nodes: ElementNode[]): string[] =>
  nodes.flatMap((node) => [
    ...(node.children.length > 0 || node.actions.length > 0 ? [node.element.id] : []),
    ...parentIds(node.children),
  ])

/** Qué está desplegado en el árbol. Todo empieza plegado: el plan entero de golpe es demasiado. */
export function useExpanded(tree: ElementNode[]) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  return {
    expanded,
    toggle: (elementId: string) =>
      setExpanded((current) => {
        const next = new Set(current)
        if (next.has(elementId)) next.delete(elementId)
        else next.add(elementId)
        return next
      }),
    reveal: (ids: string[]) => setExpanded((current) => new Set([...current, ...ids])),
    /** Con algo desplegado, lo pliega todo; si no, lo despliega todo. */
    toggleAll: () => setExpanded(new Set(expanded.size > 0 ? [] : parentIds(tree))),
  }
}
