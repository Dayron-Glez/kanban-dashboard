import { useCallback, useEffect, useEffectEvent, useState } from "react"
import type { EditElementInput } from "@repo/contracts"
import type { EpochDay } from "@repo/domain"
import { newActionValues, type ActionFormData, type NewActionRequest } from "../forms/actionForm"
import { countChanges } from "../lib/planPreview"
import type { DayPanel } from "./useGanttCells"

// Adónde se va desde el panel: otro elemento, un día, una acción nueva, o cerrar.
export type PanelTarget =
  { element: string } | { day: DayPanel } | { newAction: NewActionRequest } | null

const NO_DRAFT: EditElementInput = {}

// Lo que se escribe en un campo o en un diálogo no mueve el panel.
const TYPING =
  "input, textarea, [role=dialog], [role=alertdialog], [role=listbox], [data-radix-popper-content-wrapper]"

/**
 * El panel de la derecha: uno cada vez (un elemento, un día o una acción nueva),
 * con el borrador de lo editado y la pregunta antes de salir con cambios. Con un
 * elemento abierto, ↑ ↓ pasan al de arriba o al de abajo (en `order`) y Esc cierra.
 */
export function usePanelNavigation(order: readonly string[]) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [openDay, setOpenDay] = useState<DayPanel | null>(null)
  // Lo editado en el panel de un elemento, sin guardar: lo pinta el Gantt.
  const [draft, setDraft] = useState<{ elementId: string; input: EditElementInput } | null>(null)
  // La acción que se está creando, con lo escrito hasta ahora (su vista previa).
  const [newAction, setNewAction] = useState<NewActionRequest | null>(null)
  const [newValues, setNewValues] = useState<ActionFormData | null>(null)
  const [newDirty, setNewDirty] = useState<boolean>(false)
  // Sube al guardar o descartar: el formulario del panel vuelve a lo guardado.
  const [resetKey, setResetKey] = useState<number>(0)
  // Salir con cambios pregunta antes; esto es adónde se iba.
  const [leaving, setLeaving] = useState<{ target: PanelTarget } | null>(null)

  const draftInput = draft?.elementId === openId ? draft.input : NO_DRAFT
  const dirty = countChanges(draftInput) > 0 || (newAction != null && newDirty)

  const navigate = (target: PanelTarget) => {
    const request = target && "newAction" in target ? target.newAction : null
    setDraft(null)
    setOpenId(target && "element" in target ? target.element : null)
    setOpenDay(target && "day" in target ? target.day : null)
    setNewAction(request)
    setNewValues(request && newActionValues(request))
    setNewDirty(false)
  }
  const go = (target: PanelTarget) => {
    if (target && "element" in target && target.element === openId) return
    if (dirty) setLeaving({ target })
    else navigate(target)
  }

  const neighbourOf = (delta: -1 | 1) => {
    const id = openId ? order[order.indexOf(openId) + delta] : undefined
    return id ? () => go({ element: id }) : undefined
  }

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if ((event.target as HTMLElement).closest(TYPING)) return
    if (event.key === "Escape") return go(null)
    const next = { ArrowDown: neighbourOf(1), ArrowUp: neighbourOf(-1) }[event.key]
    if (!next) return
    event.preventDefault()
    next()
  })
  const hasElement = openId != null
  useEffect(() => {
    if (!hasElement) return
    const listener = (event: KeyboardEvent) => onKey(event)
    document.addEventListener("keydown", listener)
    return () => document.removeEventListener("keydown", listener)
  }, [hasElement])

  // Cada panel lleva su borrador en su formulario; aquí llega para pintarlo en el
  // Gantt y para preguntar al salir con cambios.
  const onPanelDraft = useCallback(
    (input: EditElementInput) =>
      setDraft((current) => {
        if (!openId) return current
        const same =
          current?.elementId === openId && JSON.stringify(current.input) === JSON.stringify(input)
        if (same) return current
        return countChanges(input) > 0 ? { elementId: openId, input } : null
      }),
    [openId]
  )

  return {
    openId,
    openDay,
    newAction,
    newValues,
    draftInput,
    dirty,
    resetKey,
    leaving,
    navigate,
    go,
    openElement: (id: string) => go({ element: id }),
    openDayPanel: (day: EpochDay, rowId: string | null) => go({ day: { day, rowId } }),
    openNewAction: (request: NewActionRequest) => go({ newAction: request }),
    /** Pasar a otro día en el panel del día. */
    moveDay: (day: EpochDay) => setOpenDay((current) => current && { ...current, day }),
    previous: neighbourOf(-1),
    next: neighbourOf(1),
    onPanelDraft,
    onNewPreview: setNewValues,
    onNewDirty: setNewDirty,
    /** Tras guardar o descartar: sin borrador y el formulario, desde lo guardado. */
    restart: () => {
      setDraft(null)
      setResetKey((key) => key + 1)
    },
    stay: () => setLeaving(null),
    discard: () => {
      if (leaving) navigate(leaving.target)
      setLeaving(null)
    },
  }
}
