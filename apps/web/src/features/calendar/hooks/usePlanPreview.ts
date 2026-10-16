import { useMemo } from "react"
import type { ActionKind, CalendarPlan } from "@repo/contracts"
import { previewElement, type ActionFormData } from "../forms/actionForm"
import { hideActionKinds } from "../lib/actionFilter"
import { buildElementTree, type ElementNode } from "../lib/elementTree"

interface PlanPreviewOptions {
  plan: CalendarPlan | undefined
  tree: ElementNode[]
  projectId: string
  /** La acción que se está creando, si la hay: se pinta ya en el plan. */
  newValues: ActionFormData | null
  view: "tabla" | "gantt"
  hiddenKinds: ActionKind[]
}

/**
 * El plan tal como se ve: con la acción que se está creando ya pintada y, en el
 * Gantt, sin los tipos ocultos (el árbol del móvil lo cuenta todo).
 */
export function usePlanPreview({
  plan,
  tree,
  projectId,
  newValues,
  view,
  hiddenKinds,
}: PlanPreviewOptions) {
  const previewPlan = useMemo(() => {
    if (!plan || !newValues) return plan
    return { ...plan, elements: [...plan.elements, previewElement(newValues, projectId)] }
  }, [plan, newValues, projectId])
  const previewTree = useMemo(
    () => (previewPlan === plan ? tree : buildElementTree(previewPlan?.elements ?? [])),
    [previewPlan, plan, tree]
  )
  const ganttTree = useMemo(
    () => (view === "tabla" ? previewTree : hideActionKinds(previewTree, hiddenKinds)),
    [previewTree, view, hiddenKinds]
  )
  return { previewPlan, previewTree, ganttTree }
}
