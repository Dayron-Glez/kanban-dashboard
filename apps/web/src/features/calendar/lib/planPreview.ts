import type {
  CalendarPlan,
  DatePoint,
  EditElementInput,
  ElementDependency,
  SetElementRuleInput,
  UpdateElementPlanInput,
} from "@repo/contracts"
import {
  computeSchedule,
  describePhaseViolation,
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
  /** Lo editado en el panel, de una vez. */
  | { type: "edit"; elementId: string; input: EditElementInput }

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
function applyChange(
  plan: CalendarPlan,
  change: PlanChange
): { elements: ScheduleElement[]; dependencies: ScheduleDependency[] } {
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
          toEngineRule(change.elementId, change.point, change.input),
        ],
      }
    case "remove-rule":
      return { elements, dependencies: withoutRule(dependencies, change.elementId, change.point) }
    case "edit": {
      const { rules, ...input } = change.input
      const updated = applyChange(plan, { type: "update", elementId: change.elementId, input })
      let next = updated.dependencies
      for (const point of POINTS) {
        const rule = rules?.[point]
        if (rule === undefined) continue
        next = withoutRule(next, change.elementId, point)
        if (rule) next.push(toEngineRule(change.elementId, point, rule))
      }
      return { elements: updated.elements, dependencies: next }
    }
  }
}

const POINTS = ["start", "end"] as const

const toEngineRule = (
  elementId: string,
  point: DatePoint,
  rule: SetElementRuleInput
): ScheduleDependency => ({
  predecessorId: rule.predecessorId,
  successorId: elementId,
  predecessorPoint: rule.predecessorPoint,
  successorPoint: point,
  lagAmount: rule.lag.amount,
  lagUnit: rule.lag.unit,
})

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
    if (change.type === "edit" && change.input.parentId) {
      parents.set(change.elementId, change.input.parentId)
    }
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
  if (change.type === "edit") {
    const { name, kind, parentId, rules, ...dates } = change.input
    const back = inverseOf(plan, { type: "update", elementId: change.elementId, input: dates })
    const input: EditElementInput = back.type === "update" ? { ...back.input } : {}
    if (name !== undefined) input.name = element.name
    if (kind !== undefined) input.kind = element.kind as EditElementInput["kind"]
    if (parentId !== undefined && element.parentId) input.parentId = element.parentId
    if (rules) {
      input.rules = {}
      for (const point of POINTS) {
        if (rules[point] === undefined) continue
        input.rules[point] = ruleOf(plan, change.elementId, point) ?? null
      }
    }
    return { type: "edit", elementId: change.elementId, input }
  }
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

// La regla que hay en un extremo, tal como se manda a la API.
function ruleOf(plan: CalendarPlan, elementId: string, point: DatePoint) {
  const rule = plan.dependencies.find(
    (dependency) => dependency.successorId === elementId && dependency.successorPoint === point
  )
  return rule
    ? { predecessorId: rule.predecessorId, predecessorPoint: rule.predecessorPoint, lag: rule.lag }
    : undefined
}

const sameRule = (a: SetElementRuleInput | null | undefined, b: SetElementRuleInput | undefined) =>
  (a ?? undefined) === b ||
  (a != null &&
    b != null &&
    a.predecessorId === b.predecessorId &&
    a.predecessorPoint === b.predecessorPoint &&
    a.lag.amount === b.lag.amount &&
    a.lag.unit === b.lag.unit)

/**
 * Suma un cambio al borrador del panel. Lo que vuelve a su valor de antes deja
 * de contar: si se deshace a mano, el panel queda sin cambios.
 */
export function mergeChange(
  plan: CalendarPlan,
  draft: EditElementInput,
  change: PlanChange
): EditElementInput {
  const next: EditElementInput = { ...draft, rules: { ...draft.rules } }
  if (change.type === "update" || change.type === "edit") {
    const { rules, ...rest } = change.input as EditElementInput
    Object.assign(next, rest)
    Object.assign(next.rules!, rules)
  } else {
    next.rules![change.point] = change.type === "set-rule" ? change.input : null
  }

  const element = plan.elements.find((candidate) => candidate.id === change.elementId)!
  if (next.name !== undefined && next.name === element.name) delete next.name
  if (next.kind !== undefined && next.kind === element.kind) delete next.kind
  if (next.parentId !== undefined && next.parentId === element.parentId) delete next.parentId
  if (
    next.duration !== undefined &&
    next.duration?.amount === element.duration?.amount &&
    next.duration?.unit === element.duration?.unit
  ) {
    delete next.duration
  }
  if (next.isPinned !== undefined && next.isPinned === element.isPinned) delete next.isPinned
  if (
    next.fixedStart !== undefined &&
    next.fixedStart === element.startsOn &&
    next.isPinned === undefined
  ) {
    delete next.fixedStart
  }
  for (const point of POINTS) {
    if (
      next.rules![point] !== undefined &&
      sameRule(next.rules![point], ruleOf(plan, change.elementId, point))
    ) {
      delete next.rules![point]
    }
  }
  if (Object.keys(next.rules!).length === 0) delete next.rules
  return next
}

/** Cuántos cambios lleva el borrador, como los cuenta el pie del panel. */
export const countChanges = (draft: EditElementInput) =>
  Object.keys(draft).filter((key) => key !== "rules" && key !== "isPinned").length +
  Object.keys(draft.rules ?? {}).length +
  (draft.isPinned !== undefined && draft.fixedStart === undefined ? 1 : 0)

/**
 * El plan como quedaría con el cambio, con el mismo motor que el servidor: lo
 * que enseña el panel mientras se edita. Solo cambian las fechas que se mueven.
 * Null si el cambio cierra un ciclo.
 */
export function applyDraft(plan: CalendarPlan, change: PlanChange): CalendarPlan | null {
  const current = toEngine(plan)
  const next = applyChange(plan, change)
  let changes: ScheduleChange[]
  try {
    changes = diffSchedules(
      plan.elements.map((element) => element.id),
      computeSchedule(current.elements, current.dependencies),
      computeSchedule(next.elements, next.dependencies),
      () => null
    )
  } catch (error) {
    if (error instanceof ScheduleCycleError) return null
    throw error
  }
  const moved = new Map(changes.map((item) => [item.id, item.after]))
  const engine = new Map(next.elements.map((element) => [element.id, element]))
  const own = change.type === "edit" ? change.input : {}

  const dependencies = next.dependencies.map((rule): ElementDependency => {
    const existing = plan.dependencies.find(
      (dependency) =>
        dependency.successorId === rule.successorId &&
        dependency.successorPoint === rule.successorPoint &&
        dependency.predecessorId === rule.predecessorId
    )
    return {
      id: existing?.id ?? `borrador-${rule.successorId}-${rule.successorPoint}`,
      predecessorId: rule.predecessorId,
      successorId: rule.successorId,
      predecessorPoint: rule.predecessorPoint,
      successorPoint: rule.successorPoint,
      lag: { amount: rule.lagAmount, unit: rule.lagUnit },
    }
  })

  return {
    dependencies,
    elements: plan.elements.map((element) => {
      const dates = moved.get(element.id)
      const scheduled = engine.get(element.id)!
      const edited = element.id === change.elementId
      return {
        ...element,
        ...(edited && own.name !== undefined && { name: own.name }),
        ...(edited && own.kind !== undefined && { kind: own.kind }),
        ...(edited && own.parentId !== undefined && { parentId: own.parentId }),
        duration:
          scheduled.durationAmount != null && scheduled.durationUnit
            ? { amount: scheduled.durationAmount, unit: scheduled.durationUnit }
            : null,
        isPinned: scheduled.isPinned,
        ...(dates && {
          startsOn: dates.start != null ? toIsoDate(dates.start) : null,
          endsOn: dates.end != null ? toIsoDate(dates.end) : null,
        }),
      }
    }),
  }
}

export type PlanMove =
  | {
      change: PlanChange
      /** La fecha a la que se llega: la pedida, o el tope si no cabe. */
      date: EpochDay
      /** Si hubo que quedarse en el tope, por qué. */
      note?: string
    }
  | { error: string; description?: string }

const MOVE_ERRORS = {
  "missing-reference": "No se puede calcular: depende de algo que todavía no tiene fecha",
  inverted: "El inicio no puede quedar después del fin",
} as const

/**
 * Escribir una fecha a mano o arrastrar una barra: el cambio que hay que mandar,
 * quedándose en el tope si la fecha pedida rompe el orden de las fases.
 */
export function planMove(
  plan: CalendarPlan,
  elementId: string,
  point: DatePoint,
  requested: EpochDay,
  nameOf: (id: string) => string
): PlanMove {
  const clamped = clampMove(plan, elementId, point, requested)
  if ("error" in clamped) return { error: MOVE_ERRORS[clamped.error] }
  const reason = clamped.limit ? describePhaseViolation(clamped.limit, nameOf) : null
  const context = editContext(plan, elementId)
  const result = (point === "start" ? moveStart : moveEnd)(context, clamped.date)
  if ("error" in result) return { error: MOVE_ERRORS[result.error] }
  if (clamped.date === context.dates.get(elementId)?.[point]) {
    return { error: "Ya está en el tope", description: reason ?? undefined }
  }
  return {
    change: changeForEdit(plan, elementId, result.edit),
    date: clamped.date,
    note:
      clamped.date !== requested && reason
        ? `Ajustado al ${formatPlanDate(toIsoDate(clamped.date))}: ${reason}.`
        : undefined,
  }
}

/** El título de la vista previa: qué cambio se va a aplicar. */
export function describeChange(plan: CalendarPlan, change: PlanChange): string {
  const name = plan.elements.find((element) => element.id === change.elementId)?.name ?? ""
  if (change.type === "edit") return `Guardar los cambios de ${name}`
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
