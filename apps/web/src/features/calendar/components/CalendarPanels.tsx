import type { CalendarPlan } from "@repo/contracts"
import { ActionSheet } from "../forms/ActionSheet"
import type { ActionFormData, PlanEdit } from "../forms/actionForm"
import type { PanelNavigation } from "../hooks/usePanelNavigation"
import type { PlanEditing } from "../hooks/usePlanEditing"
import { elementPath } from "../lib/elementPath"
import { isAction, type ElementNode } from "../lib/elementTree"
import { applyDraft } from "../lib/planPreview"
import type { Timeline } from "../lib/timeline"
import { DaySheet } from "./DaySheet"
import { ElementInspector } from "./ElementInspector"

interface CalendarPanelsProps {
  projectId: string
  /** El plan guardado. */
  plan: CalendarPlan
  /** El plan con la acción nueva ya pintada, mientras se crea. */
  previewPlan: CalendarPlan
  tree: ElementNode[]
  previewTree: ElementNode[]
  timeline: Timeline | null
  planSpan: { start: string; end: string } | null
  isOwner: boolean
  /** Guardando o borrando: los botones esperan. */
  pending: boolean
  creating: boolean
  panel: PanelNavigation
  editing: PlanEditing
  onCreate: (values: ActionFormData) => void
  onDelete: (elementId: string) => void
}

/**
 * El panel de la derecha que toque, uno cada vez: la acción que se está creando,
 * la acción, fase, subfase o proceso abierto, o el día.
 */
export function CalendarPanels({
  projectId,
  plan,
  previewPlan,
  tree,
  previewTree,
  timeline,
  planSpan,
  isOwner,
  pending,
  creating,
  panel,
  editing,
  onCreate,
  onDelete,
}: Readonly<CalendarPanelsProps>) {
  const { openId, openDay, newAction, draftInput, dirty } = panel
  const bounds = timeline?.range
  const close = () => panel.go(null)
  // Cancelar es explícito: descarta y cierra sin preguntar.
  const cancel = () => panel.navigate(null)

  if (newAction) {
    return (
      <ActionSheet
        key={JSON.stringify(newAction)}
        mode="create"
        request={newAction}
        projectId={projectId}
        plan={previewPlan}
        tree={previewTree}
        bounds={bounds}
        pending={creating}
        onPreview={panel.onNewPreview}
        onDirtyChange={panel.onNewDirty}
        onClose={close}
        onCreate={onCreate}
        onCancel={cancel}
      />
    )
  }

  const saved = editing.find(openId)
  if (openId && saved) {
    // El plan tal como quedaría con el borrador: lo que enseña el panel.
    const shownPlan = dirty
      ? (applyDraft(plan, { type: "edit", elementId: openId, input: draftInput }) ?? plan)
      : plan
    const shown = shownPlan.elements.find((element) => element.id === openId) ?? saved
    const common = {
      plan: shownPlan,
      bounds,
      editable: isOwner,
      pending,
      resetKey: panel.resetKey,
      onClose: close,
      onDraftChange: panel.onPanelDraft,
      onSave: (input: Parameters<PlanEditing["save"]>[1]) =>
        editing.save(openId, input, panel.restart),
      onCancel: cancel,
      onPrevious: panel.previous,
      onNext: panel.next,
    }
    if (isAction(saved)) {
      return (
        <ActionSheet
          key={openId}
          mode="edit"
          {...common}
          projectId={projectId}
          saved={saved}
          shown={shown}
          tree={tree}
          path={elementPath(plan.elements, saved).join(" › ")}
          onResolveWhen={(change, from) =>
            editing.resolveChange(
              { type: "when", elementId: openId, change },
              from
            ) as PlanEdit | null
          }
          onDelete={() => onDelete(openId)}
        />
      )
    }
    return (
      <ElementInspector
        key={openId}
        {...common}
        elementId={openId}
        savedName={saved.name}
        planSpan={planSpan}
        onOpen={panel.openElement}
        onOpenDay={panel.openDayPanel}
        onResolve={editing.resolveChange}
      />
    )
  }

  if (openDay && timeline) {
    return (
      <DaySheet
        day={openDay.day}
        rowId={openDay.rowId}
        tree={tree}
        timeline={timeline}
        canCreate={isOwner}
        onDay={panel.moveDay}
        onClose={close}
        onOpen={panel.openElement}
        onNewAction={panel.openNewAction}
      />
    )
  }
  return null
}
