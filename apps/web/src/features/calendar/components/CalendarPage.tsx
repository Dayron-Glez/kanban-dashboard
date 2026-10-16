import { useMemo, type PointerEvent as ReactPointerEvent } from "react"
import { useParams } from "react-router"
import type { ActionKind } from "@repo/contracts"
import { fromIsoDate, type EpochDay } from "@repo/domain"
import { cn, useIsMobile } from "@/shared/index"
import { useProject } from "@/features/project"
import { useGenerateFromTemplate, usePlan } from "../api/elements"
import { usePlanChanges } from "../api/usePlanChanges"
import { buildElementTree, flattenTree } from "../lib/elementTree"
import { setupSteps, summarizePlan } from "../lib/planFormat"
import { countChanges } from "../lib/planPreview"
import { PREVIEW_ID } from "../forms/actionForm"
import { pickView, type CalendarView } from "../lib/calendarViews"
import { loadGanttFields, saveGanttFields, type GanttFields } from "../lib/ganttFields"
import { loadMarks, saveMarks } from "../lib/ganttMarks"
import { countActionKinds, loadHiddenKinds, saveHiddenKinds } from "../lib/actionFilter"
import { buildTimeline, PLAN_ZOOMS, type PlanZoom, type TimelineMarks } from "../lib/timeline"
import { ActionKindFilter } from "./ActionKindFilter"
import { ChangePreviewDialog } from "./ChangePreviewDialog"
import { CalendarPanels } from "./CalendarPanels"
import { DeleteActionDialog } from "./DeleteActionDialog"
import { DiscardDialog } from "./DiscardDialog"
import { usePanelNavigation } from "../hooks/usePanelNavigation"
import { usePlanEditing } from "../hooks/usePlanEditing"
import { useActionLifecycle } from "../hooks/useActionLifecycle"
import { useGanttScroll } from "../hooks/useGanttScroll"
import { useExpanded } from "../hooks/useExpanded"
import { usePlanPreview } from "../hooks/usePlanPreview"
import { usePersistedState } from "../hooks/usePersistedState"
import { useUrlChoice } from "../hooks/useUrlChoice"
import { ElementTree } from "./ElementTree"
import { GanttGuide } from "./GanttGuide"
import { GoToDate } from "./GoToDate"
import { PlanHeader } from "./PlanHeader"
import { PlanSetup } from "./PlanSetup"
import { PlanStatus } from "./PlanStatus"
import { ViewOptionsMenu } from "./ViewOptionsMenu"
import { ViewSelector } from "./ViewSelector"
import { ZoomControl } from "./ZoomControl"

const pickZoom = (raw: string | null): PlanZoom =>
  PLAN_ZOOMS.find((value) => value === raw) ?? "dia"

// Los atajos de «Ir a»: el inicio del ancla y el del plan entero y su fin.
const shortcutsOf = ({ anchor, span }: ReturnType<typeof summarizePlan>) => {
  const shortcuts: { label: string; day: EpochDay }[] = []
  if (anchor?.startsOn) {
    shortcuts.push({ label: `Inicio de ${anchor.name}`, day: fromIsoDate(anchor.startsOn) })
  }
  if (span) {
    shortcuts.push(
      { label: "Inicio del plan", day: fromIsoDate(span.start) },
      { label: "Fin del plan", day: fromIsoDate(span.end) }
    )
  }
  return shortcuts
}

// Resaltar un tipo de acción sin volver a pintar el Gantt: lo hace el CSS
// (tailwind.css) a partir de estos atributos del contenedor.
const followActionKind = (event: ReactPointerEvent<HTMLDivElement>) => {
  const surface = event.currentTarget
  const target = event.type === "pointerleave" ? null : (event.target as Element)
  const filter = target?.closest<HTMLElement>("[data-kind-filter]")
  const mark = target?.closest<HTMLElement>("[data-action-kind]")
  const focus = filter?.getAttribute("aria-pressed") === "true" ? filter.dataset.kindFilter : null
  if (focus) surface.dataset.actionFocus = focus
  else delete surface.dataset.actionFocus
  if (mark?.dataset.actionKind) surface.dataset.actionHover = mark.dataset.actionKind
  else delete surface.dataset.actionHover
}

export function CalendarPage() {
  const { id: projectId = "" } = useParams<{ id: string }>()
  const plan = usePlan(projectId)
  const generate = useGenerateFromTemplate(projectId)
  const changes = usePlanChanges(projectId, plan.data)
  const editing = usePlanEditing(plan.data, changes)
  const isOwner = useProject(projectId).data?.role === "owner"
  // En el móvil, el árbol con sus fechas: la rejilla no cabe.
  const view = useIsMobile() ? "tabla" : "gantt"
  // La vista y el zoom van en la URL; los campos, las marcas y los tipos ocultos
  // se recuerdan en este navegador.
  const [calendarView, setCalendarView] = useUrlChoice<CalendarView>("vista", pickView)
  const [zoom, setZoom] = useUrlChoice<PlanZoom>("zoom", pickZoom)
  const [fields, changeFields] = usePersistedState<GanttFields>(loadGanttFields, saveGanttFields)
  const [marks, changeMarks] = usePersistedState<TimelineMarks>(loadMarks, saveMarks)
  const [hiddenKinds, changeHiddenKinds] = usePersistedState<ActionKind[]>(
    loadHiddenKinds,
    saveHiddenKinds
  )
  const elements = plan.data?.elements
  const tree = useMemo(() => buildElementTree(elements ?? []), [elements])
  const actionCounts = useMemo(() => countActionKinds(tree), [tree])
  // Un tipo sin acciones nunca está oculto: si se ocultó cuando tenía, al vaciarse deja de estarlo.
  const hiddenWithActions = hiddenKinds.filter((kind) => actionCounts[kind] > 0)
  const steps = useMemo(() => setupSteps(elements ?? []), [elements])
  const summary = useMemo(() => summarizePlan(elements ?? []), [elements])
  const timeline = useMemo(() => buildTimeline(elements ?? [], undefined, zoom), [elements, zoom])
  // Lo propio del Gantt (zoom, ir a una fecha, filtro de tipos) no va en el móvil.
  const gantt = view === "gantt" ? timeline : null
  // El elemento de arriba o de abajo en el árbol, para ↑ ↓ y los botones del panel.
  const order = useMemo(() => flattenTree(tree).map((node) => node.element.id), [tree])
  const panel = usePanelNavigation(order)
  const { openId, openDay, newAction, newValues } = panel
  const actions = useActionLifecycle(projectId, plan.data, panel, editing)
  const { viewportRef, goTo } = useGanttScroll(timeline, view === "gantt", projectId)

  // Con una acción a medio crear, el plan la lleva ya pintada.
  const { previewPlan, previewTree, ganttTree } = usePlanPreview({
    plan: plan.data,
    tree,
    projectId,
    newValues: newAction ? newValues : null,
    view,
    hiddenKinds,
  })
  const outline = useExpanded(tree)
  const panelOpen = openId != null || openDay != null || newAction != null

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1">
      {/* Con el detalle abierto, en pantallas anchas el plan le deja sitio y no queda tapado.
          Pulsar aquí no cierra el panel: se sigue trabajando con él abierto. */}
      <div
        onPointerOver={followActionKind}
        onPointerLeave={followActionKind}
        data-calendar-surface
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-6 pb-0",
          panelOpen && "xl:pr-136"
        )}
      >
        <PlanHeader
          title={
            <>
              <h1 className="sr-only">Calendario</h1>
              <ViewSelector value={calendarView} onChange={setCalendarView} />
            </>
          }
          summary={summary}
          actions={
            tree.length > 0 &&
            gantt && (
              <>
                <ZoomControl value={zoom} onChange={setZoom} />
                <GoToDate
                  shortcuts={shortcutsOf(summary)}
                  today={gantt.today}
                  bounds={gantt.range}
                  onGo={goTo}
                />
                <ViewOptionsMenu
                  fields={fields}
                  onFieldsChange={changeFields}
                  marks={marks}
                  onMarksChange={changeMarks}
                />
                <GanttGuide />
              </>
            )
          }
        />

        <PlanStatus
          pending={plan.isPending}
          error={plan.error}
          onRetry={() => void plan.refetch()}
          empty={tree.length === 0}
          canGenerate={isOwner}
          generating={generate.isPending}
          onGenerate={() => generate.mutate()}
        >
          {isOwner && (
            <PlanSetup steps={steps} pending={changes.pending} onUpdate={editing.onUpdate} />
          )}
          {gantt && (
            <ActionKindFilter
              counts={actionCounts}
              hidden={hiddenWithActions}
              onChange={changeHiddenKinds}
            />
          )}
          <div className="-mx-6 min-h-0 flex-1 px-6">
            <ElementTree
              nodes={ganttTree}
              dependencies={plan.data?.dependencies ?? []}
              editable={isOwner}
              pending={changes.pending}
              onUpdate={editing.onUpdate}
              onOpen={panel.openElement}
              onOpenDay={panel.openDayPanel}
              dayPanel={openDay}
              onMoveDate={editing.onMoveDate}
              onDragBar={editing.onDragBar}
              limitDrag={editing.limitDrag}
              onDeleteAction={actions.requestDelete}
              onChangeActionKind={editing.changeKind}
              onNewAction={panel.openNewAction}
              expanded={outline.expanded}
              onToggle={outline.toggle}
              onReveal={outline.reveal}
              onToggleAll={outline.toggleAll}
              viewportRef={viewportRef}
              fields={fields}
              headerRows={fields}
              marks={marks}
              selectedId={newAction ? PREVIEW_ID : openId}
              view={view}
              timeline={timeline}
            />
          </div>
          {plan.data && <ChangePreviewDialog plan={plan.data} {...changes.dialog} />}
        </PlanStatus>
      </div>
      {plan.data && previewPlan && (
        <CalendarPanels
          projectId={projectId}
          plan={plan.data}
          previewPlan={previewPlan}
          tree={tree}
          previewTree={previewTree}
          timeline={timeline}
          planSpan={summary.span}
          isOwner={isOwner}
          pending={changes.pending || actions.deletePending}
          creating={actions.creating}
          panel={panel}
          editing={editing}
          onCreate={actions.create}
          onDelete={actions.requestDelete}
        />
      )}
      <DeleteActionDialog
        action={actions.deleting}
        onCancel={actions.cancelDelete}
        onConfirm={actions.confirmDelete}
      />
      <DiscardDialog
        open={panel.leaving != null}
        name={panel.newActionName ?? editing.find(openId)?.name ?? ""}
        changes={countChanges(panel.draftInput)}
        creating={newAction != null}
        onStay={panel.stay}
        onDiscard={panel.discard}
      />
    </div>
  )
}
