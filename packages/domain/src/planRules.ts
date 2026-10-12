interface Link {
  predecessorId: string
  successorId: string
}

/**
 * El ciclo que cerraría una regla nueva, en el orden de las fechas
 * («VFX → Creación VFX → VFX»), o null si no cierra ninguno. La regla que
 * hubiera en ese extremo no influye: entra en el sucesor, y un camino que sale
 * de él solo podría volver a pasar por ella si ya hubiera un ciclo.
 */
export function wouldCreateCycle(links: Link[], candidate: Link): string[] | null {
  const successors = new Map<string, string[]>()
  for (const link of links) {
    successors.set(link.predecessorId, [
      ...(successors.get(link.predecessorId) ?? []),
      link.successorId,
    ])
  }

  // ¿Se llega del sucesor al predecesor siguiendo las reglas que ya hay?
  const visited = new Set<string>()
  const search = (id: string, path: string[]): string[] | null => {
    if (id === candidate.predecessorId) return [...path, id, candidate.successorId]
    if (visited.has(id)) return null
    visited.add(id)
    for (const next of successors.get(id) ?? []) {
      const found = search(next, [...path, id])
      if (found) return found
    }
    return null
  }
  return search(candidate.successorId, [])
}

/** De qué elementos puede depender otro sin cerrar un ciclo. */
export function validPredecessors(
  elementIds: string[],
  links: Link[],
  successorId: string
): string[] {
  return elementIds.filter(
    (predecessorId) =>
      predecessorId !== successorId && !wouldCreateCycle(links, { predecessorId, successorId })
  )
}
