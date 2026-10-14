import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import type { EpochDay } from "@repo/domain"
import {
  cellAt,
  cellAtX,
  cellSpan,
  cellStep,
  dayAtX,
  type Timeline,
  type TimelineCell,
} from "../lib/timeline"

/** Las celdas elegidas: siempre en una sola fila, del día de partida al de llegada. */
export interface CellSelection {
  id: string
  anchor: EpochDay
  focus: EpochDay
}

const onBar = (event: { target: EventTarget }) =>
  (event.target as HTMLElement).closest("[data-bar]") != null

// El menú se pinta en un portal, pero sus eventos suben por React hasta la fila:
// solo cuenta lo que pasa dentro de la pista.
const outside = (event: { target: EventTarget; currentTarget: HTMLElement }) =>
  !event.currentTarget.contains(event.target as Node)

const xIn = (event: PointerEvent<HTMLElement>) =>
  event.clientX - event.currentTarget.getBoundingClientRect().left

/**
 * La celda bajo el ratón y las elegidas en el Gantt. Clic elige una celda y
 * arrastrar, un tramo de la misma fila; con el teclado, ← → cambian de celda,
 * ↑ ↓ de fila, Mayús alarga el tramo y Esc lo quita.
 */
export function useGanttCells(timeline: Timeline | null, rowIds: readonly string[]) {
  const [hovered, setHovered] = useState<{ id: string; cell: TimelineCell } | null>(null)
  const [selection, setSelection] = useState<CellSelection | null>(null)
  // El menú de las celdas elegidas: se abre al soltar el ratón o con Enter.
  const [menuOpen, setMenuOpen] = useState<boolean>(false)
  const dragging = useRef(false)

  const select = (next: CellSelection | null) =>
    setSelection((current) =>
      current &&
      next &&
      current.id === next.id &&
      current.anchor === next.anchor &&
      current.focus === next.focus
        ? current
        : next
    )

  const focusRow = (from: HTMLElement, id: string) =>
    from
      .closest('[role="tree"]')
      ?.querySelector<HTMLElement>(`[data-track="${id}"]`)
      ?.focus({ preventScroll: true })

  // Una sola fila entra en el orden del tabulador: la de la selección, o la primera.
  const tabRow = selection && rowIds.includes(selection.id) ? selection.id : rowIds[0]

  const trackProps = (id: string) => ({
    "data-track": id,
    tabIndex: tabRow === id ? 0 : -1,
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (!timeline || event.pointerType === "touch" || outside(event)) return
      if (dragging.current && selection?.id === id) {
        select({ ...selection, focus: dayAtX(timeline, xIn(event)) })
      }
      if (onBar(event)) return setHovered(null)
      const cell = cellAtX(timeline, xIn(event))
      if (hovered?.id !== id || hovered.cell.start !== cell.start) setHovered({ id, cell })
    },
    onPointerLeave: () => setHovered(null),
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (!timeline || event.button !== 0 || outside(event) || onBar(event)) return
      const day = dayAtX(timeline, xIn(event))
      dragging.current = true
      setMenuOpen(false)
      event.currentTarget.setPointerCapture?.(event.pointerId)
      select({ id, anchor: day, focus: day })
      event.currentTarget.focus({ preventScroll: true })
    },
    onPointerUp: () => {
      if (dragging.current) setMenuOpen(true)
      dragging.current = false
    },
    // Al llegar con el tabulador, se empieza por hoy, o por el primer día si hoy no está.
    onFocus: () => {
      if (!timeline || dragging.current || selection?.id === id) return
      const day = Math.min(Math.max(timeline.today, timeline.range.start), timeline.range.end)
      select({ id, anchor: selection?.focus ?? day, focus: selection?.focus ?? day })
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (!timeline || outside(event) || onBar(event) || selection?.id !== id) return
      if (event.key === "Escape") {
        event.preventDefault()
        return select(null)
      }
      if (event.key === "Enter") {
        event.preventDefault()
        return setMenuOpen(true)
      }
      setMenuOpen(false)
      const focus = cellAt(timeline, selection.focus)
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault()
        const next = cellStep(timeline, focus, event.key === "ArrowLeft" ? -1 : 1).start
        return select({ id, anchor: event.shiftKey ? selection.anchor : next, focus: next })
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault()
        const target = rowIds[rowIds.indexOf(id) + (event.key === "ArrowUp" ? -1 : 1)]
        if (!target) return
        select({ id: target, anchor: focus.start, focus: focus.start })
        focusRow(event.currentTarget, target)
      }
    },
  })

  const span = selection && timeline ? cellSpan(timeline, selection.anchor, selection.focus) : null

  return {
    hovered,
    selection,
    span,
    trackProps,
    menuOpen: menuOpen && selection != null,
    closeMenu: () => setMenuOpen(false),
  }
}
