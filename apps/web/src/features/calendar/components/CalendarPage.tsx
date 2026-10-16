import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { useParams, useSearchParams } from "react-router"
import { IconTemplate } from "@tabler/icons-react"
import type {
  ActionKind,
  DatePoint,
  EditElementInput,
  SetElementRuleInput,
  UpdateElementPlanInput,
} from "@repo/contracts"
import { describePhaseViolation, fromIsoDate, toIsoDate, type EpochDay } from "@repo/domain"
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
import {
  buildElementTree,
  ELEMENT_KIND_LABELS,
  flattenTree,
  type ElementNode,
} from "../lib/elementTree"
import { formatPlanDate, setupSteps, summarizePlan } from "../lib/planFormat"
import {
  applyDraft,
  clampMove,
  countChanges,
  describeShift,
  mergeChange,
  planMove,
  previewChange,
  type PlanChange,
} from "../lib/planPreview"
import { describeAction, kindChange, NEW_ACTION_TITLE } from "../lib/actionStyle"
import { ActionSheet } from "../forms/ActionSheet"
import {
  newActionValues,
  PREVIEW_ID,
  previewElement,
  type ActionFormData,
  type NewActionRequest,
} from "../forms/actionForm"
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
  dragTarget,
  PLAN_ZOOMS,
  scrollLeftFor,
  type BarDrag,
  type PlanZoom,
  type TimelineMarks,
} from "../lib/timeline"
import { ActionKindFilter } from "./ActionKindFilter"
import { ChangePreviewDialog } from "./ChangePreviewDialog"
import { DaySheet } from "./DaySheet"
import { DeleteActionDialog } from "./DeleteActionDialog"
import { DiscardDialog } from "./DiscardDialog"
import type { WhenChange } from "./WhenPicker"
import type { DayPanel } from "../hooks/useGanttCells"
import { ElementInspector } from "./ElementInspector"
import { ElementTree } from "./ElementTree"
import { GanttGuide } from "./GanttGuide"
import { GoToDate } from "./GoToDate"
import { PlanHeader } from "./PlanHeader"
import { PlanSetup } from "./PlanSetup"
import { ViewOptionsMenu } from "./ViewOptionsMenu"
import { ViewSelector } from "./ViewSelector"
import { ZoomControl } from "./ZoomControl"

// Lo que se despliega: lo que tiene hijos o acciones (su fila «Acciones»).
const parentIds = (nodes: ElementNode[]): string[] =>
  nodes.flatMap((node) => [
    ...(node.children.length > 0 || node.actions.length > 0 ? [node.element.id] : []),
    ...parentIds(node.children),
  ])

// Adónde se va desde el panel: otro elemento, un día, una acción nueva, o cerrar.
type PanelTarget = { element: string } | { day: DayPanel } | { newAction: NewActionRequest } | null

const NO_DRAFT: EditElementInput = {}

export function CalendarPage() {
  const { id: projectId = "" } = useParams<{ id: string }>()
  const plan = usePlan(projectId)
  const generate = useGenerateFromTemplate(projectId)
  const createAction = useCreateAction(projectId)
  const deleteElement = useDeleteElement(projectId)
  // La acción que se va a borrar, a falta de confirmarlo (desde el panel o con Supr).
  const [toDelete, setToDelete] = useState<string | null>(null)
  const changes = usePlanChanges(projectId, plan.data)
  const [openId, setOpenId] = useState<string | null>(null)
  // A la derecha va un panel cada vez: el de un elemento o el de un día.
  const [openDay, setOpenDay] = useState<DayPanel | null>(null)
  // Lo editado en el panel del elemento, sin guardar todavía.
  const [draft, setDraft] = useState<{ elementId: string; input: EditElementInput } | null>(null)
  const draftInput = draft && draft.elementId === openId ? draft.input : NO_DRAFT
  // La acción que se está creando, con lo escrito hasta ahora (su vista previa).
  const [newAction, setNewAction] = useState<NewActionRequest | null>(null)
  const [newValues, setNewValues] = useState<ActionFormData | null>(null)
  const [newDirty, setNewDirty] = useState<boolean>(false)
  const dirty = countChanges(draftInput) > 0 || (newAction != null && newDirty)
  // Salir del panel con cambios pregunta antes; esto es adónde se iba.
  const [leaving, setLeaving] = useState<{ target: PanelTarget } | null>(null)
  const navigate = (target: PanelTarget) => {
    setDraft(null)
    setOpenId(target && "element" in target ? target.element : null)
    setOpenDay(target && "day" in target ? target.day : null)
    const request = target && "newAction" in target ? target.newAction : null
    setNewAction(request)
    setNewValues(request && newActionValues(request))
    setNewDirty(false)
  }
  const go = (target: PanelTarget) => {
    const same = target && "element" in target && target.element === openId
    if (same) return
    if (dirty) setLeaving({ target })
    else navigate(target)
  }
  const openElement = (id: string) => go({ element: id })
  const openDayPanel = (day: EpochDay, rowId: string | null) => go({ day: { day, rowId } })
  const openNewAction = (request: NewActionRequest) => go({ newAction: request })
  const onNewPreview = useCallback((values: ActionFormData) => setNewValues(values), [])
  // Todo empieza plegado: el plan entero de golpe es demasiado.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const isOwner = useProject(projectId).data?.role === "owner"
  const isMobile = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()
  // La vista va en la URL, para que un enlace abra lo mismo que se ve.
  const calendarView = pickView(searchParams.get("vista"))
  const setCalendarView = (next: CalendarView) =>
    setSearchParams(
      (params) => {
        params.set("vista", next)
        return params
      },
      { replace: true }
    )
  // El zoom también va en la URL.
  const zoom = PLAN_ZOOMS.find((value) => value === searchParams.get("zoom")) ?? "dia"
  const setZoom = (next: PlanZoom) =>
    setSearchParams(
      (params) => {
        params.set("zoom", next)
        return params
      },
      { replace: true }
    )
  // En el móvil, el árbol con sus fechas: la rejilla no cabe.
  const view = isMobile ? "tabla" : "gantt"
  // Los campos visibles se recuerdan en este navegador.
  const [fields, setFields] = useState<GanttFields>(loadGanttFields)
  const changeFields = (next: GanttFields) => {
    setFields(next)
    saveGanttFields(next)
  }
  const [marks, setMarks] = useState<TimelineMarks>(loadMarks)
  const changeMarks = (next: TimelineMarks) => {
    setMarks(next)
    saveMarks(next)
  }
  // Los tipos de acción ocultos en el Gantt, también recordados.
  const [hiddenKinds, setHiddenKinds] = useState<ActionKind[]>(loadHiddenKinds)
  const changeHiddenKinds = (next: ActionKind[]) => {
    setHiddenKinds(next)
    saveHiddenKinds(next)
  }
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

  const onUpdate = (elementId: string, input: UpdateElementPlanInput) =>
    changes.request({ type: "update", elementId, input })

  // El elemento de arriba o de abajo en el árbol, para ↑ ↓ y los botones del panel.
  const order = flattenTree(tree).map((node) => node.element.id)
  const neighbour = (delta: -1 | 1) => (openId ? order[order.indexOf(openId) + delta] : undefined)

  // Con el inspector abierto: ↑ ↓ pasan al elemento de arriba o de abajo, Esc cierra.
  useEffect(() => {
    if (!openId || !elements) return
    const order = flattenTree(tree).map((node) => node.element.id)
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        target.closest(
          "input, textarea, [role=dialog], [role=alertdialog], [role=listbox], [data-radix-popper-content-wrapper]"
        )
      )
        return
      const leave = (id: string | null) => {
        if (dirty) setLeaving({ target: id ? { element: id } : null })
        else setOpenId(id)
      }
      if (event.key === "Escape") leave(null)
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
      const index = order.indexOf(openId)
      const next = order[index + (event.key === "ArrowDown" ? 1 : -1)]
      if (next) {
        event.preventDefault()
        leave(next)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [openId, elements, tree, dirty])

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

  const nameOf = (id: string) =>
    plan.data?.elements.find((element) => element.id === id)?.name ?? id

  // Una fecha escrita a mano se convierte en el cambio de regla o duración que la
  // produce. Si rompería el orden de las fases, se para en el tope y se avisa.
  const moveTo = (
    elementId: string,
    point: DatePoint,
    requested: EpochDay,
    title: (date: EpochDay) => string
  ) => {
    if (!plan.data) return
    const move = planMove(plan.data, elementId, point, requested, nameOf)
    if ("error" in move) {
      toast.error(move.error, { id: "plan-change", description: move.description })
      return
    }
    changes.request(move.change, title(move.date), move.note)
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
          navigate(created ? { element: created.id } : null)
          toast.success(`Se creó ${describeAction({ kind: input.kind, name: input.name })}`, {
            id: "plan-change",
          })
        },
      }
    )
  }

  // En el panel, cada cambio se suma al borrador; se comprueba ya, para no dejar
  // guardar algo que la API rechazaría.
  const commitDraft = (elementId: string, input: EditElementInput) => {
    if (!plan.data) return
    const preview = previewChange(plan.data, { type: "edit", elementId, input })
    if ("cycle" in preview) {
      toast.error("Esa regla cerraría un ciclo", {
        description: preview.cycle.map(nameOf).join(" → "),
      })
      return
    }
    const [broken] = preview.broken
    if (broken) {
      toast.error("No se puede hacer ese cambio", {
        id: "plan-change",
        description: describePhaseViolation(broken, nameOf),
      })
      return
    }
    setDraft({ elementId, input })
  }
  const addToDraft = (change: PlanChange) =>
    plan.data && commitDraft(change.elementId, mergeChange(plan.data, draftInput, change))

  // Lo elegido en «Cuándo», en orden: el inicio, y después la duración o el fin,
  // cada uno sobre el plan que deja el anterior.
  const applyWhen = (elementId: string, change: WhenChange) => {
    const base = plan.data
    if (!base) return
    let input = draftInput
    const current = () =>
      countChanges(input) > 0
        ? (applyDraft(base, { type: "edit", elementId, input }) ?? base)
        : base
    const move = (point: DatePoint, date: string) => {
      const result = planMove(current(), elementId, point, fromIsoDate(date), nameOf)
      if ("error" in result) {
        toast.error(result.error, { id: "plan-change", description: result.description })
        return false
      }
      if (result.note) toast.info(result.note, { id: "plan-change" })
      input = mergeChange(base, input, result.change)
      return true
    }
    if (change.start && !move("start", change.start)) return
    if (change.duration) {
      input = mergeChange(base, input, {
        type: "update",
        elementId,
        input: { duration: change.duration },
      })
    } else if (change.end && !move("end", change.end)) return
    commitDraft(elementId, input)
  }
  const deleting =
    (toDelete && plan.data?.elements.find((element) => element.id === toDelete)) || null

  const saveDraft = () => {
    if (!openId || !dirty) return
    const elementId = openId
    changes.request({ type: "edit", elementId, input: draftInput }, undefined, undefined, () =>
      setDraft((current) => (current?.elementId === elementId ? null : current))
    )
  }

  const onMoveDate = (elementId: string, point: DatePoint, date: string) =>
    moveTo(
      elementId,
      point,
      fromIsoDate(date),
      (final) =>
        `Mover el ${point === "start" ? "inicio" : "fin"} de ${nameOf(elementId)} al ${formatPlanDate(toIsoDate(final))}`
    )

  // Arrastrar una barra es escribir la fecha que cambia: pasa por la misma vista previa.
  const onDragBar = (elementId: string, drag: BarDrag, days: number) => {
    const element = plan.data?.elements.find((candidate) => candidate.id === elementId)
    if (!element || !plan.data) return
    const target = dragTarget(element, plan.data.dependencies, drag, days)
    if (!target) return
    moveTo(elementId, target.point, target.date, (final) => {
      const shift = days + final - target.date
      return drag === "move"
        ? `Mover ${element.name} ${describeShift(shift)} ${shift > 0 ? "más tarde" : "antes"}`
        : `Mover el ${target.point === "start" ? "inicio" : "fin"} de ${element.name} al ${formatPlanDate(toIsoDate(final))}`
    })
  }

  // Mientras se arrastra: hasta dónde se puede llegar sin romper el orden de las fases.
  const limitDrag = (elementId: string, drag: BarDrag, days: number) => {
    const element = plan.data?.elements.find((candidate) => candidate.id === elementId)
    const target = element && plan.data && dragTarget(element, plan.data.dependencies, drag, days)
    if (!target || !plan.data) return { days, reason: null }
    const clamped = clampMove(plan.data, elementId, target.point, target.date)
    if ("error" in clamped || !clamped.limit) return { days, reason: null }
    return {
      days: days + clamped.date - target.date,
      reason: clamped.limit.kind === "order" ? "orden de las fases" : "25 % de solape",
    }
  }

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
          (openId || openDay != null || newAction) && "xl:pr-[544px]"
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
            {isOwner && <PlanSetup steps={steps} pending={changes.pending} onUpdate={onUpdate} />}
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
                onUpdate={onUpdate}
                onOpen={openElement}
                onOpenDay={openDayPanel}
                dayPanel={openDay}
                onMoveDate={onMoveDate}
                onDragBar={onDragBar}
                limitDrag={limitDrag}
                onDeleteAction={setToDelete}
                onChangeActionKind={(elementId, kind) => {
                  const action = plan.data?.elements.find((element) => element.id === elementId)
                  if (!action) return
                  changes.request(
                    { type: "edit", elementId, input: kindChange(action, kind) },
                    `Cambiar ${action.name} a ${ELEMENT_KIND_LABELS[kind].toLowerCase()}`
                  )
                }}
                onNewAction={openNewAction}
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
          request={newAction}
          projectId={projectId}
          plan={previewPlan}
          tree={previewTree}
          bounds={timeline?.range}
          pending={createAction.isPending}
          onPreview={onNewPreview}
          onDirtyChange={setNewDirty}
          onClose={() => go(null)}
          onCreate={createNewAction}
        />
      )}
      {shownPlan && openId && (
        <ElementInspector
          elementId={openId}
          plan={shownPlan}
          editable={isOwner}
          pending={changes.pending || deleteElement.isPending}
          onClose={() => go(null)}
          onUpdate={(elementId, input: UpdateElementPlanInput) =>
            addToDraft({ type: "update", elementId, input })
          }
          onApplyWhen={applyWhen}
          onEdit={(elementId, input) => addToDraft({ type: "edit", elementId, input })}
          onDelete={setToDelete}
          onOpenDay={openDayPanel}
          bounds={timeline?.range}
          onSetRule={(elementId, point, input: SetElementRuleInput) =>
            addToDraft({ type: "set-rule", elementId, point, input })
          }
          onRemoveRule={(elementId, point) => addToDraft({ type: "remove-rule", elementId, point })}
          onOpen={openElement}
          planSpan={summary.span}
          onPrevious={neighbour(-1) ? () => openElement(neighbour(-1)!) : undefined}
          onNext={neighbour(1) ? () => openElement(neighbour(1)!) : undefined}
          draft={{
            input: draftInput,
            onSave: saveDraft,
            onDiscard: () => setDraft(null),
          }}
        />
      )}
      <DeleteActionDialog
        action={
          deleting && {
            kind: deleting.kind as ActionKind,
            name: deleting.name,
            startsOn: deleting.startsOn,
            endsOn: deleting.endsOn,
            parent: deleting.parentId ? nameOf(deleting.parentId) : null,
          }
        }
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (!deleting) return
          setToDelete(null)
          deleteElement.mutate(deleting.id, {
            onSuccess: () => {
              // Si estaba abierta, el panel se cierra: lo que tuviera sin guardar ya no vale.
              if (openId === deleting.id) navigate(null)
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
        open={leaving != null}
        name={
          newAction
            ? newValues?.name.trim() || NEW_ACTION_TITLE[newValues?.kind ?? newAction.kind]
            : (plan.data?.elements.find((element) => element.id === openId)?.name ?? "")
        }
        changes={countChanges(draftInput)}
        creating={newAction != null}
        onStay={() => setLeaving(null)}
        onDiscard={() => {
          if (leaving) navigate(leaving.target)
          setLeaving(null)
        }}
      />
      {timeline && openDay != null && (
        <DaySheet
          day={openDay.day}
          rowId={openDay.rowId}
          tree={tree}
          timeline={timeline}
          canCreate={isOwner}
          onDay={(day) => setOpenDay({ ...openDay, day })}
          onClose={() => go(null)}
          onOpen={openElement}
          onNewAction={openNewAction}
        />
      )}
    </div>
  )
}
