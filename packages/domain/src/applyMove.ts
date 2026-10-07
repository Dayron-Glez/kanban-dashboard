import type { Placeable } from "./reorder.js"

export interface Positioned extends Placeable {
  position: number
}

export interface Move {
  taskId: string
  toColumnId: string
  /** Orden final de la columna de destino, con la tarea movida incluida. */
  orderedTaskIds: string[]
}

const byRankThenPosition = <T extends { id: string; position: number }>(order: string[]) => {
  const rank = (item: T) => {
    const index = order.indexOf(item.id)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  return (a: T, b: T) => rank(a) - rank(b) || a.position - b.position
}

const renumber = <T extends { position: number }>(items: T[]): T[] =>
  items.map((item, position) => (item.position === position ? item : { ...item, position }))

/**
 * Lo mismo que hace la función move_task de la base, para que el estado
 * optimista coincida con lo que va a guardar: lo que no viene en la lista va
 * detrás en su orden actual, y la columna de origen se renumera sin huecos.
 */
export function applyMove<T extends Positioned>(tasks: T[], move: Move): T[] {
  const task = tasks.find((candidate) => candidate.id === move.taskId)
  if (!task) return tasks

  const fromColumnId = task.columnId
  const moved = tasks.map((candidate) =>
    candidate.id === move.taskId ? { ...candidate, columnId: move.toColumnId } : candidate
  )

  const destination = renumber(
    moved
      .filter((candidate) => candidate.columnId === move.toColumnId)
      .sort(byRankThenPosition(move.orderedTaskIds))
  )
  const origin =
    fromColumnId === move.toColumnId
      ? []
      : renumber(
          moved
            .filter((candidate) => candidate.columnId === fromColumnId)
            .sort((a, b) => a.position - b.position)
        )
  const rest = moved.filter(
    (candidate) => candidate.columnId !== move.toColumnId && candidate.columnId !== fromColumnId
  )

  return [...rest, ...origin, ...destination]
}

/** Lo mismo que reorder_columns: las columnas en el orden indicado, renumeradas. */
export function applyColumnOrder<T extends { id: string; position: number }>(
  columns: T[],
  orderedColumnIds: string[]
): T[] {
  return renumber([...columns].sort(byRankThenPosition(orderedColumnIds)))
}
