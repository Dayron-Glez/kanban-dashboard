import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ActionKind } from "@repo/contracts"
import { IconPlus } from "@tabler/icons-react"
import { Badge, Button, SheetDescription, SheetTitle } from "@/shared/index"
import { ActionGlyph } from "../components/ActionGlyph"
import { NEW_ACTION_TITLE } from "../lib/actionStyle"
import { ELEMENT_KIND_LABELS } from "../lib/elementTree"
import {
  ActionFormSchema,
  newActionValues,
  previewElement,
  switchKind,
  type ActionFormData,
  type ActionFormValues,
  type NewActionRequest,
} from "./actionForm"
import { ActionFormLayout, type ActionSheetBaseProps } from "./ActionFormLayout"

export interface CreateActionSheetProps extends ActionSheetBaseProps {
  mode: "create"
  request: NewActionRequest
  /** Cada cambio, para pintar la acción en el Gantt mientras se rellena. */
  onPreview: (values: ActionFormData) => void
  /** Si hay algo escrito: cerrar pregunta antes. */
  onDirtyChange: (dirty: boolean) => void
  onCreate: (values: ActionFormData) => void
}

const SINGLE_DAY_KINDS: readonly ActionKind[] = ["meeting", "reminder"]
const notDirty = () => false

/** El Sheet de una acción nueva: nace con lo de la celda y los valores de su tipo. */
export function CreateActionSheet({
  request,
  projectId,
  plan,
  tree,
  bounds,
  pending,
  onPreview,
  onDirtyChange,
  onClose,
  onCreate,
}: Readonly<CreateActionSheetProps>) {
  const form = useForm<ActionFormValues, unknown, ActionFormData>({
    resolver: zodResolver(ActionFormSchema),
    defaultValues: newActionValues(request),
  })
  const { control, getValues, setValue, formState } = form
  const kind = useWatch({ control, name: "kind" })
  const values = useWatch({ control }) as ActionFormData
  const severalDays = values.endsOn != null && values.endsOn !== values.startsOn

  useEffect(() => onPreview(values), [values, onPreview])
  useEffect(() => onDirtyChange(formState.isDirty), [formState.isDirty, onDirtyChange])
  // Al título, después de que el menú de la celda devuelva el foco a su fila al cerrarse.
  useEffect(() => {
    const timer = setTimeout(() => form.setFocus("name"))
    return () => clearTimeout(timer)
  }, [form])

  const changeKind = (next: ActionKind) => {
    for (const [name, value] of Object.entries(switchKind(getValues() as ActionFormData, next))) {
      setValue(name as keyof ActionFormValues, value as never, { shouldDirty: true })
    }
  }

  return (
    <ActionFormLayout
      form={form}
      label={NEW_ACTION_TITLE[kind]}
      heading={
        <>
          <div className="flex items-center gap-2">
            <ActionGlyph kind={kind} className="size-4.5" />
            <SheetTitle className="text-base">{NEW_ACTION_TITLE[kind]}</SheetTitle>
            <Badge variant="secondary" className="text-primary">
              Sin guardar
            </Badge>
          </div>
          <SheetDescription className="sr-only">
            {NEW_ACTION_TITLE[kind]}, sin guardar todavía
          </SheetDescription>
        </>
      }
      footer={
        <>
          <span className="text-muted-foreground mr-auto text-sm">Ctrl + Enter para crear</span>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            <IconPlus aria-hidden />
            Crear {ELEMENT_KIND_LABELS[kind].toLowerCase()}
          </Button>
        </>
      }
      editable
      preview={previewElement(values, projectId)}
      plan={plan}
      tree={tree}
      bounds={bounds}
      disabledKinds={severalDays ? SINGLE_DAY_KINDS : []}
      onKindChange={changeKind}
      isDirty={notDirty}
      onSubmit={form.handleSubmit(onCreate)}
      onClose={onClose}
    />
  )
}
