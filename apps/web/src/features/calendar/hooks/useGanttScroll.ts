import { useEffect, useEffectEvent, useRef } from "react"
import type { EpochDay } from "@repo/domain"
import { scrollLeftFor, type Timeline } from "../lib/timeline"

/**
 * El desplazamiento del Gantt: `goTo` lleva a un día y, al abrir un proyecto, se
 * centra en hoy una vez; después manda el usuario.
 */
export function useGanttScroll(timeline: Timeline | null, active: boolean, projectId: string) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const focusedProject = useRef<string | null>(null)

  const goTo = (day: EpochDay, smooth = true) => {
    const viewport = viewportRef.current
    if (!viewport || !timeline) return
    const labels = viewport.querySelector<HTMLElement>("[data-grid-labels]")?.offsetWidth ?? 0
    const left = scrollLeftFor(day, timeline, viewport.clientWidth - labels)
    if (viewport.scrollTo) viewport.scrollTo({ left, behavior: smooth ? "smooth" : "auto" })
    else viewport.scrollLeft = left
  }

  const centerOnToday = useEffectEvent((today: EpochDay) => goTo(today, false))
  useEffect(() => {
    if (!timeline || !active || focusedProject.current === projectId) return
    focusedProject.current = projectId
    centerOnToday(timeline.today)
  }, [timeline, active, projectId])

  return { viewportRef, goTo }
}
