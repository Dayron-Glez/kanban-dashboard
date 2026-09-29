import type { Task } from "../types/board.types"

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

/** Tareas de una columna, en el orden en que se ven. */
export function tasksInColumn(tasks: Task[], columnId: string): Task[] {
  return tasks.filter((task) => task.columnId === columnId)
}

/** Array sin el elemento que está en `index`. */
function removeAt(tasks: Task[], index: number): Task[] {
  return [...tasks.slice(0, index), ...tasks.slice(index + 1)]
}

/**
 * Inserta `task` de forma que ocupe la posición `posInColumn` de `columnId`.
 * `rest` no debe contener ya a `task`.
 */
function insertIntoColumn(rest: Task[], task: Task, columnId: string, posInColumn: number): Task[] {
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
 * Devuelve el array **sin tocar** si la tarea ya está en esa columna. Eso es
 * lo que corta el bucle de renders: durante el arrastre esto se llama en cada
 * movimiento del puntero, y devolver un array nuevo cada vez reordena el DOM,
 * lo que hace a dnd-kit recalcular colisiones y volver a llamar aquí.
 */
export function moveTaskToColumn(
  tasks: Task[],
  taskId: string,
  columnId: string,
  posInColumn: number
): Task[] {
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
export function reorderWithinColumn(tasks: Task[], taskId: string, overTaskId: string): Task[] {
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

/**
 * Estado final al soltar. `overId` es el elemento sobre el que se soltó: otra
 * tarea, y entonces la arrastrada ocupa su hueco, o una columna, y entonces va
 * al final de esa columna.
 */
export function applyDrop(
  tasks: Task[],
  taskId: string,
  overId: string,
  overIsTask: boolean
): Task[] {
  if (!overIsTask) return moveTaskToColumn(tasks, taskId, overId, Number.MAX_SAFE_INTEGER)

  const dragged = tasks.find((task) => task.id === taskId)
  const over = tasks.find((task) => task.id === overId)
  if (!dragged || !over) return tasks

  if (dragged.columnId === over.columnId) return reorderWithinColumn(tasks, taskId, overId)

  // onDragOver no llegó a mover la tarea porque el puntero cambió de columna
  // justo antes de soltar; se coloca aquí en el hueco de la tarea de destino.
  const column = tasksInColumn(tasks, over.columnId)
  return moveTaskToColumn(
    tasks,
    taskId,
    over.columnId,
    column.findIndex((task) => task.id === overId)
  )
}

/**
 * Filas para persistir el orden de una columna. La `position` se reasigna
 * densamente (0..n-1) sobre el orden real del array, que es justo lo que ve el
 * usuario.
 */
export function columnPositionRows(tasks: Task[], columnId: string) {
  return tasksInColumn(tasks, columnId).map((task, position) => ({
    id: task.id,
    position,
    column_id: task.columnId,
    project_id: task.project_id,
    content: task.content,
    priority: task.priority,
    size: task.size,
    due_date: task.due_date,
  }))
}
