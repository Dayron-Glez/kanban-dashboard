import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "react-router"
import {
  IconChevronsDown,
  IconChevronsUp,
  IconPointFilled,
  IconTemplate,
} from "@tabler/icons-react"
import type { DatePoint, SetElementRuleInput, UpdateElementPlanInput } from "@repo/contracts"
import {
  describePhaseViolation,
  fromIsoDate,
  moveEnd,
  moveStart,
  toIsoDate,
  type EpochDay,
} from "@repo/domain"
import { toast } from "sonner"
import { Button, cn, QueryErrorState, Skeleton, useIsMobile } from "@/shared/index"
import { useProject } from "@/features/project"
import { useGenerateFromTemplate, usePlan } from "../api/elements"
import { usePlanChanges } from "../api/usePlanChanges"
import { buildElementTree, type ElementNode } from "../lib/elementTree"
import { formatPlanDate, setupSteps, summarizePlan } from "../lib/planFormat"
import { changeForEdit, clampMove, describeShift, editContext } from "../lib/planPreview"
import { pickView, type CalendarView } from "../lib/calendarViews"
import { loadGanttFields, saveGanttFields, type GanttFields } from "../lib/ganttFields"
import { buildTimeline, dragTarget, scrollLeftFor, type BarDrag } from "../lib/timeline"
import { ChangePreviewDialog } from "./ChangePreviewDialog"
import { ElementInspector } from "./ElementInspector"
import { ElementTree } from "./ElementTree"
import { FieldsMenu } from "./FieldsMenu"
import { GoToDate } from "./GoToDate"
import { PlanHeader } from "./PlanHeader"
import { PlanSetup } from "./PlanSetup"
import { ViewSelector } from "./ViewSelector"

const flattenIds = (nodes: ElementNode[]): string[] =>
  nodes.flatMap((node) => [node.element.id, ...flattenIds(node.children)])

const parentIds = (nodes: ElementNode[]): string[] =>
  nodes.flatMap((node) =>
    node.children.length > 0 ? [node.element.id, ...parentIds(node.children)] : []
  )

const EDIT_ERRORS = {
  "missing-reference": "No se puede calcular: depende de algo que todavía no tiene fecha",
  inverted: "El inicio no puede quedar después del fin",
} as const

export function CalendarPage() {
  const { id: projectId = "" } = useParams<{ id: string }>()
  const plan = usePlan(projectId)
  const generate = useGenerateFromTemplate(projectId)
  const changes = usePlanChanges(projectId, plan.data)
  const [openId, setOpenId] = useState<string | null>(null)
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
  // En el móvil, el árbol con sus fechas: la rejilla no cabe.
  const view = isMobile ? "tabla" : "gantt"
  // Los campos visibles se recuerdan en este navegador.
  const [fields, setFields] = useState<GanttFields>(loadGanttFields)
  const changeFields = (next: GanttFields) => {
    setFields(next)
    saveGanttFields(next)
  }
  const elements = plan.data?.elements
  const tree = useMemo(() => buildElementTree(elements ?? []), [elements])
  const steps = useMemo(() => setupSteps(elements ?? []), [elements])
  const summary = useMemo(() => summarizePlan(elements ?? []), [elements])
  const timeline = useMemo(() => buildTimeline(elements ?? []), [elements])

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
  const onSetRule = (elementId: string, point: DatePoint, input: SetElementRuleInput) =>
    changes.request({ type: "set-rule", elementId, point, input })
  const onRemoveRule = (elementId: string, point: DatePoint) =>
    changes.request({ type: "remove-rule", elementId, point })

  // Con el inspector abierto: ↑ ↓ pasan al elemento de arriba o de abajo, Esc cierra.
  useEffect(() => {
    if (!openId || !elements) return
    const order = flattenIds(tree)
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        target.closest(
          "input, textarea, [role=dialog], [role=alertdialog], [role=listbox], [data-radix-popper-content-wrapper]"
        )
      )
        return
      if (event.key === "Escape") setOpenId(null)
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
      const index = order.indexOf(openId)
      const next = order[index + (event.key === "ArrowDown" ? 1 : -1)]
      if (next) {
        event.preventDefault()
        setOpenId(next)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [openId, elements, tree])

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
    const clamped = clampMove(plan.data, elementId, point, requested)
    if ("error" in clamped) {
      toast.error(EDIT_ERRORS[clamped.error])
      return
    }
    const reason = clamped.limit && describePhaseViolation(clamped.limit, nameOf)
    const result = (point === "start" ? moveStart : moveEnd)(
      editContext(plan.data, elementId),
      clamped.date
    )
    if ("error" in result) {
      toast.error(EDIT_ERRORS[result.error])
      return
    }
    const change = changeForEdit(plan.data, elementId, result.edit)
    if (clamped.date === editContext(plan.data, elementId).dates.get(elementId)?.[point]) {
      toast.error("Ya está en el tope", { id: "plan-change", description: reason ?? undefined })
      return
    }
    const adjusted =
      clamped.date !== requested && reason
        ? `Ajustado al ${formatPlanDate(toIsoDate(clamped.date))}: ${reason}.`
        : undefined
    changes.request(change, title(clamped.date), adjusted)
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
      {/* Con el detalle abierto, en pantallas anchas el plan le deja sitio y no queda tapado. */}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-6 pb-0",
          openId && "xl:pr-[424px]"
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-8 text-xs"
                  onClick={() => setExpanded(new Set(expanded.size > 0 ? [] : parentIds(tree)))}
                >
                  {expanded.size > 0 ? (
                    <IconChevronsUp className="size-3.5" aria-hidden />
                  ) : (
                    <IconChevronsDown className="size-3.5" aria-hidden />
                  )}
                  {expanded.size > 0 ? "Plegar todo" : "Desplegar todo"}
                </Button>
                {view !== "tabla" && timeline && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-primary h-8 text-xs"
                      onClick={() => goTo(timeline.today)}
                    >
                      <IconPointFilled className="size-3.5" aria-hidden />
                      Hoy
                    </Button>
                    <GoToDate shortcuts={shortcuts} onGo={goTo} />
                    <FieldsMenu value={fields} onChange={changeFields} />
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
          <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center text-sm">
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
            <div className="-mx-6 min-h-0 flex-1 px-6">
              <ElementTree
                nodes={tree}
                dependencies={plan.data.dependencies}
                editable={isOwner}
                pending={changes.pending}
                onUpdate={onUpdate}
                onOpen={setOpenId}
                onMoveDate={onMoveDate}
                onDragBar={onDragBar}
                limitDrag={limitDrag}
                expanded={expanded}
                onToggle={toggle}
                viewportRef={viewportRef}
                fields={fields}
                headerRows={fields}
                selectedId={openId}
                view={view}
                timeline={timeline}
              />
            </div>
            <ChangePreviewDialog plan={plan.data} {...changes.dialog} />
          </>
        )}
      </div>
      {plan.data && openId && (
        <ElementInspector
          elementId={openId}
          plan={plan.data}
          editable={isOwner}
          pending={changes.pending}
          onClose={() => setOpenId(null)}
          onUpdate={onUpdate}
          onMoveDate={onMoveDate}
          onSetRule={onSetRule}
          onRemoveRule={onRemoveRule}
          onOpen={setOpenId}
          planSpan={summary.span}
        />
      )}
    </div>
  )
}
