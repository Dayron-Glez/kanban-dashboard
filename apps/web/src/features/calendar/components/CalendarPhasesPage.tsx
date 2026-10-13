import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router"
import { IconChevronsDown, IconChevronsUp, IconTemplate } from "@tabler/icons-react"
import type { DatePoint, SetElementRuleInput, UpdateElementPlanInput } from "@repo/contracts"
import { fromIsoDate, moveEnd, moveStart, toIsoDate } from "@repo/domain"
import { toast } from "sonner"
import { Button, QueryErrorState, Skeleton, useIsMobile } from "@/shared/index"
import { useProject } from "@/features/project"
import { useGenerateFromTemplate, usePlan } from "../api/elements"
import { usePlanChanges } from "../api/usePlanChanges"
import { buildElementTree, type ElementNode } from "../lib/elementTree"
import { formatPlanDate, setupSteps, summarizePlan } from "../lib/planFormat"
import { changeForEdit, describeShift, editContext } from "../lib/planPreview"
import {
  buildTimeline,
  dragTarget,
  PLAN_SCALES,
  PLAN_VIEWS,
  type BarDrag,
  type PlanScale,
  type PlanView,
} from "../lib/timeline"
import { ChangePreviewDialog } from "./ChangePreviewDialog"
import { ElementInspector } from "./ElementInspector"
import { ElementTree } from "./ElementTree"
import { PlanHeader } from "./PlanHeader"
import { SegmentedControl } from "./SegmentedControl"
import { PlanSetup } from "./PlanSetup"

const VIEW_OPTIONS = [
  { value: "tabla", label: "Tabla" },
  { value: "ambos", label: "Ambos" },
  { value: "cronograma", label: "Cronograma" },
] as const satisfies readonly { value: PlanView; label: string }[]

const SCALE_OPTIONS = [
  { value: "semanas", label: "Semanas" },
  { value: "meses", label: "Meses" },
] as const satisfies readonly { value: PlanScale; label: string }[]

const pick = <T extends string>(value: string | null, options: readonly T[], fallback: T) =>
  options.includes(value as T) ? (value as T) : fallback

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

export function CalendarPhasesPage() {
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
  // En la URL, para que un enlace abra lo mismo que se ve. En el móvil, solo la tabla.
  const view = isMobile ? "tabla" : pick(searchParams.get("vista"), PLAN_VIEWS, "ambos")
  const scale = pick(searchParams.get("escala"), PLAN_SCALES, "meses")
  const setParam = (key: string, value: string) =>
    setSearchParams(
      (params) => {
        params.set(key, value)
        return params
      },
      { replace: true }
    )
  const elements = plan.data?.elements
  const tree = useMemo(() => buildElementTree(elements ?? []), [elements])
  const steps = useMemo(() => setupSteps(elements ?? []), [elements])
  const summary = useMemo(() => summarizePlan(elements ?? []), [elements])
  const timeline = useMemo(() => buildTimeline(elements ?? [], scale), [elements, scale])

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

  // Una fecha escrita a mano se convierte en el cambio de regla o duración que la produce.
  const onMoveDate = (elementId: string, point: DatePoint, date: string, title?: string) => {
    if (!plan.data) return
    const name = plan.data.elements.find((element) => element.id === elementId)?.name
    const move = point === "start" ? moveStart : moveEnd
    const result = move(editContext(plan.data, elementId), fromIsoDate(date))
    if ("error" in result) {
      toast.error(EDIT_ERRORS[result.error])
      return
    }
    changes.request(
      changeForEdit(plan.data, elementId, result.edit),
      title ??
        `Mover el ${point === "start" ? "inicio" : "fin"} de ${name} al ${formatPlanDate(date)}`
    )
  }

  // Arrastrar una barra es escribir la fecha que cambia: pasa por la misma vista previa.
  const onDragBar = (elementId: string, drag: BarDrag, days: number) => {
    const element = plan.data?.elements.find((candidate) => candidate.id === elementId)
    if (!element || !plan.data) return
    const target = dragTarget(element, plan.data.dependencies, drag, days)
    if (!target) return
    const title =
      drag === "move"
        ? `Mover ${element.name} ${describeShift(days)} ${days > 0 ? "más tarde" : "antes"}`
        : undefined
    onMoveDate(elementId, target.point, toIsoDate(target.date), title)
  }

  return (
    <div className="flex w-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <PlanHeader
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
                {!isMobile && (
                  <>
                    <SegmentedControl
                      label="Vista"
                      value={view}
                      options={VIEW_OPTIONS}
                      onChange={(next) => setParam("vista", next)}
                    />
                    {view !== "tabla" && (
                      <SegmentedControl
                        label="Escala"
                        value={scale}
                        options={SCALE_OPTIONS}
                        onChange={(next) => setParam("escala", next)}
                      />
                    )}
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
            <ElementTree
              nodes={tree}
              dependencies={plan.data.dependencies}
              editable={isOwner}
              pending={changes.pending}
              onUpdate={onUpdate}
              onOpen={setOpenId}
              onMoveDate={onMoveDate}
              onDragBar={onDragBar}
              expanded={expanded}
              onToggle={toggle}
              selectedId={openId}
              view={view}
              timeline={timeline}
            />
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
