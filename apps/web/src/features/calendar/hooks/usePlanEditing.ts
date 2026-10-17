import { useMemo } from "react"
import type {
  ActionKind,
  CalendarElement,
  CalendarPlan,
  DatePoint,
  EditElementInput,
  UpdateElementPlanInput,
} from "@repo/contracts"
import { describePhaseViolation, fromIsoDate, toIsoDate, type EpochDay } from "@repo/domain"
import { toast } from "sonner"
import type { usePlanChanges } from "../api/usePlanChanges"
import { kindChange } from "../lib/actionStyle"
import { ELEMENT_KIND_LABELS } from "../lib/elementTree"
import { formatPlanDate } from "../lib/planFormat"
import {
  applyDraft,
  clampMove,
  countChanges,
  describeShift,
  mergeChange,
  planMove,
  previewChange,
  type PanelChange,
} from "../lib/planPreview"
import { dragTarget, type BarDrag } from "../lib/timeline"

type PlanChanges = ReturnType<typeof usePlanChanges>

const NO_ELEMENTS: readonly CalendarElement[] = []

/**
 * Todo lo que cambia el plan desde el calendario: escribir una fecha, arrastrar
 * una barra, cambiar el tipo de una acción y convertir lo que se toca en el panel
 * en su borrador. Lo que se guarda pasa por la vista previa de `changes`.
 */
export function usePlanEditing(plan: CalendarPlan | undefined, changes: PlanChanges) {
  const elements = plan?.elements ?? NO_ELEMENTS
  const byId = useMemo(() => new Map(elements.map((element) => [element.id, element])), [elements])
  const find = (id: string | null) => (id ? byId.get(id) : undefined)
  const nameOf = (id: string) => byId.get(id)?.name ?? id

  // Una fecha escrita a mano se convierte en el cambio de regla o duración que la
  // produce. Si rompería el orden de las fases, se para en el tope y se avisa.
  const moveTo = (
    elementId: string,
    point: DatePoint,
    requested: EpochDay,
    title: (date: EpochDay) => string
  ) => {
    if (!plan) return
    const move = planMove(plan, elementId, point, requested, nameOf)
    if ("error" in move) {
      toast.error(move.error, { id: "plan-change", description: move.description })
      return
    }
    changes.request(move.change, title(move.date), move.note)
  }

  const moveTitle = (point: DatePoint, name: string, final: EpochDay) =>
    `Mover el ${point === "start" ? "inicio" : "fin"} de ${name} al ${formatPlanDate(toIsoDate(final))}`

  // Lo que quedaría tras un cambio del panel: si cierra un ciclo o rompe el orden
  // de las fases, se avisa ya, para no dejar guardar algo que la API rechazaría.
  const checkDraft = (elementId: string, input: EditElementInput) => {
    if (!plan) return false
    const preview = previewChange(plan, { type: "edit", elementId, input })
    if ("cycle" in preview) {
      toast.error("Esa regla cerraría un ciclo", {
        description: preview.cycle.map(nameOf).join(" → "),
      })
      return false
    }
    const [broken] = preview.broken
    if (broken) {
      toast.error("No se puede hacer ese cambio", {
        id: "plan-change",
        description: describePhaseViolation(broken, nameOf),
      })
      return false
    }
    return true
  }

  // Lo elegido en «Cuándo», en orden: el inicio, y después la duración o el fin,
  // cada uno sobre el plan que deja el anterior.
  const resolveWhen = (
    base: CalendarPlan,
    change: Extract<PanelChange, { type: "when" }>,
    from: EditElementInput
  ): EditElementInput | null => {
    const { elementId, change: when } = change
    let input = from
    const move = (point: DatePoint, date: string) => {
      const current =
        countChanges(input) > 0
          ? (applyDraft(base, { type: "edit", elementId, input }) ?? base)
          : base
      // Ya ahí, por el paso anterior: un solo día, al mover el inicio, mueve el fin.
      const now = current.elements.find((element) => element.id === elementId)
      if ((point === "start" ? now?.startsOn : now?.endsOn) === date) return true
      const result = planMove(current, elementId, point, fromIsoDate(date), nameOf)
      if ("error" in result) {
        toast.error(result.error, { id: "plan-change", description: result.description })
        return false
      }
      if (result.note) toast.info(result.note, { id: "plan-change" })
      input = mergeChange(base, input, result.change)
      return true
    }
    if (when.start && !move("start", when.start)) return null
    if (when.duration) {
      input = mergeChange(base, input, {
        type: "update",
        elementId,
        input: { duration: when.duration },
      })
    } else if (when.end && !move("end", when.end)) return null
    return input
  }

  return {
    find,
    nameOf,

    /**
     * Cada cambio del panel, convertido en el borrador que deja sobre `from`, o
     * nada (con su aviso) si no se puede.
     */
    resolveChange: (change: PanelChange, from: EditElementInput): EditElementInput | null => {
      if (!plan) return null
      const input =
        change.type === "when" ? resolveWhen(plan, change, from) : mergeChange(plan, from, change)
      return input && checkDraft(change.elementId, input) ? input : null
    },

    onUpdate: (elementId: string, input: UpdateElementPlanInput) =>
      changes.request({ type: "update", elementId, input }),

    onMoveDate: (elementId: string, point: DatePoint, date: string) =>
      moveTo(elementId, point, fromIsoDate(date), (final) =>
        moveTitle(point, nameOf(elementId), final)
      ),

    // Arrastrar una barra es escribir la fecha que cambia: pasa por la misma vista previa.
    onDragBar: (elementId: string, drag: BarDrag, days: number) => {
      const element = byId.get(elementId)
      const target = element && plan && dragTarget(element, plan.dependencies, drag, days)
      if (!element || !target) return
      moveTo(elementId, target.point, target.date, (final) => {
        if (drag !== "move") return moveTitle(target.point, element.name, final)
        const shift = days + final - target.date
        return `Mover ${element.name} ${describeShift(shift)} ${shift > 0 ? "más tarde" : "antes"}`
      })
    },

    // Mientras se arrastra: hasta dónde se puede llegar sin romper el orden de las fases.
    limitDrag: (elementId: string, drag: BarDrag, days: number) => {
      const element = byId.get(elementId)
      const target = element && plan && dragTarget(element, plan.dependencies, drag, days)
      const clamped = target && plan && clampMove(plan, elementId, target.point, target.date)
      if (!target || !clamped || "error" in clamped || !clamped.limit) return { days, reason: null }
      return {
        days: days + clamped.date - target.date,
        reason: clamped.limit.kind === "order" ? "orden de las fases" : "25 % de solape",
      }
    },

    // Desde el menú de la acción en el Gantt: se guarda al momento, con su vista previa.
    changeKind: (elementId: string, kind: ActionKind) => {
      const action = byId.get(elementId)
      if (!action) return
      changes.request(
        { type: "edit", elementId, input: kindChange(action, kind) },
        `Cambiar ${action.name} a ${ELEMENT_KIND_LABELS[kind].toLowerCase()}`
      )
    },

    /** Lo guardado desde un panel, de una vez; `onSaved`, si sale bien. */
    save: (elementId: string, input: EditElementInput, onSaved: () => void) =>
      changes.request({ type: "edit", elementId, input }, undefined, undefined, onSaved),
  }
}

export type PlanEditing = ReturnType<typeof usePlanEditing>
