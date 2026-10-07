import type { ColumnCategory } from "@repo/contracts"

interface Categorized {
  id: string
  category: ColumnCategory
}

/** La columna terminada del proyecto, si la hay. Como mucho hay una. */
export const doneColumnId = (columns: Categorized[]): string | undefined =>
  columns.find((column) => column.category === "done")?.id

/**
 * Lo mismo que set_column_category en la base, para el estado optimista: si
 * la nueva categoría es «done», la que lo era pasa a «doing».
 */
export function applyCategory<T extends Categorized>(
  columns: T[],
  columnId: string,
  category: ColumnCategory
): T[] {
  return columns.map((column) => {
    if (column.id === columnId) return { ...column, category }
    if (category === "done" && column.category === "done") {
      return { ...column, category: "doing" }
    }
    return column
  })
}
