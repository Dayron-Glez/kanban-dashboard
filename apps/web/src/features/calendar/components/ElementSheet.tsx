import { useState } from "react"
import { IconChevronRight } from "@tabler/icons-react"
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
import { describeIssue, describeRule } from "../lib/planFormat"
import { DateEditor, DurationEditor } from "./PlanEditors"
import { RuleEditor } from "./RuleEditor"

interface ElementSheetProps {
  elementId: string | null
  plan: CalendarPlan
  editable: boolean
  pending: boolean
  onClose: () => void
  onUpdate: (elementId: string, input: UpdateElementPlanInput) => void
  onMoveDate: (elementId: string, point: DatePoint, date: string) => void
  onSetRule: (elementId: string, point: DatePoint, input: SetElementRuleInput) => void
  onRemoveRule: (elementId: string, point: DatePoint) => void
}

const flatten = (nodes: ElementNode[]): ElementNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)])

/**
 * El detalle de un elemento. Arriba, sus fechas, que se escriben directamente;
 * debajo, cómo se calculan, para quien quiera cambiar de qué depende.
 */
export function ElementSheet({
  elementId,
  plan,
  editable,
  pending,
  onClose,
  onUpdate,
  onMoveDate,
  onSetRule,
  onRemoveRule,
}: Readonly<ElementSheetProps>) {
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
  const reason = element.issue ? describeIssue(element.issue, nameOf) : undefined
  const rule =
    describeRule(element, plan.dependencies, nameOf) ??
    (startRule ? `Con el inicio de ${nameOf(startRule.predecessorId)}` : "No depende de nada")
  const fixedStart = element.isAnchor || element.isPinned

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
              <DateEditor
                label={`Inicio de ${element.name}`}
                value={element.startsOn}
                editable={editable}
                pending={pending}
                reason={reason}
                emptyLabel={fixedStart ? "Escribir fecha" : "—"}
                onSave={(date) => onMoveDate(element.id, "start", date)}
              />
            </dd>
            <dt className="text-muted-foreground">Fin</dt>
            <dd>
              <DateEditor
                label={`Fin de ${element.name}`}
                value={element.endsOn}
                editable={editable}
                pending={pending}
                reason={reason}
                emptyLabel="—"
                onSave={(date) => onMoveDate(element.id, "end", date)}
              />
            </dd>
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
          {reason && <p className="text-muted-foreground text-xs">{reason}.</p>}
          {editable && (
            <p className="text-muted-foreground text-xs">
              Escribe la fecha que quieras: el plan se ajusta para que salga, y antes de guardar ves
              qué más se mueve.
            </p>
          )}
        </section>

        <section aria-labelledby="sheet-rules" className="flex flex-col gap-3 px-4 pb-6">
          <h3 id="sheet-rules" className="text-sm font-semibold">
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
      </SheetContent>
    </Sheet>
  )
}
