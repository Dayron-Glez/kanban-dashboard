import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useParams } from "react-router"
import { IconTemplate } from "@tabler/icons-react"
import type { ActionKind } from "@repo/contracts"
import { fromIsoDate, type EpochDay } from "@repo/domain"
import { toast } from "sonner"
import { Button, cn, QueryErrorState, Skeleton, useIsMobile } from "@/shared/index"
import { useProject } from "@/features/project"
import {
  useCreateAction,
  useDeleteElement,
  useGenerateFromTemplate,
  usePlan,
} from "../api/elements"
import { usePlanChanges } from "../api/usePlanChanges"
import { buildElementTree, flattenTree, isAction, type ElementNode } from "../lib/elementTree"
import { setupSteps, summarizePlan } from "../lib/planFormat"
import { applyDraft, countChanges } from "../lib/planPreview"
import { describeAction, NEW_ACTION_TITLE } from "../lib/actionStyle"
import { ActionSheet } from "../forms/ActionSheet"
import { PREVIEW_ID, previewElement, type ActionFormData, type PlanEdit } from "../forms/actionForm"
import { pickView, type CalendarView } from "../lib/calendarViews"
import { loadGanttFields, saveGanttFields, type GanttFields } from "../lib/ganttFields"
import { loadMarks, saveMarks } from "../lib/ganttMarks"
import {
  countActionKinds,
  hideActionKinds,
  loadHiddenKinds,
  saveHiddenKinds,
} from "../lib/actionFilter"
import {
  buildTimeline,
  PLAN_ZOOMS,
  scrollLeftFor,
  type PlanZoom,
  type TimelineMarks,
} from "../lib/timeline"
import { ActionKindFilter } from "./ActionKindFilter"
import { ChangePreviewDialog } from "./ChangePreviewDialog"
import { DaySheet } from "./DaySheet"
import { DeleteActionDialog } from "./DeleteActionDialog"
import { DiscardDialog } from "./DiscardDialog"
import { usePanelNavigation } from "../hooks/usePanelNavigation"
import { usePlanEditing } from "../hooks/usePlanEditing"
import { elementPath } from "../lib/elementPath"
import { usePersistedState } from "../hooks/usePersistedState"
import { useUrlChoice } from "../hooks/useUrlChoice"
import { ElementInspector } from "./ElementInspector"
import { ElementTree } from "./ElementTree"
import { GanttGuide } from "./GanttGuide"
import { GoToDate } from "./GoToDate"
import { PlanHeader } from "./PlanHeader"
import { PlanSetup } from "./PlanSetup"
import { ViewOptionsMenu } from "./ViewOptionsMenu"
import { ViewSelector } from "./ViewSelector"
import { ZoomControl } from "./ZoomControl"

const pickZoom = (raw: string | null): PlanZoom =>
  PLAN_ZOOMS.find((value) => value === raw) ?? "dia"

// Lo que se despliega: lo que tiene hijos o acciones (su fila «Acciones»).
const parentIds = (nodes: ElementNode[]): string[] =>
  nodes.flatMap((node) => [
    ...(node.children.length > 0 || node.actions.length > 0 ? [node.element.id] : []),
    ...parentIds(node.children),
  ])

export function CalendarPage() {
  const { id: projectId = "" } = useParams<{ id: string }>()
  const plan = usePlan(projectId)
  const generate = useGenerateFromTemplate(projectId)
  const createAction = useCreateAction(projectId)
  const deleteElement = useDeleteElement(projectId)
  // La acción que se va a borrar, a falta de confirmarlo (desde el panel o con Supr).
  const [toDelete, setToDelete] = useState<string | null>(null)
  const changes = usePlanChanges(projectId, plan.data)
  const editing = usePlanEditing(plan.data, changes)
  // Todo empieza plegado: el plan entero de golpe es demasiado.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const isOwner = useProject(projectId).data?.role === "owner"
  const isMobile = useIsMobile()
  // La vista y el zoom van en la URL; los campos, las marcas y los tipos ocultos
  // se recuerdan en este navegador.
  const [calendarView, setCalendarView] = useUrlChoice<CalendarView>("vista", pickView)
  const [zoom, setZoom] = useUrlChoice<PlanZoom>("zoom", pickZoom)
  // En el móvil, el árbol con sus fechas: la rejilla no cabe.
  const view = isMobile ? "tabla" : "gantt"
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
  // El filtro es del Gantt: el árbol del móvil lo cuenta todo.
  const shownTree = useMemo(
    () => (view === "tabla" ? tree : hideActionKinds(tree, hiddenKinds)),
    [tree, view, hiddenKinds]
  )
  const steps = useMemo(() => setupSteps(elements ?? []), [elements])
  const summary = useMemo(() => summarizePlan(elements ?? []), [elements])
  const timeline = useMemo(() => buildTimeline(elements ?? [], undefined, zoom), [elements, zoom])
  // El elemento de arriba o de abajo en el árbol, para ↑ ↓ y los botones del panel.
  const order = useMemo(() => flattenTree(tree).map((node) => node.element.id), [tree])
  const panel = usePanelNavigation(order)
  const { openId, openDay, newAction, newValues, draftInput, dirty } = panel

  // El Gantt abre centrado en hoy, una vez por proyecto: después manda el usuario.
  const viewportRef = useRef<HTMLDivElement>(null)
  const goTo = (day: EpochDay, smooth = true) => {
    const viewport = viewportRef.current
    if (!viewport || !timeline) return
    const labels = viewport.querySelector<HTMLElement>("[data-grid-labels]")?.offsetWidth ?? 0
    const left = scrollLeftFor(day, timeline, viewport.clientWidth - labels)
    if (viewport.scrollTo) viewport.scrollTo({ left, behavior: smooth ? "smooth" : "auto" })
    else viewport.scrollLeft = left
  }
  const focusedProject = useRef<string | null>(null)
  useEffect(() => {
    if (!timeline || view === "tabla" || focusedProject.current === projectId) return
    focusedProject.current = projectId
    goTo(timeline.today, false)
  })
  const shortcuts = [
    ...(summary.anchor?.startsOn
      ? [{ label: `Inicio de ${summary.anchor.name}`, day: fromIsoDate(summary.anchor.startsOn) }]
      : []),
    ...(summary.span
      ? [
          { label: "Inicio del plan", day: fromIsoDate(summary.span.start) },
          { label: "Fin del plan", day: fromIsoDate(summary.span.end) },
        ]
      : []),
  ]

  const toggle = (elementId: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(elementId)) next.delete(elementId)
      else next.add(elementId)
      return next
    })

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

  // El plan tal como quedaría con el borrador: lo que enseña el panel.
  const shownPlan =
    plan.data && openId && dirty
      ? (applyDraft(plan.data, { type: "edit", elementId: openId, input: draftInput }) ?? plan.data)
      : plan.data
  // Con una acción a medio crear, el plan la lleva ya pintada.
  const previewPlan = useMemo(
    () =>
      plan.data && newAction && newValues
        ? {
            ...plan.data,
            elements: [...plan.data.elements, previewElement(newValues, projectId)],
          }
        : plan.data,
    [plan.data, newAction, newValues, projectId]
  )
  const previewTree = useMemo(
    () => (previewPlan === plan.data ? tree : buildElementTree(previewPlan?.elements ?? [])),
    [previewPlan, plan.data, tree]
  )
  const ganttTree = useMemo(
    () =>
      previewTree === tree
        ? shownTree
        : view === "tabla"
          ? previewTree
          : hideActionKinds(previewTree, hiddenKinds),
    [previewTree, tree, shownTree, view, hiddenKinds]
  )

  const createNewAction = ({ parentId, ...input }: ActionFormData) => {
    const before = new Set(plan.data?.elements.map((element) => element.id))
    createAction.mutate(
      { parentId, input },
      {
        onSuccess: (next) => {
          const created = next.elements.find((element) => !before.has(element.id))
          panel.navigate(created ? { element: created.id } : null)
          toast.success(`Se creó ${describeAction({ kind: input.kind, name: input.name })}`, {
            id: "plan-change",
          })
        },
      }
    )
  }

  const savedOpen = editing.find(openId)
  const shownOpen = shownPlan?.elements.find((element) => element.id === openId)

  const deleting = editing.find(toDelete) ?? null

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
          (openId || openDay != null || newAction) && "xl:pr-136"
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
            tree.length > 0 && (
              <>
                {view !== "tabla" && timeline && (
                  <>
                    <ZoomControl value={zoom} onChange={setZoom} />
                    <GoToDate
                      shortcuts={shortcuts}
                      today={timeline.today}
                      bounds={timeline.range}
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
                )}
              </>
            )
          }
        />

        {plan.isPending ? (
          <div className="flex flex-col gap-2" aria-busy>
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : plan.isError ? (
          <QueryErrorState error={plan.error} onRetry={() => void plan.refetch()} />
        ) : tree.length === 0 ? (
          <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center text-base">
            <p>Este proyecto todavía no tiene fases.</p>
            {isOwner ? (
              <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
                <IconTemplate className="mr-1 h-4 w-4" />
                Generar desde la plantilla
              </Button>
            ) : (
              <p>Solo el propietario puede generarlas desde la plantilla.</p>
            )}
          </div>
        ) : (
          <>
            {isOwner && (
              <PlanSetup steps={steps} pending={changes.pending} onUpdate={editing.onUpdate} />
            )}
            {view !== "tabla" && timeline && (
              <ActionKindFilter
                counts={actionCounts}
                hidden={hiddenWithActions}
                onChange={changeHiddenKinds}
              />
            )}
            <div className="-mx-6 min-h-0 flex-1 px-6">
              <ElementTree
                nodes={ganttTree}
                dependencies={plan.data.dependencies}
                editable={isOwner}
                pending={changes.pending}
                onUpdate={editing.onUpdate}
                onOpen={panel.openElement}
                onOpenDay={panel.openDayPanel}
                dayPanel={openDay}
                onMoveDate={editing.onMoveDate}
                onDragBar={editing.onDragBar}
                limitDrag={editing.limitDrag}
                onDeleteAction={setToDelete}
                onChangeActionKind={editing.changeKind}
                onNewAction={panel.openNewAction}
                expanded={expanded}
                onToggle={toggle}
                onReveal={(ids) => setExpanded((current) => new Set([...current, ...ids]))}
                onToggleAll={() => setExpanded(new Set(expanded.size > 0 ? [] : parentIds(tree)))}
                viewportRef={viewportRef}
                fields={fields}
                headerRows={fields}
                marks={marks}
                selectedId={newAction ? PREVIEW_ID : openId}
                view={view}
                timeline={timeline}
              />
            </div>
            <ChangePreviewDialog plan={plan.data} {...changes.dialog} />
          </>
        )}
      </div>
      {previewPlan && newAction && (
        <ActionSheet
          key={JSON.stringify(newAction)}
          mode="create"
          request={newAction}
          projectId={projectId}
          plan={previewPlan}
          tree={previewTree}
          bounds={timeline?.range}
          pending={createAction.isPending}
          onPreview={panel.onNewPreview}
          onDirtyChange={panel.onNewDirty}
          onClose={() => panel.go(null)}
          onCreate={createNewAction}
        />
      )}
      {shownPlan && openId && savedOpen && shownOpen && isAction(savedOpen) && (
        <ActionSheet
          key={openId}
          resetKey={panel.resetKey}
          mode="edit"
          saved={savedOpen}
          shown={shownOpen}
          projectId={projectId}
          plan={shownPlan}
          tree={tree}
          bounds={timeline?.range}
          editable={isOwner}
          pending={changes.pending || deleteElement.isPending}
          path={elementPath(plan.data?.elements ?? [], savedOpen).join(" › ")}
          onClose={() => panel.go(null)}
          onDraftChange={panel.onPanelDraft}
          onResolveWhen={(change, from) =>
            editing.resolveChange(
              { type: "when", elementId: openId, change },
              from
            ) as PlanEdit | null
          }
          onSave={(input) => editing.save(openId, input, panel.restart)}
          onDiscard={panel.restart}
          onDelete={() => setToDelete(openId)}
          onPrevious={panel.previous}
          onNext={panel.next}
        />
      )}
      {shownPlan && openId && !(savedOpen && isAction(savedOpen)) && (
        <ElementInspector
          key={openId}
          resetKey={panel.resetKey}
          elementId={openId}
          plan={shownPlan}
          savedName={savedOpen?.name ?? ""}
          editable={isOwner}
          pending={changes.pending || deleteElement.isPending}
          onClose={() => panel.go(null)}
          onOpenDay={panel.openDayPanel}
          bounds={timeline?.range}
          onOpen={panel.openElement}
          planSpan={summary.span}
          onPrevious={panel.previous}
          onNext={panel.next}
          onResolve={editing.resolveChange}
          onDraftChange={panel.onPanelDraft}
          onSave={(input) => editing.save(openId, input, panel.restart)}
          onDiscard={panel.restart}
        />
      )}
      <DeleteActionDialog
        action={
          deleting && {
            kind: deleting.kind as ActionKind,
            name: deleting.name,
            startsOn: deleting.startsOn,
            endsOn: deleting.endsOn,
            parent: deleting.parentId ? editing.nameOf(deleting.parentId) : null,
          }
        }
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (!deleting) return
          setToDelete(null)
          deleteElement.mutate(deleting.id, {
            onSuccess: () => {
              // Si estaba abierta, el panel se cierra: lo que tuviera sin guardar ya no vale.
              if (openId === deleting.id) panel.navigate(null)
              toast.success(
                `Se borró ${describeAction({ kind: deleting.kind as ActionKind, name: deleting.name })}`,
                {
                  id: "plan-change",
                }
              )
            },
          })
        }}
      />
      <DiscardDialog
        open={panel.leaving != null}
        name={
          newAction
            ? newValues?.name.trim() || NEW_ACTION_TITLE[newValues?.kind ?? newAction.kind]
            : (savedOpen?.name ?? "")
        }
        changes={countChanges(draftInput)}
        creating={newAction != null}
        onStay={panel.stay}
        onDiscard={panel.discard}
      />
      {timeline && openDay != null && (
        <DaySheet
          day={openDay.day}
          rowId={openDay.rowId}
          tree={tree}
          timeline={timeline}
          canCreate={isOwner}
          onDay={panel.moveDay}
          onClose={() => panel.go(null)}
          onOpen={panel.openElement}
          onNewAction={panel.openNewAction}
        />
      )}
    </div>
  )
}
