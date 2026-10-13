import { useState } from "react"
import type { CalendarPlan } from "@repo/contracts"
import { describePhaseViolation } from "@repo/domain"
import { toast } from "sonner"
import type { PendingChange } from "../components/ChangePreviewDialog"
import { describeChange, inverseOf, previewChange, type PlanChange } from "../lib/planPreview"
import { useRemoveRule, useSetRule, useUpdatePlan } from "./elements"

/**
 * Todo cambio del plan pasa por aquí: se calcula antes qué movería y, si mueve
 * otras fechas o saca algo de su fase, se pregunta antes de guardarlo. Al
 * guardarlo, se ofrece deshacerlo.
 */
export function usePlanChanges(projectId: string, plan: CalendarPlan | undefined) {
  const update = useUpdatePlan(projectId)
  const setRule = useSetRule(projectId)
  const removeRule = useRemoveRule(projectId)
  const [waiting, setWaiting] = useState<{
    change: PlanChange
    inverse: PlanChange
    preview: PendingChange
  } | null>(null)

  const send = (change: PlanChange, onSuccess?: () => void) => {
    const options = { onSuccess }
    switch (change.type) {
      case "update":
        return update.mutate({ elementId: change.elementId, input: change.input }, options)
      case "set-rule":
        return setRule.mutate(
          { elementId: change.elementId, point: change.point, input: change.input },
          options
        )
      case "remove-rule":
        return removeRule.mutate({ elementId: change.elementId, point: change.point }, options)
    }
  }

  // Solo el último cambio: deshacer no se puede deshacer.
  const save = (change: PlanChange, inverse: PlanChange, note?: string) =>
    send(change, () =>
      toast.success("Cambio guardado", {
        id: "plan-change",
        duration: 8000,
        description: note,
        action: {
          label: "Deshacer",
          onClick: () =>
            send(inverse, () => toast.success("Cambio deshecho", { id: "plan-change" })),
        },
      })
    )

  /** `note`: algo que el usuario debe saber del cambio, como que se ajustó al tope. */
  const request = (change: PlanChange, title?: string, note?: string) => {
    if (!plan) return
    const preview = previewChange(plan, change)
    if ("cycle" in preview) {
      const nameOf = (id: string) => plan.elements.find((element) => element.id === id)?.name
      toast.error("Esa regla cerraría un ciclo", {
        description: preview.cycle.map(nameOf).join(" → "),
      })
      return
    }
    const [broken] = preview.broken
    if (broken) {
      const nameOf = (id: string) => plan.elements.find((element) => element.id === id)?.name ?? id
      toast.error("No se puede guardar el cambio", {
        id: "plan-change",
        description: describePhaseViolation(broken, nameOf),
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

    const inverse = inverseOf(plan, change)
    if (preview.moved.length === 0 && outside.length === 0) {
      save(change, inverse, note)
      return
    }
    setWaiting({
      change,
      inverse,
      preview: {
        title: title ?? describeChange(plan, change),
        note,
        moved: preview.moved,
        outside: [...outside, ...others],
      },
    })
  }

  return {
    request,
    pending: update.isPending || setRule.isPending || removeRule.isPending,
    dialog: {
      pending: waiting?.preview ?? null,
      onConfirm: () => {
        if (waiting) save(waiting.change, waiting.inverse, waiting.preview.note)
        setWaiting(null)
      },
      onCancel: () => setWaiting(null),
    },
  }
}
