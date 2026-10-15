import { useState, type ReactNode } from "react"
import { IconAnchor, IconChevronDown, IconChevronUp, IconPin } from "@tabler/icons-react"
import {
  Button,
  cn,
  Input,
  SheetDescription,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/index"
import {
  SINGLE_DAY_ACTION_KINDS,
  type ActionKind,
  type CalendarPlan,
  type DatePoint,
  type EditElementInput,
  type SetElementRuleInput,
  type UpdateElementPlanInput,
} from "@repo/contracts"
import type { EpochDay } from "@repo/domain"
import { validPredecessors } from "@repo/domain"
import { buildElementTree, ELEMENT_KIND_LABELS, flattenTree, isAction } from "../lib/elementTree"
import { phaseTint } from "../lib/phaseColors"
import { countDependents, describeIssue, describeRule } from "../lib/planFormat"
import { occupancyFor } from "../lib/occupancy"
import { countChanges } from "../lib/planPreview"
import { ActionFields, DeleteAction } from "./ActionFields"
import { RuleSentence } from "./RuleSentence"
import { SidePanel } from "./SidePanel"
import { WhenField } from "./WhenField"
import type { WhenChange } from "./WhenPicker"

interface ElementInspectorProps {
  elementId: string | null
  plan: CalendarPlan
  editable: boolean
  pending: boolean
  onClose: () => void
  onUpdate: (elementId: string, input: UpdateElementPlanInput) => void
  /** Lo elegido en «Cuándo»: inicio, fin o duración. */
  onApplyWhen: (elementId: string, change: WhenChange) => void
  /** Los días que dibuja el Gantt: fuera no se pueden elegir. */
  bounds?: { start: EpochDay; end: EpochDay }
  /** Abrir el panel de un día, desde el calendario de «Cuándo». */
  onOpenDay?: (day: EpochDay, rowId: string | null) => void
  onSetRule: (elementId: string, point: DatePoint, input: SetElementRuleInput) => void
  onRemoveRule: (elementId: string, point: DatePoint) => void
  /** Saltar a otro elemento, desde «Si cambia, mueve». */
  onOpen: (elementId: string) => void
  /** Si el plan entero tiene fechas: el contexto de las fases. */
  planSpan: { start: string; end: string } | null
  /** Pasar al elemento de arriba o de abajo en el árbol; sin él, el botón se apaga. */
  onPrevious?: () => void
  onNext?: () => void
  /** Lo editado sin guardar: el pie lo cuenta y deja guardarlo o descartarlo. */
  draft?: { input: EditElementInput; onSave: () => void; onDiscard: () => void }
  /** Nombre, tipo o de qué cuelga: van al borrador. */
  onEdit: (elementId: string, input: EditElementInput) => void
  /** Solo acciones. */
  onDelete?: (elementId: string) => void
}

// El nombre, editable en la cabecera: se aplica al salir del campo o con Enter.
function NameInput({
  name,
  changed,
  onCommit,
}: Readonly<{ name: string; changed: boolean; onCommit: (name: string) => void }>) {
  const [value, setValue] = useState<string>(name)
  const commit = () => {
    const next = value.trim()
    if (next === "" || next === name) return setValue(name)
    onCommit(next)
  }
  return (
    <Input
      aria-label="Nombre"
      value={value}
      maxLength={200}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      className={cn(
        "hover:border-border focus-visible:border-ring -mx-1.5 h-8 border-transparent bg-transparent px-1.5 text-base font-semibold shadow-none dark:bg-transparent",
        changed && "text-primary"
      )}
    />
  )
}

// La marca cian de un campo cambiado y sin guardar, a la izquierda.
const changedMark = (changed: boolean) =>
  changed &&
  "relative before:bg-primary before:absolute before:inset-y-0 before:-left-3 before:w-0.5 before:rounded-full"

// Un botón de la cabecera con su Tooltip y su atajo.
function StepButton({
  label,
  shortcut,
  onClick,
  children,
}: Readonly<{ label: string; shortcut: string; onClick?: () => void; children: ReactNode }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={!onClick}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label} <kbd className="ml-1 opacity-70">{shortcut}</kbd>
      </TooltipContent>
    </Tooltip>
  )
}

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
  onApplyWhen,
  bounds,
  onOpenDay,
  onSetRule,
  onRemoveRule,
  onOpen,
  planSpan,
  onPrevious,
  onNext,
  draft,
  onEdit,
  onDelete,
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
  const ordered = flattenTree(buildElementTree(plan.elements))
  const tintOf = (id: string) => {
    const found = ordered.find((candidate) => candidate.element.id === id)
    return phaseTint(found?.phaseColor, found?.depth === 0)
  }
  const candidates = ordered
    .filter((node) => allowed.has(node.element.id))
    .map((node) => ({ element: node.element, depth: node.depth, tint: tintOf(node.element.id) }))
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
      tint: tintOf(node.element.id),
      rule: describeRule(node.element, plan.dependencies, nameOf),
    }))
  const parents: string[] = []
  for (let parentId = element.parentId; parentId;) {
    const parent = plan.elements.find((candidate) => candidate.id === parentId)
    if (!parent) break
    parents.unshift(parent.name)
    parentId = parent.parentId
  }
  const node = flattenTree(buildElementTree(plan.elements)).find(
    (candidate) => candidate.element.id === element.id
  )
  const tint = phaseTint(node?.phaseColor, node?.depth === 0)
  const parent = plan.elements.find((candidate) => candidate.id === element.parentId)
  const context =
    parent?.startsOn && parent.endsOn
      ? { name: parent.name, start: parent.startsOn, end: parent.endsOn }
      : planSpan
        ? { name: "Plan", ...planSpan }
        : null
  const reason = element.issue ? describeIssue(element.issue, nameOf) : undefined
  const isActionElement = isAction(element)
  let rootId: string | null = element.id
  for (let current = element; current.parentId;) {
    const up = plan.elements.find((candidate) => candidate.id === current.parentId)
    if (!up) break
    rootId = up.id
    current = up
  }
  const phaseNode = buildElementTree(plan.elements).find((root) => root.element.id === rootId)
  const occupancy = occupancyFor(plan, element.id)
  const edits = draft?.input ?? {}
  const count = countChanges(edits)
  const whenChanged =
    edits.duration !== undefined || edits.fixedStart !== undefined || edits.isPinned !== undefined

  const when = (
    <div className={cn(changedMark(whenChanged))}>
      <WhenField
        element={element}
        context={context}
        tint={tint}
        editable={editable}
        pending={pending}
        reason={reason}
        single={SINGLE_DAY_ACTION_KINDS.includes(element.kind as ActionKind)}
        bounds={bounds}
        occupancy={occupancy}
        onOpenAction={onOpen}
        onOpenDay={onOpenDay && ((day) => onOpenDay(day, occupancy.scopeId ?? null))}
        ruleFrom={
          startRule && !element.isAnchor && !element.isPinned
            ? nameOf(startRule.predecessorId)
            : undefined
        }
        onUpdate={(input) => onUpdate(element.id, input)}
        onApply={(change) => onApplyWhen(element.id, change)}
      />
    </div>
  )
  const rules = (
    <section
      aria-labelledby="inspector-rules"
      className={cn("flex flex-col gap-2", changedMark(edits.rules !== undefined))}
    >
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
            <IconPin size={16} className="text-muted-foreground mt-0.5 shrink-0" aria-hidden />
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
            Acaba <span className="text-muted-foreground">cuando se cumple su duración</span>
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
  )
  const dependentsList = dependents.length > 0 && (
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
                className={cn("size-1.5 shrink-0 rounded-full", dependent.tint.className)}
                style={dependent.tint.style}
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
  )

  return (
    <SidePanel
      onClose={close}
      footer={
        editable &&
        draft && (
          <>
            {isActionElement && onDelete && (
              <DeleteAction
                name={element.name}
                disabled={pending}
                onDelete={() => onDelete(element.id)}
              />
            )}
            <span className="text-muted-foreground mr-auto flex items-center gap-1.5 text-sm">
              {count > 0 ? (
                <>
                  <span aria-hidden className="bg-primary size-1.5 rounded-full" />
                  {count} {count === 1 ? "cambio sin guardar" : "cambios sin guardar"}
                </>
              ) : (
                "Sin cambios"
              )}
            </span>
            <Button variant="outline" size="sm" disabled={count === 0} onClick={draft.onDiscard}>
              Cancelar
            </Button>
            <Button size="sm" disabled={count === 0 || pending} onClick={draft.onSave}>
              Guardar
            </Button>
          </>
        )
      }
      actions={
        <>
          <StepButton label="Elemento anterior" shortcut="↑" onClick={onPrevious}>
            <IconChevronUp aria-hidden />
          </StepButton>
          <StepButton label="Elemento siguiente" shortcut="↓" onClick={onNext}>
            <IconChevronDown aria-hidden />
          </StepButton>
        </>
      }
      header={
        <>
          <SheetDescription className="flex items-center gap-1.5 text-sm">
            <span
              aria-hidden
              className={cn("size-2 shrink-0 rounded-full", tint.className)}
              style={tint.style}
            />
            <span className="truncate">
              {[...parents, ELEMENT_KIND_LABELS[element.kind]].join(" › ")}
            </span>
          </SheetDescription>
          {editable ? (
            <>
              <SheetTitle className="sr-only">{element.name}</SheetTitle>
              <NameInput
                key={`${element.id}-${element.name}`}
                name={element.name}
                changed={edits.name !== undefined}
                onCommit={(name) => onEdit(element.id, { name })}
              />
            </>
          ) : (
            <SheetTitle className="text-base">{element.name}</SheetTitle>
          )}
        </>
      }
    >
      {isActionElement ? (
        <ActionFields
          element={element}
          phase={phaseNode}
          editable={editable}
          changed={{ kind: edits.kind !== undefined, parent: edits.parentId !== undefined }}
          mark={changedMark}
          onEdit={(input) => onEdit(element.id, input)}
        >
          {when}
        </ActionFields>
      ) : (
        <>
          {when}
          {rules}
          {dependentsList}
        </>
      )}
    </SidePanel>
  )
}
