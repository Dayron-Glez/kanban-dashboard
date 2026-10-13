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
  moveEnd,
  moveStart,
  phaseRuleViolations,
  phaseSpansOf,
  ScheduleCycleError,
  toIsoDate,
  type EpochDay,
  type PhaseRuleViolation,
  type PlanEdit,
  type PlanEditContext,
  type PlanEditError,
  type ScheduleChange,
  type ScheduledDates,
  type ScheduleDependency,
  type ScheduleElement,
} from "@repo/domain"
import { buildElementTree, type ElementNode } from "./elementTree"
import { formatPlanDate } from "./planFormat"

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
      /** Cómo rompería el orden de las fases: la API lo rechazaría. */
      broken: PhaseRuleViolation[]
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
      broken: violationsIn(plan, after),
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

// Las fases con las fechas que da el motor, en su orden: lo mismo que mira la API.
const violationsIn = (plan: CalendarPlan, dates: Map<string, ScheduledDates>) =>
  phaseRuleViolations(
    phaseSpansOf(plan.elements).map((phase) => ({
      id: phase.id,
      start: dates.get(phase.id)?.start ?? null,
      end: dates.get(phase.id)?.end ?? null,
    }))
  )

export type ClampResult =
  | {
      date: EpochDay
      /** Si hubo que pararse antes de la fecha pedida, por qué. */
      limit: PhaseRuleViolation | null
    }
  | { error: PlanEditError }

/**
 * La fecha más cercana a la pedida que respeta el orden de las fases. Se busca
 * entre la fecha actual y la pedida, partiendo el tramo por la mitad, con el
 * mismo motor: vale aunque mover un elemento arrastre a otras fases.
 */
export function clampMove(
  plan: CalendarPlan,
  elementId: string,
  point: DatePoint,
  target: EpochDay
): ClampResult {
  const move = point === "start" ? moveStart : moveEnd
  const context = editContext(plan, elementId)
  const broken = (date: EpochDay): PhaseRuleViolation[] | PlanEditError => {
    const result = move(context, date)
    if ("error" in result) return result.error
    const next = applyChange(plan, changeForEdit(plan, elementId, result.edit))
    try {
      return violationsIn(plan, computeSchedule(next.elements, next.dependencies))
    } catch (error) {
      if (error instanceof ScheduleCycleError) return []
      throw error
    }
  }

  const atTarget = broken(target)
  if (typeof atTarget === "string") return { error: atTarget }
  if (atTarget.length === 0) return { date: target, limit: null }

  const current = context.dates.get(elementId)?.[point]
  // Sin fecha de partida, o con el plan ya roto antes del cambio, no hay a dónde
  // retroceder: se devuelve la pedida y la vista previa lo rechaza.
  const atCurrent = current == null ? null : broken(current)
  if (
    current == null ||
    atCurrent == null ||
    typeof atCurrent === "string" ||
    atCurrent.length > 0
  ) {
    return { date: target, limit: atTarget[0]! }
  }

  let valid = current
  let invalid = target
  let limit = atTarget[0]!
  while (Math.abs(invalid - valid) > 1) {
    const middle = Math.round((valid + invalid) / 2)
    const result = broken(middle)
    if (typeof result !== "string" && result.length === 0) valid = middle
    else {
      invalid = middle
      if (typeof result !== "string") limit = result[0]!
    }
  }
  return { date: valid, limit }
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

export interface MoveSummary {
  /** «+1 semana» si todo se mueve igual; si no, null. */
  headline: string | null
  /** Por fase: cuántos de sus elementos se mueven y cómo. */
  groups: { phaseId: string; name: string; color: string | null; count: number; label: string }[]
}

// Cuánto se desplaza entero, si se desplaza entero: lo que nunca tuvo fin cuenta por su inicio.
const wholeShift = ({ startShift, endShift, before, after }: ScheduleChange) =>
  startShift != null && (endShift === startShift || (before.end == null && after.end == null))
    ? startShift
    : null

// «−3 semanas» si todos se desplazan lo mismo; si no, cómo se mueven o null.
function commonLabel(changes: ScheduleChange[]): string | null {
  const shifts = new Set(changes.map(wholeShift))
  const [shift] = shifts
  if (shifts.size === 1 && shift != null) return shiftPart(shift)
  const moves = new Set(changes.map((change) => describeMove(change)))
  return moves.size === 1 ? describeMove(changes[0]!) : null
}

/** Lo que enseña la vista previa plegada: el resumen y un grupo por fase. */
export function summarizeMoves(changes: ScheduleChange[], plan: CalendarPlan): MoveSummary {
  const byId = new Map(plan.elements.map((element) => [element.id, element]))
  const phaseOf = (id: string) => {
    let current = byId.get(id)
    while (current?.parentId) current = byId.get(current.parentId)
    return current
  }
  const shifts = new Set(changes.map(wholeShift))
  const [shift] = shifts
  const headline = shifts.size === 1 && shift != null ? shiftPart(shift) : null

  const groups = new Map<
    string,
    { phase: CalendarPlan["elements"][number]; items: ScheduleChange[] }
  >()
  for (const change of changes) {
    const phase = phaseOf(change.id)
    if (!phase) continue
    const group = groups.get(phase.id) ?? { phase, items: [] }
    group.items.push(change)
    groups.set(phase.id, group)
  }
  return {
    headline,
    groups: [...groups.values()].map(({ phase, items }) => ({
      phaseId: phase.id,
      name: phase.name,
      color: phase.color,
      count: items.length,
      label: commonLabel(items) ?? "cambian de fechas",
    })),
  }
}

/** El título de la vista previa: qué cambio se va a aplicar. */
export function describeChange(plan: CalendarPlan, change: PlanChange): string {
  const name = plan.elements.find((element) => element.id === change.elementId)?.name ?? ""
  if (change.type === "update") {
    if (change.input.fixedStart)
      return `Mover ${name} al ${formatPlanDate(change.input.fixedStart)}`
    if (change.input.duration !== undefined) return `Cambiar la duración de ${name}`
    return `Cambiar ${name}`
  }
  return change.type === "set-rule"
    ? `Cambiar de qué depende ${name}`
    : `Quitar una regla de ${name}`
}
