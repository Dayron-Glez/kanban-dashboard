import { useState } from "react"
import { IconAnchor, IconPin } from "@tabler/icons-react"
import {
  cn,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/index"
import type {
  CalendarPlan,
  DatePoint,
  SetElementRuleInput,
  UpdateElementPlanInput,
} from "@repo/contracts"
import { validPredecessors } from "@repo/domain"
import { buildElementTree, ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { countDependents, describeIssue, describeRule } from "../lib/planFormat"
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
 * El inspector de un elemento, en un Sheet a la derecha. No es modal: el plan
 * se sigue viendo y tocando, y ↑ ↓ pasan de un elemento a otro. Arriba, cuándo;
 * debajo, cómo se calcula.
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
  const movesCount = countDependents(plan.dependencies, element.id)
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
    <Sheet open modal={false} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="w-[400px] gap-0 sm:max-w-[400px]"
        // El foco se queda en el plan, para seguir con ↑ ↓; y tocar el plan no lo cierra.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <SheetHeader className="border-border gap-1 border-b px-5 pt-4 pb-3">
          <SheetDescription className="flex items-center gap-1.5 pr-6 text-sm">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="truncate">
              {[...parents, ELEMENT_KIND_LABELS[element.kind]].join(" › ")}
            </span>
          </SheetDescription>
          <SheetTitle className="text-base">{element.name}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-6 px-5 py-5">
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
                className="text-muted-foreground text-sm font-semibold tracking-wider uppercase"
              >
                De qué depende
              </h3>
              {element.isAnchor || element.isPinned ? (
                <div
                  className={cn(
                    "flex gap-3 rounded-xl border p-3",
                    element.isAnchor ? "border-primary/25 bg-primary/5" : "border-border bg-card"
                  )}
                >
                  {element.isAnchor ? (
                    <IconAnchor size={16} className="text-primary mt-0.5 shrink-0" aria-hidden />
                  ) : (
                    <IconPin
                      size={16}
                      className="text-muted-foreground mt-0.5 shrink-0"
                      aria-hidden
                    />
                  )}
                  <div className="flex flex-col gap-0.5">
                    <p className="text-base font-semibold">
                      {element.isAnchor ? "La fecha clave del plan" : "Una fecha fija"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {element.isAnchor
                        ? "Todo se calcula desde aquí: si la mueves, el plan entero se mueve con ella."
                        : "Se escribe a mano y no se mueve con el plan."}
                      {movesCount > 0 &&
                        ` Mueve ${movesCount === 1 ? "1 elemento" : `${movesCount} elementos`}.`}
                    </p>
                  </div>
                </div>
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
                <div className="border-border bg-card flex items-center justify-between gap-2 rounded-xl border p-3 text-base">
                  <span>
                    Acaba{" "}
                    <span className="text-muted-foreground">cuando se cumple su duración</span>
                  </span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setAddingEnd(true)}
                      className="text-primary text-sm hover:underline"
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
                  className="text-muted-foreground text-sm font-semibold tracking-wider uppercase"
                >
                  Si cambia, mueve
                </h3>
                <ul className="flex flex-col">
                  {dependents.map((dependent) => (
                    <li key={dependent.element.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(dependent.element.id)}
                        className="hover:bg-muted/60 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-base"
                      >
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: dependent.color }}
                        />
                        <span className="truncate">{dependent.element.name}</span>
                        {dependent.rule && (
                          <span className="bg-muted text-muted-foreground ml-auto shrink-0 rounded-full px-2 text-sm">
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
