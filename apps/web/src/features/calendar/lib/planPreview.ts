import type {
  CalendarPlan,
  DatePoint,
  SetElementRuleInput,
  UpdateElementPlanInput,
} from "@repo/contracts"
import {
  computeSchedule,
  diffSchedules,
  fromIsoDate,
  ScheduleCycleError,
  toIsoDate,
  type PlanEdit,
  type PlanEditContext,
  type ScheduleChange,
  type ScheduleDependency,
  type ScheduleElement,
} from "@repo/domain"
import { buildElementTree, type ElementNode } from "./elementTree"

/** Un cambio del plan, tal como se manda a la API. */
export type PlanChange =
  | { type: "update"; elementId: string; input: UpdateElementPlanInput }
  | { type: "set-rule"; elementId: string; point: DatePoint; input: SetElementRuleInput }
  | { type: "remove-rule"; elementId: string; point: DatePoint }

export type PlanPreview =
  | {
      /** Lo que se mueve además del elemento que se edita: lo que enseña la alerta. */
      moved: ScheduleChange[]
      /** El propio elemento pasa a empezar fuera de su fase. */
      leavesParent: boolean
    }
  | { cycle: string[] }

const toEngine = (plan: CalendarPlan) => ({
  elements: plan.elements.map((element): ScheduleElement => ({
    id: element.id,
    durationAmount: element.duration?.amount ?? null,
    durationUnit: element.duration?.unit ?? null,
    isAnchor: element.isAnchor,
    isPinned: element.isPinned,
    fixedStart:
      (element.isAnchor || element.isPinned) && element.startsOn
        ? fromIsoDate(element.startsOn)
        : null,
  })),
  dependencies: plan.dependencies.map((dependency): ScheduleDependency => ({
    predecessorId: dependency.predecessorId,
    successorId: dependency.successorId,
    predecessorPoint: dependency.predecessorPoint,
    successorPoint: dependency.successorPoint,
    lagAmount: dependency.lag.amount,
    lagUnit: dependency.lag.unit,
  })),
})

const withoutRule = (dependencies: ScheduleDependency[], elementId: string, point: DatePoint) =>
  dependencies.filter(
    (dependency) => !(dependency.successorId === elementId && dependency.successorPoint === point)
  )

// El mismo cambio que hará la API, aplicado a la entrada del motor.
function applyChange(plan: CalendarPlan, change: PlanChange) {
  const { elements, dependencies } = toEngine(plan)
  switch (change.type) {
    case "update": {
      const { duration, fixedStart, isPinned } = change.input
      return {
        dependencies,
        elements: elements.map((element) =>
          element.id !== change.elementId
            ? element
            : {
                ...element,
                ...(duration !== undefined && {
                  durationAmount: duration?.amount ?? null,
                  durationUnit: duration?.unit ?? null,
                }),
                ...(isPinned !== undefined && { isPinned }),
                ...(fixedStart !== undefined && {
                  fixedStart: fixedStart ? fromIsoDate(fixedStart) : null,
                }),
              }
        ),
      }
    }
    case "set-rule":
      return {
        elements,
        dependencies: [
          ...withoutRule(dependencies, change.elementId, change.point),
          {
            predecessorId: change.input.predecessorId,
            successorId: change.elementId,
            predecessorPoint: change.input.predecessorPoint,
            successorPoint: change.point,
            lagAmount: change.input.lag.amount,
            lagUnit: change.input.lag.unit,
          },
        ],
      }
    case "remove-rule":
      return { elements, dependencies: withoutRule(dependencies, change.elementId, change.point) }
  }
}

const flatten = (nodes: ElementNode[]): string[] =>
  nodes.flatMap((node) => [node.element.id, ...flatten(node.children)])

/**
 * Qué movería un cambio antes de mandarlo, con el mismo motor que el servidor.
 * Un elemento que gana fechas que no tenía no cuenta como movido: escribir la
 * fecha del rodaje en un plan vacío no pregunta nada.
 */
export function previewChange(plan: CalendarPlan, change: PlanChange): PlanPreview {
  const current = toEngine(plan)
  const next = applyChange(plan, change)
  try {
    const before = computeSchedule(current.elements, current.dependencies)
    const after = computeSchedule(next.elements, next.dependencies)
    const parents = new Map(plan.elements.map((element) => [element.id, element.parentId]))
    const changes = diffSchedules(
      flatten(buildElementTree(plan.elements)),
      before,
      after,
      (id) => parents.get(id) ?? null
    )
    return {
      moved: changes.filter(
        (item) =>
          item.id !== change.elementId && (item.before.start != null || item.before.end != null)
      ),
      leavesParent: changes.some((item) => item.id === change.elementId && item.leavesParent),
    }
  } catch (error) {
    if (error instanceof ScheduleCycleError) return { cycle: error.path }
    throw error
  }
}

/** Lo que necesitan moveStart y moveEnd: el elemento, las reglas y las fechas actuales. */
export function editContext(plan: CalendarPlan, elementId: string): PlanEditContext {
  const { elements, dependencies } = toEngine(plan)
  const dates = new Map(
    plan.elements.map((element) => [
      element.id,
      {
        start: element.startsOn ? fromIsoDate(element.startsOn) : null,
        end: element.endsOn ? fromIsoDate(element.endsOn) : null,
        issue: element.issue,
      },
    ])
  )
  return {
    element: elements.find((element) => element.id === elementId)!,
    dependencies,
    dates,
  }
}

/** El cambio que hay que mandar para una fecha escrita a mano (ver moveStart y moveEnd). */
export function changeForEdit(plan: CalendarPlan, elementId: string, edit: PlanEdit): PlanChange {
  switch (edit.kind) {
    case "fixed-start":
      return { type: "update", elementId, input: { fixedStart: toIsoDate(edit.date) } }
    case "pin":
      return {
        type: "update",
        elementId,
        input: { isPinned: true, fixedStart: toIsoDate(edit.date) },
      }
    case "duration":
      return { type: "update", elementId, input: { duration: edit.duration } }
    case "lag": {
      const rule = plan.dependencies.find(
        (dependency) =>
          dependency.successorId === elementId && dependency.successorPoint === edit.point
      )!
      return {
        type: "set-rule",
        elementId,
        point: edit.point,
        input: {
          predecessorId: rule.predecessorId,
          predecessorPoint: rule.predecessorPoint,
          lag: edit.lag,
        },
      }
    }
  }
}

/** «1 semana», «3 días», «2 semanas y 3 días». */
export function describeShift(days: number): string {
  const total = Math.abs(days)
  const weeks = Math.floor(total / 7)
  const rest = total % 7
  const part = (amount: number, singular: string, plural: string) =>
    `${amount} ${amount === 1 ? singular : plural}`
  if (weeks === 0) return part(rest, "día", "días")
  if (rest === 0) return part(weeks, "semana", "semanas")
  return `${part(weeks, "semana", "semanas")} y ${part(rest, "día", "días")}`
}

const shiftPart = (shift: number) =>
  shift === 0 ? "igual" : `${shift > 0 ? "+" : "−"}${describeShift(shift)}`

const shiftVerb = (shift: number, plural: boolean) =>
  `se ${shift > 0 ? "retrasa" : "adelanta"}${plural ? "n" : ""} ${describeShift(shift)}`

/** «se retrasa 1 semana», «inicio igual, fin +3 días», «se queda sin fin». */
export function describeMove(change: ScheduleChange, plural = false): string {
  const { startShift, endShift, before, after } = change
  const lostStart = before.start != null && after.start == null
  const lostEnd = before.end != null && after.end == null
  const n = plural ? "n" : ""
  if (startShift != null && endShift != null) {
    return startShift === endShift
      ? shiftVerb(startShift, plural)
      : `inicio ${shiftPart(startShift)}, fin ${shiftPart(endShift)}`
  }
  if (lostStart && lostEnd) return `se queda${n} sin fechas`
  if (startShift != null) {
    if (!lostEnd) return shiftVerb(startShift, plural)
    return startShift === 0 ? `se queda${n} sin fin` : `${shiftVerb(startShift, plural)} y sin fin`
  }
  if (endShift != null) {
    if (!lostStart) return shiftVerb(endShift, plural)
    return endShift === 0
      ? `se queda${n} sin inicio`
      : `${shiftVerb(endShift, plural)} y sin inicio`
  }
  return `cambia${n} de fechas`
}

export interface MoveGroup {
  label: string
  changes: ScheduleChange[]
}

/** Los cambios agrupados por cómo se mueven: mover el rodaje retrasa casi todo lo mismo. */
export function groupMoves(changes: ScheduleChange[]): MoveGroup[] {
  const groups = new Map<string, ScheduleChange[]>()
  for (const change of changes) {
    const key = describeMove(change)
    groups.set(key, [...(groups.get(key) ?? []), change])
  }
  return [...groups.values()].map((items) => {
    const label = describeMove(items[0]!, items.length > 1)
    return { label: label.charAt(0).toUpperCase() + label.slice(1), changes: items }
  })
}

/**
 * El cambio que deshace otro, calculado con el plan de antes de aplicarlo: la
 * duración, la fecha o la regla que había.
 */
export function inverseOf(plan: CalendarPlan, change: PlanChange): PlanChange {
  const element = plan.elements.find((candidate) => candidate.id === change.elementId)!
  if (change.type === "update") {
    const { duration, fixedStart, isPinned } = change.input
    const input: UpdateElementPlanInput = {}
    if (duration !== undefined) input.duration = element.duration
    if (isPinned !== undefined && isPinned !== element.isPinned) input.isPinned = element.isPinned
    if (fixedStart !== undefined && (element.isAnchor || element.isPinned)) {
      input.fixedStart = element.startsOn
    }
    return { type: "update", elementId: change.elementId, input }
  }
  const previous = plan.dependencies.find(
    (dependency) =>
      dependency.successorId === change.elementId && dependency.successorPoint === change.point
  )
  if (!previous) return { type: "remove-rule", elementId: change.elementId, point: change.point }
  return {
    type: "set-rule",
    elementId: change.elementId,
    point: change.point,
    input: {
      predecessorId: previous.predecessorId,
      predecessorPoint: previous.predecessorPoint,
      lag: previous.lag,
    },
  }
}
