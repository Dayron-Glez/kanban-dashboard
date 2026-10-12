import { useState } from "react"
import type { CalendarPlan } from "@repo/contracts"
import { toast } from "sonner"
import type { PendingChange } from "../components/ChangePreviewDialog"
import { previewChange, type PlanChange } from "../lib/planPreview"
import { useRemoveRule, useSetRule, useUpdatePlan } from "./elements"

/**
 * Todo cambio del plan pasa por aquí: se calcula antes qué movería y, si mueve
 * otras fechas o saca algo de su fase, se pregunta antes de guardarlo.
 */
export function usePlanChanges(projectId: string, plan: CalendarPlan | undefined) {
  const update = useUpdatePlan(projectId)
  const setRule = useSetRule(projectId)
  const removeRule = useRemoveRule(projectId)
  const [waiting, setWaiting] = useState<{ change: PlanChange; preview: PendingChange } | null>(
    null
  )

  const send = (change: PlanChange) => {
    switch (change.type) {
      case "update":
        return update.mutate({ elementId: change.elementId, input: change.input })
      case "set-rule":
        return setRule.mutate({
          elementId: change.elementId,
          point: change.point,
          input: change.input,
        })
      case "remove-rule":
        return removeRule.mutate({ elementId: change.elementId, point: change.point })
    }
  }

  const request = (change: PlanChange) => {
    if (!plan) return
    const preview = previewChange(plan, change)
    if ("cycle" in preview) {
      const nameOf = (id: string) => plan.elements.find((element) => element.id === id)?.name
      toast.error("Esa regla cerraría un ciclo", {
        description: preview.cycle.map(nameOf).join(" → "),
      })
      return
    }
    const element = plan.elements.find((candidate) => candidate.id === change.elementId)
    const parent = plan.elements.find((candidate) => candidate.id === element?.parentId)
    const outside =
      preview.leavesParent && element && parent ? [{ name: element.name, parent: parent.name }] : []
    const others = preview.moved
      .filter((moved) => moved.leavesParent)
      .flatMap((moved) => {
        const child = plan.elements.find((candidate) => candidate.id === moved.id)
        const father = plan.elements.find((candidate) => candidate.id === child?.parentId)
        return child && father ? [{ name: child.name, parent: father.name }] : []
      })

    if (preview.moved.length === 0 && outside.length === 0) {
      send(change)
      return
    }
    setWaiting({ change, preview: { moved: preview.moved, outside: [...outside, ...others] } })
  }

  return {
    request,
    pending: update.isPending || setRule.isPending || removeRule.isPending,
    dialog: {
      pending: waiting?.preview ?? null,
      onConfirm: () => {
        if (waiting) send(waiting.change)
        setWaiting(null)
      },
      onCancel: () => setWaiting(null),
    },
  }
}
