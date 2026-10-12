import { useState } from "react"
import type {
  CalendarPlan,
  DatePoint,
  SetElementRuleInput,
  UpdateElementPlanInput,
} from "@repo/contracts"
import { validPredecessors } from "@repo/domain"
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/index"
import { buildElementTree, ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { describeIssue, describeRule, formatPlanDate } from "../lib/planFormat"
import { DateEditor, DurationEditor } from "./PlanEditors"
import { RuleEditor } from "./RuleEditor"

interface ElementSheetProps {
  elementId: string | null
  plan: CalendarPlan
  editable: boolean
  pending: boolean
  onClose: () => void
  onUpdate: (elementId: string, input: UpdateElementPlanInput) => void
  onSetRule: (elementId: string, point: DatePoint, input: SetElementRuleInput) => void
  onRemoveRule: (elementId: string, point: DatePoint) => void
}

const flatten = (nodes: ElementNode[]): ElementNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)])

/** El detalle de un elemento: sus fechas y las reglas que las producen. */
export function ElementSheet({
  elementId,
  plan,
  editable,
  pending,
  onClose,
  onUpdate,
  onSetRule,
  onRemoveRule,
}: Readonly<ElementSheetProps>) {
  const [addingEnd, setAddingEnd] = useState<boolean>(false)
  const element = plan.elements.find((candidate) => candidate.id === elementId)
  const ordered = flatten(buildElementTree(plan.elements))
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
  const candidates = ordered
    .filter((node) => allowed.has(node.element.id))
    .map((node) => ({ element: node.element, depth: node.depth }))
  const parents = []
  for (let parentId = element.parentId; parentId;) {
    const parent = plan.elements.find((candidate) => candidate.id === parentId)
    if (!parent) break
    parents.unshift(parent.name)
    parentId = parent.parentId
  }
  const writesStart = element.isAnchor || element.isPinned
  const rule = describeRule(element, plan.dependencies, nameOf)

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent className="bg-card flex w-full flex-col gap-6 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{element.name}</SheetTitle>
          <SheetDescription>
            {[ELEMENT_KIND_LABELS[element.kind], ...parents].join(" · ")}
          </SheetDescription>
        </SheetHeader>

        <section aria-labelledby="sheet-dates" className="flex flex-col gap-2 px-4">
          <h3 id="sheet-dates" className="text-sm font-semibold">
            Fechas
          </h3>
          <dl className="grid grid-cols-[6rem_1fr] items-center gap-y-1 text-sm">
            <dt className="text-muted-foreground">Inicio</dt>
            <dd>
              {writesStart ? (
                <DateEditor
                  label={`Inicio de ${element.name}`}
                  value={element.startsOn}
                  editable={editable}
                  pending={pending}
                  onSave={(fixedStart) => onUpdate(element.id, { fixedStart })}
                />
              ) : (
                <span className="px-1.5">
                  {element.startsOn ? formatPlanDate(element.startsOn) : "—"}
                </span>
              )}
            </dd>
            <dt className="text-muted-foreground">Fin</dt>
            <dd className="px-1.5">{element.endsOn ? formatPlanDate(element.endsOn) : "—"}</dd>
            <dt className="text-muted-foreground">Duración</dt>
            <dd>
              <DurationEditor
                label={`Duración de ${element.name}`}
                value={element.duration}
                editable={editable}
                pending={pending}
                onSave={(duration) => onUpdate(element.id, { duration })}
              />
            </dd>
          </dl>
          {element.issue && (
            <p className="text-muted-foreground text-xs">{describeIssue(element.issue, nameOf)}</p>
          )}
        </section>

        <section aria-labelledby="sheet-start" className="flex flex-col gap-2 px-4">
          <h3 id="sheet-start" className="text-sm font-semibold">
            Cuándo empieza
          </h3>
          {element.isAnchor ? (
            <p className="text-muted-foreground text-sm">
              Es la fecha clave: se escribe a mano y de ella sale el resto del plan.
            </p>
          ) : element.isPinned ? (
            <p className="text-muted-foreground text-sm">
              Tiene una fecha fija: se escribe a mano y no se mueve con el plan.
            </p>
          ) : editable ? (
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
          ) : (
            <p className="text-sm">{rule ?? "Con el inicio del elemento del que cuelga"}</p>
          )}
        </section>

        <section aria-labelledby="sheet-end" className="flex flex-col gap-2 px-4 pb-6">
          <h3 id="sheet-end" className="text-sm font-semibold">
            Cuándo acaba
          </h3>
          {endRule || addingEnd ? (
            editable ? (
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
              <p className="text-sm">{rule}</p>
            )
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm">Acaba cuando marca su duración.</p>
              {editable && (
                <Button variant="outline" size="sm" onClick={() => setAddingEnd(true)}>
                  Añadir regla de fin
                </Button>
              )}
            </div>
          )}
        </section>
      </SheetContent>
    </Sheet>
  )
}
