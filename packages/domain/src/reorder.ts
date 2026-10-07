/**
 * Reordenación del tablero.
 *
 * El estado es un array plano y global de tareas: el orden visible de una
 * columna es el orden de aparición de sus miembros dentro de ese array. Antes
 * se movían las tareas con `arrayMove` sobre índices globales, lo que rompía
 * los movimientos entre columnas: el índice global del destino deja de ser
 * válido en cuanto se saca la tarea arrastrada del array, así que la tarea
 * aterrizaba detrás del elemento sobre el que se soltaba en vez de en su hueco.
 *
 * Estas funciones trabajan siempre con índices RELATIVOS a la columna y
 * recolocan una única tarea, de modo que el orden del resto queda intacto.
 */

/** Lo único que la reordenación necesita saber de una tarea. */
export interface Placeable {
  id: string
  columnId: string
}

/** Tareas de una columna, en el orden en que se ven. */
export function tasksInColumn<T extends Placeable>(tasks: T[], columnId: string): T[] {
  return tasks.filter((task) => task.columnId === columnId)
}

/** Array sin el elemento que está en `index`. */
function removeAt<T>(tasks: T[], index: number): T[] {
  return [...tasks.slice(0, index), ...tasks.slice(index + 1)]
}

/**
 * Inserta `task` de forma que ocupe la posición `posInColumn` de `columnId`.
 * `rest` no debe contener ya a `task`.
 */
function insertIntoColumn<T extends Placeable>(
  rest: T[],
  task: T,
  columnId: string,
  posInColumn: number
): T[] {
  // Índices GLOBALES de los miembros de la columna destino, en orden.
  const memberIndexes: number[] = []
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].columnId === columnId) memberIndexes.push(i)
  }

  const slot = Math.max(0, Math.min(posInColumn, memberIndexes.length))

  let globalIndex: number
  if (memberIndexes.length === 0) {
    // Columna vacía: da igual dónde caiga en el array global.
    globalIndex = rest.length
  } else if (slot === memberIndexes.length) {
    globalIndex = memberIndexes[memberIndexes.length - 1] + 1
  } else {
    // En el hueco del miembro al que desplaza.
    globalIndex = memberIndexes[slot]
  }

  const next = [...rest]
  next.splice(globalIndex, 0, task)
  return next
}

/**
 * Mueve una tarea a `columnId`, en la posición `posInColumn` de esa columna.
 *
 * Devuelve el array **sin tocar** si la tarea ya está en esa columna: el
 * tablero compara por referencia para saber si un soltado cambió algo y, si
 * no, no escribe nada en la base de datos.
 */
export function moveTaskToColumn<T extends Placeable>(
  tasks: T[],
  taskId: string,
  columnId: string,
  posInColumn: number
): T[] {
  const index = tasks.findIndex((task) => task.id === taskId)
  if (index === -1) return tasks

  const task = tasks[index]
  if (task.columnId === columnId) return tasks

  return insertIntoColumn(removeAt(tasks, index), { ...task, columnId }, columnId, posInColumn)
}

/**
 * Coloca `taskId` en el hueco de `overTaskId` dentro de su columna, con la
 * misma semántica que `arrayMove` pero aplicada solo a esa columna.
 */
export function reorderWithinColumn<T extends Placeable>(
  tasks: T[],
  taskId: string,
  overTaskId: string
): T[] {
  if (taskId === overTaskId) return tasks

  const index = tasks.findIndex((task) => task.id === taskId)
  if (index === -1) return tasks

  const task = tasks[index]
  const over = tasks.find((candidate) => candidate.id === overTaskId)
  if (!over || over.columnId !== task.columnId) return tasks

  const column = tasksInColumn(tasks, task.columnId)
  const to = column.findIndex((candidate) => candidate.id === overTaskId)
  const from = column.findIndex((candidate) => candidate.id === taskId)
  if (to === -1 || from === to) return tasks

  return insertIntoColumn(removeAt(tasks, index), task, task.columnId, to)
}

export type DropEdge = "top" | "bottom"

/**
 * Estado final al soltar sobre una tarjeta: la arrastrada queda justo encima
 * o debajo de `targetTaskId`, según el borde por el que se soltó.
 */
export function dropNextToTask<T extends Placeable>(
  tasks: T[],
  taskId: string,
  targetTaskId: string,
  edge: DropEdge
): T[] {
  if (taskId === targetTaskId) return tasks

  const dragged = tasks.find((task) => task.id === taskId)
  const target = tasks.find((task) => task.id === targetTaskId)
  if (!dragged || !target) return tasks

  const column = tasksInColumn(tasks, target.columnId)
  // Hueco donde se suelta, contado sobre la columna tal como está ahora.
  const insertAt =
    column.findIndex((task) => task.id === targetTaskId) + (edge === "bottom" ? 1 : 0)

  if (dragged.columnId !== target.columnId) {
    return moveTaskToColumn(tasks, taskId, target.columnId, insertAt)
  }

  // Dentro de la misma columna, la arrastrada deja de ocupar su sitio: si
  // estaba por encima del hueco, todo lo de debajo sube una posición.
  const from = column.findIndex((task) => task.id === taskId)
  const to = from < insertAt ? insertAt - 1 : insertAt
  if (to === from) return tasks
  return reorderWithinColumn(tasks, taskId, column[to].id)
}

/** Estado final al soltar sobre una columna fuera de cualquier tarjeta: al final. */
export function dropAtColumnEnd<T extends Placeable>(
  tasks: T[],
  taskId: string,
  columnId: string
): T[] {
  const dragged = tasks.find((task) => task.id === taskId)
  if (!dragged) return tasks

  if (dragged.columnId !== columnId) {
    return moveTaskToColumn(tasks, taskId, columnId, Number.MAX_SAFE_INTEGER)
  }

  const column = tasksInColumn(tasks, columnId)
  return reorderWithinColumn(tasks, taskId, column[column.length - 1].id)
}

/**
 * Posiciones densas (0..n-1) de una columna, sobre el orden real del array,
 * que es justo lo que ve el usuario.
 */
export function columnPositions<T extends Placeable>(tasks: T[], columnId: string) {
  return tasksInColumn(tasks, columnId).map((task, position) => ({ task, position }))
}
