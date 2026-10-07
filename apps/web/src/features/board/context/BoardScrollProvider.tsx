import { useRef, type ReactNode } from "react"
import { BoardScrollContext } from "./boardScrollCtx"

interface BoardScrollProviderProps {
  children: ReactNode
}

export function BoardScrollProvider({ children }: Readonly<BoardScrollProviderProps>) {
  const ref = useRef<HTMLElement | null>(null)
  return <BoardScrollContext.Provider value={ref}>{children}</BoardScrollContext.Provider>
}
