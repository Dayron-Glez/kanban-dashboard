import { createContext, useContext, type RefObject } from "react"

export const BoardScrollContext = createContext<RefObject<HTMLElement | null> | null>(null)

/** Contenedor con scroll horizontal del tablero, para llevarlo al final al crear columna. */
export const useBoardScroll = (): RefObject<HTMLElement | null> => {
  const ref = useContext(BoardScrollContext)
  if (!ref) throw new Error("useBoardScroll debe usarse dentro de BoardScrollProvider")
  return ref
}
