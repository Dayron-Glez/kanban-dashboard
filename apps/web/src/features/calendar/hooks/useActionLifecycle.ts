import { useState } from "react"
import type { ActionKind, CalendarPlan } from "@repo/contracts"
import { toast } from "sonner"
import { useCreateAction, useDeleteElement } from "../api/elements"
import type { ActionFormData } from "../forms/actionForm"
import { describeAction } from "../lib/actionStyle"
import type { PanelNavigation } from "./usePanelNavigation"
import type { PlanEditing } from "./usePlanEditing"

/**
 * Crear y borrar acciones. Al crear, el panel pasa a la acción nueva; borrar pide
 * confirmación antes (desde el panel, su menú o con Supr) y, si estaba abierta,
 * cierra su panel.
 */
export function useActionLifecycle(
  projectId: string,
  plan: CalendarPlan | undefined,
  panel: PanelNavigation,
  editing: PlanEditing
) {
  const createAction = useCreateAction(projectId)
  const deleteElement = useDeleteElement(projectId)
  // La acción que se va a borrar, a falta de confirmarlo.
  const [toDelete, setToDelete] = useState<string | null>(null)
  const deleting = editing.find(toDelete) ?? null

  return {
    creating: createAction.isPending,
    deletePending: deleteElement.isPending,

    create: ({ parentId, ...input }: ActionFormData) => {
      const before = new Set(plan?.elements.map((element) => element.id))
      createAction.mutate(
        { parentId, input },
        {
          onSuccess: (next) => {
            const created = next.elements.find((element) => !before.has(element.id))
            panel.navigate(created ? { element: created.id } : null)
            toast.success(`Se creó ${describeAction(input)}`, { id: "plan-change" })
          },
        }
      )
    },

    /** Lo que pide confirmar el diálogo de borrar, o nada. */
    deleting: deleting && {
      kind: deleting.kind as ActionKind,
      name: deleting.name,
      startsOn: deleting.startsOn,
      endsOn: deleting.endsOn,
      parent: deleting.parentId ? editing.nameOf(deleting.parentId) : null,
    },
    requestDelete: setToDelete,
    cancelDelete: () => setToDelete(null),
    confirmDelete: () => {
      if (!deleting) return
      setToDelete(null)
      deleteElement.mutate(deleting.id, {
        onSuccess: () => {
          // Si estaba abierta, el panel se cierra: lo que tuviera sin guardar ya no vale.
          if (panel.openId === deleting.id) panel.navigate(null)
          const action = { kind: deleting.kind as ActionKind, name: deleting.name }
          toast.success(`Se borró ${describeAction(action)}`, { id: "plan-change" })
        },
      })
    },
  }
}
