import { useState } from "react"
import { IconChevronRight, IconX } from "@tabler/icons-react"
import type {
  CalendarPlan,
  DatePoint,
  SetElementRuleInput,
  UpdateElementPlanInput,
} from "@repo/contracts"
import { validPredecessors } from "@repo/domain"
import { Button } from "@/shared/index"
import { buildElementTree, ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { describeIssue, describeRule } from "../lib/planFormat"
import { RuleEditor } from "./RuleEditor"
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
  planSpan,
}: Readonly<ElementInspectorProps>) {
  const [showRules, setShowRules] = useState<boolean>(false)
  const [addingEnd, setAddingEnd] = useState<boolean>(false)
  const element = plan.elements.find((candidate) => candidate.id === elementId)
  const nameOf = (id: string) =>
    plan.elements.find((candidate) => candidate.id === id)?.name ?? "otro elemento"

  const close = () => {
    setShowRules(false)
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
  const candidates = flatten(buildElementTree(plan.elements))
    .filter((node) => allowed.has(node.element.id))
    .map((node) => ({ element: node.element, depth: node.depth }))
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
  const rule =
    describeRule(element, plan.dependencies, nameOf) ??
    (startRule ? `Con el inicio de ${nameOf(startRule.predecessorId)}` : "No depende de nada")
  const fixedStart = element.isAnchor || element.isPinned

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
            Cómo se calcula
          </h3>
          <p className="text-sm">
            {element.isAnchor
              ? "Es la fecha clave: se escribe a mano y de ella sale el resto del plan."
              : element.isPinned
                ? "Tiene una fecha fija: se escribe a mano y no se mueve con el plan."
                : rule}
          </p>

          {editable && !fixedStart && (
            <>
              <button
                type="button"
                aria-expanded={showRules}
                onClick={() => setShowRules((open) => !open)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-xs"
              >
                <IconChevronRight
                  size={14}
                  className={`transition-transform ${showRules ? "rotate-90" : ""}`}
                />
                Cambiar de qué depende
              </button>

              {showRules && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-medium">Cuándo empieza</h4>
                    <RuleEditor
                      key={`start-${element.id}-${startRule?.id ?? "none"}`}
                      point="start"
                      current={startRule}
                      candidates={candidates}
                      fallbackPredecessorId={element.parentId}
                      pending={pending}
                      onSave={(input) => onSetRule(element.id, "start", input)}
                      onRemove={() => onRemoveRule(element.id, "start")}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-medium">Cuándo acaba</h4>
                    {endRule || addingEnd ? (
                      <RuleEditor
                        key={`end-${element.id}-${endRule?.id ?? "none"}`}
                        point="end"
                        current={endRule}
                        candidates={candidates}
                        fallbackPredecessorId={element.parentId}
                        pending={pending}
                        onSave={(input) => onSetRule(element.id, "end", input)}
                        onRemove={() => {
                          setAddingEnd(false)
                          onRemoveRule(element.id, "end")
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-muted-foreground text-sm">
                          Acaba cuando marca su duración.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setAddingEnd(true)}>
                          Añadir regla de fin
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </aside>
  )
}
