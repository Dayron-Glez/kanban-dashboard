/** Vista activa del proyecto. Viaja en la URL para poder compartir el enlace. */
export type ProjectView = "board" | "table"

export const VIEW_PARAM = "view"

/** Cualquier valor que no sea "table" cae al tablero, que es la vista por defecto. */
export const parseView = (value: string | null | undefined): ProjectView =>
  value === "table" ? "table" : "board"
