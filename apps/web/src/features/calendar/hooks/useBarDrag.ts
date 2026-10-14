import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import type { EpochDay } from "@repo/domain"
import { dragDays, type BarDrag, type Timeline } from "../lib/timeline"

export interface DragState {
  drag: BarDrag
  originX: number
  days: number
  /** Los días que pide el puntero, antes del tope. */
  wanted: number
  moved: boolean
  /** Por qué se ha parado antes de donde está el puntero. */
  reason: string | null
}

// Las fechas mientras se arrastra: el borde que se suelta no cruza el otro.
export function draggedSpan(start: EpochDay, end: EpochDay | null, state: DragState | null) {
  if (!state || state.days === 0) return { start, end }
  const { drag, days } = state
  if (drag === "move") return { start: start + days, end: end == null ? null : end + days }
  if (drag === "start") return { start: Math.min(start + days, end ?? start), end }
  return { start, end: end == null ? null : Math.max(end + days, start) }
}

interface BarDragOptions {
  timeline: Timeline
  /** Qué bordes se pueden arrastrar; null si no se puede mover. */
  free: { start: boolean; end: boolean } | null
  onOpen: () => void
  onDrag: (drag: BarDrag, days: number) => void
  limit?: (drag: BarDrag, days: number) => { days: number; reason: string | null }
}

/**
 * Arrastrar algo del cronograma: el cuerpo lo mueve y los bordes cambian una
 * fecha; ← → mueven un día, con Mayús una semana y con Alt solo el fin. Un clic
 * sin arrastrar lo abre.
 */
export function useBarDrag({ timeline, free, onOpen, onDrag, limit }: BarDragOptions) {
  const [state, setState] = useState<DragState | null>(null)
  const dragged = useRef<boolean>(false)

  const begin = (drag: BarDrag) => (event: PointerEvent<HTMLElement>) => {
    if (!free || event.button !== 0) return
    event.stopPropagation()
    setState({ drag, originX: event.clientX, days: 0, wanted: 0, moved: false, reason: null })
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Sin captura el arrastre sigue, mientras el puntero no salga de la barra.
    }
  }

  const move = (event: PointerEvent<HTMLElement>) => {
    if (!state) return
    const pixels = event.clientX - state.originX
    const wanted = dragDays(pixels, timeline)
    // El tope solo se busca al saltar de día o de semana, no en cada píxel.
    const limited =
      wanted === state.wanted
        ? { days: state.days, reason: state.reason }
        : (limit?.(state.drag, wanted) ?? { days: wanted, reason: null })
    setState({
      ...state,
      wanted,
      days: limited.days,
      reason: limited.reason,
      moved: state.moved || Math.abs(pixels) > 3,
    })
  }

  const finish = () => {
    if (!state) return
    // Un arrastre no abre el inspector al soltar.
    dragged.current = state.moved
    // Lo que pidió el puntero: la página lo recorta igual y así puede decir que lo ajustó.
    if (state.moved && state.wanted !== 0) onDrag(state.drag, state.wanted)
    setState(null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!free || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
    event.preventDefault()
    event.stopPropagation()
    const days = (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 7 : 1)
    if (event.altKey && !free.end) return
    onDrag(event.altKey ? "end" : "move", days)
  }

  const onClick = () => {
    if (dragged.current) {
      dragged.current = false
      return
    }
    onOpen()
  }

  return {
    state,
    begin,
    pointer: {
      onPointerDown: begin("move"),
      onPointerMove: move,
      onPointerUp: finish,
      onPointerCancel: () => setState(null),
    },
    onKeyDown,
    onClick,
  }
}
