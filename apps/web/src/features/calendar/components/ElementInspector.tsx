import { useEffect, useEffectEvent, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { IconAnchor, IconChevronDown, IconChevronUp, IconPin } from "@tabler/icons-react"
import { Button, cn, FieldError, Input, SheetDescription, SheetTitle } from "@/shared/index"
import {
  EditElementInputSchema,
  SINGLE_DAY_ACTION_KINDS,
  type ActionKind,
  type CalendarElement,
  type CalendarPlan,
  type DatePoint,
  type EditElementInput,
  type SetElementRuleInput,
} from "@repo/contracts"
import type { EpochDay } from "@repo/domain"
import { validPredecessors } from "@repo/domain"
import { buildElementTree, flattenTree } from "../lib/elementTree"
import { phaseTint } from "../lib/phaseColors"
import { countDependents, describeIssue, describeRule } from "../lib/planFormat"
import { occupancyFor } from "../lib/occupancy"
import { countChanges, type PanelChange } from "../lib/planPreview"
import { changedMark } from "../lib/changedMark"
import { elementPath } from "../lib/elementPath"
import { RuleSentence } from "./RuleSentence"
import { StepButton } from "./StepButton"
import { SidePanel } from "./SidePanel"
import { WhenField } from "./WhenField"

/** El panel de una fase, subfase o proceso: su nombre y lo que cambia de su plan. */
const InspectorSchema = z.object({
  name: EditElementInputSchema.shape.name.unwrap(),
  plan: z.custom<EditElementInput>().default({}),
})
type InspectorValues = z.input<typeof InspectorSchema>
type InspectorData = z.output<typeof InspectorSchema>

interface ElementInspectorProps {
  elementId: string
  /** El plan con lo editado sin guardar: lo que se ve. */
  plan: CalendarPlan
  /** El nombre guardado: de él parte el formulario. */
  savedName: string
  /** Sube al guardar o descartar: el formulario vuelve a lo guardado. */
  resetKey: number
  editable: boolean
  pending: boolean
  onClose: () => void
  /** Los días que dibuja el Gantt: fuera no se pueden elegir. */
  bounds?: { start: EpochDay; end: EpochDay }
  /** Abrir el panel de un día, desde el calendario de «Cuándo». */
  onOpenDay?: (day: EpochDay, rowId: string | null) => void
  /** Saltar a otro elemento, desde «Si cambia, mueve». */
  onOpen: (elementId: string) => void
  /** Si el plan entero tiene fechas: el contexto de las fases. */
  planSpan: { start: string; end: string } | null
  /** Pasar al elemento de arriba o de abajo en el árbol; sin él, el botón se apaga. */
  onPrevious?: () => void
  onNext?: () => void
  /** Cada cambio, convertido en el borrador que deja (o nada, si no se puede). */
  onResolve: (change: PanelChange, from: EditElementInput) => EditElementInput | null
  /** Lo cambiado, para pintarlo en el Gantt y preguntar al salir. */
  onDraftChange: (input: EditElementInput) => void
  onSave: (input: EditElementInput) => void
  onDiscard: () => void
}

const HEADING = "text-muted-foreground text-sm font-semibold tracking-wider uppercase"

// Lo cambiado: el plan tal como se editó y el nombre si se tocó.
const changesOf = (values: InspectorValues, nameDirty: boolean): EditElementInput => ({
  ...values.plan,
  ...(nameDirty && { name: values.name.trim() }),
})

/**
 * El inspector de una fase, subfase o proceso, en un Sheet a la derecha. No es
 * modal: el plan se sigue viendo y tocando, y ↑ ↓ pasan de un elemento a otro.
 * Arriba, cuándo; debajo, cómo se calcula. Nada se guarda al tocar.
 */
export function ElementInspector({
  elementId,
  plan,
  savedName,
  resetKey,
  editable,
  pending,
  onClose,
  bounds,
  onOpenDay,
  onOpen,
  planSpan,
  onPrevious,
  onNext,
  onResolve,
  onDraftChange,
  onSave,
  onDiscard,
}: Readonly<ElementInspectorProps>) {
  const form = useForm<InspectorValues, unknown, InspectorData>({
    resolver: zodResolver(InspectorSchema),
    defaultValues: { name: savedName, plan: {} },
  })
  const { control, getValues, setValue, formState } = form
  const values = useWatch({ control }) as InspectorValues
  const edits = changesOf(values, Boolean(formState.dirtyFields.name))
  const count = countChanges(edits)
  const editsKey = JSON.stringify(edits)
  useEffect(() => onDraftChange(JSON.parse(editsKey)), [editsKey, onDraftChange])
  const restart = useEffectEvent(() => form.reset({ name: savedName, plan: {} }))
  useEffect(() => restart(), [resetKey])

  const element = plan.elements.find((candidate) => candidate.id === elementId)
  if (!element) return null

  const apply = (change: PanelChange) => {
    const next = onResolve(change, getValues("plan") ?? {})
    if (next) setValue("plan", next, { shouldDirty: true })
  }
  const nameOf = (id: string) =>
    plan.elements.find((candidate) => candidate.id === id)?.name ?? "otro elemento"
  const ordered = flattenTree(buildElementTree(plan.elements))
  const node = ordered.find((candidate) => candidate.element.id === element.id)
  const tint = phaseTint(node?.phaseColor, node?.depth === 0)
  const parent = plan.elements.find((candidate) => candidate.id === element.parentId)
  const context =
    parent?.startsOn && parent.endsOn
      ? { name: parent.name, start: parent.startsOn, end: parent.endsOn }
      : planSpan && { name: "Plan", ...planSpan }
  const startRule = plan.dependencies.find(
    (dependency) => dependency.successorId === element.id && dependency.successorPoint === "start"
  )
  const occupancy = occupancyFor(plan, element.id)
  const whenChanged =
    edits.duration !== undefined || edits.fixedStart !== undefined || edits.isPinned !== undefined

  return (
    <SidePanel
      onClose={onClose}
      form={{
        "aria-label": savedName,
        noValidate: true,
        onSubmit: form.handleSubmit((data) =>
          onSave(changesOf(data, Boolean(formState.dirtyFields.name)))
        ),
      }}
      footer={
        editable && (
          <>
            <span className="text-muted-foreground mr-auto flex items-center gap-1.5 text-sm">
              {count > 0 && <span aria-hidden className="bg-primary size-1.5 rounded-full" />}
              {count === 0 && "Sin cambios"}
              {count === 1 && "1 cambio sin guardar"}
              {count > 1 && `${count} cambios sin guardar`}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={count === 0}
              onClick={onDiscard}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={count === 0 || pending}>
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
            <span className="truncate">{elementPath(plan.elements, element).join(" › ")}</span>
          </SheetDescription>
          <SheetTitle className={cn(editable ? "sr-only" : "text-base")}>{savedName}</SheetTitle>
          {editable && (
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    aria-label="Nombre"
                    maxLength={120}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    className={cn(
                      "hover:border-border focus-visible:border-ring -mx-1.5 h-8 border-transparent bg-transparent px-1.5 text-base font-semibold shadow-none dark:bg-transparent",
                      fieldState.isDirty && "text-primary"
                    )}
                  />
                  <FieldError errors={[fieldState.error]} />
                </>
              )}
            />
          )}
        </>
      }
    >
      <div className={cn(changedMark(whenChanged))}>
        <WhenField
          element={element}
          context={context}
          tint={tint}
          editable={editable}
          pending={pending}
          reason={element.issue ? describeIssue(element.issue, nameOf) : undefined}
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
          onUpdate={(input) => apply({ type: "update", elementId: element.id, input })}
          onApply={(change) => apply({ type: "when", elementId: element.id, change })}
        />
      </div>
      <RulesSection
        element={element}
        plan={plan}
        editable={editable}
        pending={pending}
        changed={edits.rules !== undefined}
        onChange={apply}
      />
      <DependentsSection element={element} plan={plan} onOpen={onOpen} />
    </SidePanel>
  )
}

const candidatesFor = (plan: CalendarPlan, element: CalendarElement) => {
  const allowed = new Set(
    validPredecessors(
      plan.elements.map((candidate) => candidate.id),
      plan.dependencies,
      element.id
    )
  )
  return flattenTree(buildElementTree(plan.elements))
    .filter((node) => allowed.has(node.element.id))
    .map((node) => ({
      element: node.element,
      depth: node.depth,
      tint: phaseTint(node.phaseColor, node.depth === 0),
    }))
}

interface RulesSectionProps {
  element: CalendarElement
  plan: CalendarPlan
  editable: boolean
  pending: boolean
  changed: boolean
  onChange: (change: PanelChange) => void
}

/** «De qué depende»: la regla del inicio (o la fecha a mano) y, si la tiene, la del fin. */
function RulesSection({
  element,
  plan,
  editable,
  pending,
  changed,
  onChange,
}: Readonly<RulesSectionProps>) {
  const [addingEnd, setAddingEnd] = useState<boolean>(false)
  const ruleOn = (point: DatePoint) =>
    plan.dependencies.find(
      (dependency) => dependency.successorId === element.id && dependency.successorPoint === point
    )
  const startRule = ruleOn("start")
  const endRule = ruleOn("end")
  const candidates = candidatesFor(plan, element)
  const movesCount = countDependents(plan.dependencies, element.id)
  const setRule = (point: DatePoint) => (input: SetElementRuleInput) =>
    onChange({ type: "set-rule", elementId: element.id, point, input })
  const removeRule = (point: DatePoint) =>
    onChange({ type: "remove-rule", elementId: element.id, point })

  return (
    <section
      aria-labelledby="inspector-rules"
      className={cn("flex flex-col gap-2", changedMark(changed))}
    >
      <h3 id="inspector-rules" className={HEADING}>
        De qué depende
      </h3>
      {element.isAnchor || element.isPinned ? (
        <FixedDate element={element} movesCount={movesCount} />
      ) : (
        <RuleSentence
          key={`start-${element.id}-${startRule?.id ?? "none"}`}
          point="start"
          current={startRule}
          candidates={candidates}
          editable={editable}
          pending={pending}
          onChange={setRule("start")}
          onRemove={() => removeRule("start")}
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
          onChange={setRule("end")}
          onRemove={() => {
            setAddingEnd(false)
            if (endRule) removeRule("end")
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
}

/** El ancla o un elemento fijado: su fecha se escribe a mano. */
function FixedDate({
  element,
  movesCount,
}: Readonly<{ element: CalendarElement; movesCount: number }>) {
  return (
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
  )
}

/** «Si cambia, mueve»: lo que depende de este elemento, para saltar a ello. */
function DependentsSection({
  element,
  plan,
  onOpen,
}: Readonly<{ element: CalendarElement; plan: CalendarPlan; onOpen: (id: string) => void }>) {
  const nameOf = (id: string) =>
    plan.elements.find((candidate) => candidate.id === id)?.name ?? "otro elemento"
  const dependents = flattenTree(buildElementTree(plan.elements)).filter((node) =>
    plan.dependencies.some(
      (dependency) =>
        dependency.predecessorId === element.id && dependency.successorId === node.element.id
    )
  )
  if (dependents.length === 0) return null
  return (
    <section aria-labelledby="inspector-dependents" className="flex flex-col gap-1.5">
      <h3 id="inspector-dependents" className={HEADING}>
        Si cambia, mueve
      </h3>
      <ul className="flex flex-col">
        {dependents.map((dependent) => {
          const tint = phaseTint(dependent.phaseColor, dependent.depth === 0)
          const rule = describeRule(dependent.element, plan.dependencies, nameOf)
          return (
            <li key={dependent.element.id}>
              <button
                type="button"
                onClick={() => onOpen(dependent.element.id)}
                className="hover:bg-muted/60 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-base"
              >
                <span
                  aria-hidden
                  className={cn("size-1.5 shrink-0 rounded-full", tint.className)}
                  style={tint.style}
                />
                <span className="truncate">{dependent.element.name}</span>
                {rule && (
                  <span className="bg-muted text-muted-foreground ml-auto shrink-0 rounded-full px-2 text-sm">
                    {rule}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
