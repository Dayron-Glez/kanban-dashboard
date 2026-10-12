import { useState } from "react"
import { IconX } from "@tabler/icons-react"
import type {
  CalendarPlan,
  DatePoint,
  SetElementRuleInput,
  UpdateElementPlanInput,
} from "@repo/contracts"
import { validPredecessors } from "@repo/domain"
import { buildElementTree, ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { describeIssue, describeRule } from "../lib/planFormat"
import { RuleSentence } from "./RuleSentence"
import { WhenField } from "./WhenField"

interface ElementInspectorProps {
  elementId: string | null
  plan: CalendarPlan
  editable: boolean
  pending: boolean
  onClose: () => void
  onUpdate: (elementId: string, input: UpdateElementPlanInput) => void
  onMoveDate: (elementId: string, point: DatePoint, date: string) => void
  onSetRule: (elementId: string, point: DatePoint, input: SetElementRuleInput) => void
  onRemoveRule: (elementId: string, point: DatePoint) => void
  /** Saltar a otro elemento, desde «Si cambia, mueve». */
  onOpen: (elementId: string) => void
  /** Si el plan entero tiene fechas: el contexto de las fases. */
  planSpan: { start: string; end: string } | null
}

const flatten = (nodes: ElementNode[]): ElementNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)])

// Los hijos toman el color de su fase, más claro cuanto más hondo.
const shade = (color: string | null, depth: number) =>
  color
    ? `color-mix(in oklch, ${color} ${Math.max(100 - depth * 25, 30)}%, transparent)`
    : undefined

/**
 * El inspector de un elemento, acoplado a la derecha: no tapa el plan, que se
 * ve moverse mientras se edita. Arriba, cuándo; debajo, cómo se calcula.
 */
export function ElementInspector({
  elementId,
  plan,
  editable,
  pending,
  onClose,
  onUpdate,
  onMoveDate,
  onSetRule,
  onRemoveRule,
  onOpen,
  planSpan,
}: Readonly<ElementInspectorProps>) {
  const [addingEnd, setAddingEnd] = useState<boolean>(false)
  const element = plan.elements.find((candidate) => candidate.id === elementId)
  const nameOf = (id: string) =>
    plan.elements.find((candidate) => candidate.id === id)?.name ?? "otro elemento"

  const close = () => {
    setAddingEnd(false)
    onClose()
  }

  if (!element) return null

  const ruleOn = (point: DatePoint) =>
    plan.dependencies.find(
      (dependency) => dependency.successorId === element.id && dependency.successorPoint === point
    )
  const startRule = ruleOn("start")
  const endRule = ruleOn("end")
  const allowed = new Set(
    validPredecessors(
      plan.elements.map((candidate) => candidate.id),
      plan.dependencies,
      element.id
    )
  )
  const ordered = flatten(buildElementTree(plan.elements))
  const colorOf = (id: string) => {
    const found = ordered.find((candidate) => candidate.element.id === id)
    return found ? shade(found.phaseColor, found.depth) : undefined
  }
  const candidates = ordered
    .filter((node) => allowed.has(node.element.id))
    .map((node) => ({ element: node.element, depth: node.depth, color: colorOf(node.element.id) }))
  const dependents = ordered
    .filter((node) =>
      plan.dependencies.some(
        (dependency) =>
          dependency.predecessorId === element.id && dependency.successorId === node.element.id
      )
    )
    .map((node) => ({
      element: node.element,
      color: colorOf(node.element.id),
      rule: describeRule(node.element, plan.dependencies, nameOf),
    }))
  const parents: string[] = []
  for (let parentId = element.parentId; parentId;) {
    const parent = plan.elements.find((candidate) => candidate.id === parentId)
    if (!parent) break
    parents.unshift(parent.name)
    parentId = parent.parentId
  }
  const node = flatten(buildElementTree(plan.elements)).find(
    (candidate) => candidate.element.id === element.id
  )
  const color = node ? shade(node.phaseColor, node.depth) : undefined
  const parent = plan.elements.find((candidate) => candidate.id === element.parentId)
  const context =
    parent?.startsOn && parent.endsOn
      ? { name: parent.name, start: parent.startsOn, end: parent.endsOn }
      : planSpan
        ? { name: "Plan", ...planSpan }
        : null
  const reason = element.issue ? describeIssue(element.issue, nameOf) : undefined

  return (
    <aside
      aria-label={`Detalle de ${element.name}`}
      className="border-border bg-background flex w-[400px] shrink-0 flex-col border-l max-xl:fixed max-xl:inset-y-0 max-xl:right-0 max-xl:z-40 max-xl:shadow-2xl xl:sticky xl:top-0 xl:max-h-screen"
    >
      <div className="border-border border-b px-5 pt-4 pb-3">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="truncate">
            {[...parents, ELEMENT_KIND_LABELS[element.kind]].join(" › ")}
          </span>
          <button
            type="button"
            aria-label="Cerrar el detalle"
            onClick={close}
            className="hover:text-foreground ml-auto rounded p-1"
          >
            <IconX size={14} />
          </button>
        </div>
        <h2 className="mt-1.5 text-sm font-semibold">{element.name}</h2>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        <WhenField
          element={element}
          context={context}
          color={color}
          editable={editable}
          pending={pending}
          reason={reason}
          onUpdate={(input) => onUpdate(element.id, input)}
          onMoveDate={(point, date) => onMoveDate(element.id, point, date)}
        />

        <section aria-labelledby="inspector-rules" className="flex flex-col gap-2">
          <h3
            id="inspector-rules"
            className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase"
          >
            De qué depende
          </h3>
          {element.isAnchor ? (
            <p className="text-sm">
              Es la fecha clave: se escribe a mano y de ella sale el resto del plan.
            </p>
          ) : element.isPinned ? (
            <p className="text-sm">
              Tiene una fecha fija: se escribe a mano y no se mueve con el plan.
            </p>
          ) : (
            <RuleSentence
              key={`start-${element.id}-${startRule?.id ?? "none"}`}
              point="start"
              current={startRule}
              candidates={candidates}
              editable={editable}
              pending={pending}
              onChange={(input) => onSetRule(element.id, "start", input)}
              onRemove={() => onRemoveRule(element.id, "start")}
            />
          )}
          {endRule || addingEnd ? (
            <RuleSentence
              key={`end-${element.id}-${endRule?.id ?? "none"}`}
              point="end"
              current={endRule}
              candidates={candidates}
              editable={editable}
              pending={pending}
              onChange={(input) => onSetRule(element.id, "end", input)}
              onRemove={() => {
                setAddingEnd(false)
                if (endRule) onRemoveRule(element.id, "end")
              }}
            />
          ) : (
            <div className="border-border bg-card flex items-center justify-between gap-2 rounded-xl border p-3 text-sm">
              <span>
                Acaba <span className="text-muted-foreground">cuando se cumple su duración</span>
              </span>
              {editable && (
                <button
                  type="button"
                  onClick={() => setAddingEnd(true)}
                  className="text-primary text-xs hover:underline"
                >
                  Fijar el fin a otro elemento
                </button>
              )}
            </div>
          )}
        </section>

        {dependents.length > 0 && (
          <section aria-labelledby="inspector-dependents" className="flex flex-col gap-1.5">
            <h3
              id="inspector-dependents"
              className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase"
            >
              Si cambia, mueve
            </h3>
            <ul className="flex flex-col">
              {dependents.map((dependent) => (
                <li key={dependent.element.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(dependent.element.id)}
                    className="hover:bg-muted/60 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm"
                  >
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: dependent.color }}
                    />
                    <span className="truncate">{dependent.element.name}</span>
                    {dependent.rule && (
                      <span className="bg-muted text-muted-foreground ml-auto shrink-0 rounded-full px-2 text-[11px]">
                        {dependent.rule}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  )
}
