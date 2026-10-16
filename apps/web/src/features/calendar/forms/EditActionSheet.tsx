import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ActionKind, CalendarElement, EditElementInput } from "@repo/contracts"
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import { Button, SheetDescription, SheetTitle } from "@/shared/index"
import { DeleteAction } from "../components/DeleteAction"
import { StepButton } from "../components/StepButton"
import type { WhenChange } from "../components/WhenPicker"
import { kindChange } from "../lib/actionStyle"
import { countChanges } from "../lib/planPreview"
import {
  ActionFormSchema,
  editInput,
  editValues,
  switchKind,
  type ActionFormData,
  type ActionFormValues,
  type PlanEdit,
} from "./actionForm"
import { ActionFormLayout, type ActionSheetBaseProps } from "./ActionFormLayout"

export interface EditActionSheetProps extends ActionSheetBaseProps {
  mode: "edit"
  /** La acción guardada: de ella parte el formulario. */
  saved: CalendarElement
  /** La misma acción con lo editado: sus fechas son las que se ven. */
  shown: CalendarElement
  editable: boolean
  /** «Rodaje › Shooting › Reunión», en la cabecera. */
  path: string
  /** Lo cambiado, para pintarlo en el Gantt y contarlo. */
  onDraftChange: (input: EditElementInput) => void
  /** Lo elegido en «Cuándo», convertido en el cambio de plan que lo produce. */
  onResolveWhen: (change: WhenChange, plan: PlanEdit) => PlanEdit | null
  onSave: (input: EditElementInput) => void
  onDiscard: () => void
  onDelete?: () => void
  onPrevious?: () => void
  onNext?: () => void
}

/**
 * El Sheet de una acción guardada. Nada se guarda al tocar: cada campo cambiado
 * lleva su marca, el pie cuenta los cambios y Guardar manda solo lo tocado.
 */
export function EditActionSheet({
  saved,
  shown,
  plan,
  tree,
  bounds,
  editable,
  pending,
  path,
  onDraftChange,
  onResolveWhen,
  onSave,
  onDiscard,
  onDelete,
  onPrevious,
  onNext,
  onClose,
}: Readonly<EditActionSheetProps>) {
  const form = useForm<ActionFormValues, unknown, ActionFormData>({
    resolver: zodResolver(ActionFormSchema),
    defaultValues: editValues(saved),
  })
  const { control, getValues, setValue, formState } = form
  const kind = useWatch({ control, name: "kind" })
  const values = useWatch({ control }) as ActionFormData
  const { dirtyFields } = formState
  const changes = editInput(values, dirtyFields)
  const count = countChanges(changes)

  const changesKey = JSON.stringify(changes)
  useEffect(() => onDraftChange(JSON.parse(changesKey)), [changesKey, onDraftChange])

  // Las fechas que se ven son las del plan con lo editado: el formulario las sigue
  // (sin contarlas como cambio) para comprobar las horas con los días que dura.
  useEffect(() => {
    if (!shown.startsOn) return
    const endsOn = shown.endsOn === shown.startsOn && kind !== "hiring" ? null : shown.endsOn
    if (getValues("startsOn") !== shown.startsOn) setValue("startsOn", shown.startsOn)
    if (getValues("endsOn") !== endsOn) setValue("endsOn", endsOn)
  }, [shown.startsOn, shown.endsOn, kind, getValues, setValue])

  const changeKind = (next: ActionKind) => {
    const current = getValues() as ActionFormData
    const { duration } = kindChange(shown, next)
    const update = {
      ...switchKind(current, next),
      ...(duration && { plan: { ...current.plan, duration } }),
    }
    for (const [name, value] of Object.entries(update)) {
      setValue(name as keyof ActionFormValues, value as never, { shouldDirty: true })
    }
  }

  const applyWhen = (change: WhenChange) => {
    const next = onResolveWhen(change, getValues("plan") ?? {})
    if (next) setValue("plan", next, { shouldDirty: true })
  }

  const isDirty = (...keys: (keyof ActionFormData)[]) =>
    keys.some((key) =>
      key === "plan" ? countChanges(values.plan ?? {}) > 0 : Boolean(dirtyFields[key])
    )

  return (
    <ActionFormLayout
      form={form}
      label={saved.name}
      heading={
        <>
          {/* Las flechas, en la línea de la ruta: así los tipos y el título van a todo lo ancho. */}
          <div className="mr-7 flex items-center gap-1">
            <SheetDescription className="mr-auto truncate text-sm">{path}</SheetDescription>
            <StepButton label="Elemento anterior" shortcut="↑" onClick={onPrevious}>
              <IconChevronUp aria-hidden />
            </StepButton>
            <StepButton label="Elemento siguiente" shortcut="↓" onClick={onNext}>
              <IconChevronDown aria-hidden />
            </StepButton>
          </div>
          <SheetTitle className="sr-only">{saved.name}</SheetTitle>
        </>
      }
      footer={
        editable && (
          <>
            {onDelete && <DeleteAction disabled={pending} onDelete={onDelete} />}
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
      editable={editable}
      preview={shown}
      plan={plan}
      tree={tree}
      bounds={bounds}
      onKindChange={changeKind}
      onApplyWhen={applyWhen}
      isDirty={isDirty}
      onSubmit={form.handleSubmit((data) => onSave(editInput(data, formState.dirtyFields)))}
      onClose={onClose}
    />
  )
}
