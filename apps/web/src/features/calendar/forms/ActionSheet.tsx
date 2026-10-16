import { useEffect } from "react"
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { CalendarPlan } from "@repo/contracts"
import type { EpochDay } from "@repo/domain"
import { IconPlus } from "@tabler/icons-react"
import {
  Badge,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  SheetDescription,
  SheetTitle,
} from "@/shared/index"
import { ActionGlyph } from "../components/ActionGlyph"
import { SidePanel } from "../components/SidePanel"
import { NEW_ACTION_TITLE } from "../lib/actionStyle"
import { ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import {
  ActionFormSchema,
  newActionValues,
  previewElement,
  switchKind,
  type ActionFormData,
  type ActionFormValues,
  type NewActionRequest,
} from "./actionForm"
import { KindPicker } from "./sections/KindPicker"
import { MeetingSection } from "./sections/MeetingSection"
import { NotesSection } from "./sections/NotesSection"
import { PlaceSection } from "./sections/PlaceSection"
import { WhenSection } from "./sections/WhenSection"

interface ActionSheetProps {
  request: NewActionRequest
  projectId: string
  /** El plan con la acción nueva ya pintada (para el calendario de «Cuándo»). */
  plan: CalendarPlan
  tree: ElementNode[]
  bounds?: { start: EpochDay; end: EpochDay }
  pending: boolean
  /** Cada cambio, para pintar la acción en el Gantt mientras se rellena. */
  onPreview: (values: ActionFormData) => void
  /** Si hay algo escrito: cerrar pregunta antes. */
  onDirtyChange: (dirty: boolean) => void
  onClose: () => void
  onCreate: (values: ActionFormData) => void
}

const SINGLE_DAY_KINDS = ["meeting", "reminder"] as const

/**
 * El Sheet de una acción nueva: tipo y título arriba, lo esencial abierto y lo
 * demás plegado con su resumen. Nace con lo de la celda y los valores de su tipo.
 */
export function ActionSheet({
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
}: Readonly<ActionSheetProps>) {
  const form = useForm<ActionFormValues, unknown, ActionFormData>({
    resolver: zodResolver(ActionFormSchema),
    defaultValues: newActionValues(request),
  })
  const { control, getValues, setValue, formState } = form
  const kind = useWatch({ control, name: "kind" })
  const parentId = useWatch({ control, name: "parentId" })
  const values = useWatch({ control }) as ActionFormData
  const preview = previewElement(values, projectId)

  useEffect(() => onPreview(values), [values, onPreview])
  useEffect(() => onDirtyChange(formState.isDirty), [formState.isDirty, onDirtyChange])
  // Al título, después de que el menú de la celda devuelva el foco a su fila al cerrarse.
  useEffect(() => {
    const timer = setTimeout(() => form.setFocus("name"))
    return () => clearTimeout(timer)
  }, [form])

  let phase: ElementNode | undefined
  for (const root of tree) {
    const inside = (node: ElementNode): boolean =>
      node.element.id === parentId || node.children.some(inside)
    if (inside(root)) phase = root
  }
  const severalDays = values.endsOn != null && values.endsOn !== values.startsOn

  const changeKind = (next: ActionFormData["kind"]) => {
    const changes = switchKind(getValues() as ActionFormData, next)
    for (const [name, value] of Object.entries(changes)) {
      setValue(name as keyof ActionFormValues, value as never, { shouldDirty: true })
    }
  }

  return (
    <FormProvider {...form}>
      <SidePanel
        onClose={onClose}
        form={{
          "aria-label": NEW_ACTION_TITLE[kind],
          noValidate: true,
          onSubmit: form.handleSubmit(onCreate),
          onKeyDown: (event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              event.currentTarget.requestSubmit()
            }
          },
        }}
        header={
          <>
            <div className="flex items-center gap-2">
              <ActionGlyph kind={kind} className="size-[18px]" />
              <SheetTitle className="text-base">{NEW_ACTION_TITLE[kind]}</SheetTitle>
              <Badge variant="secondary" className="text-primary">
                Sin guardar
              </Badge>
            </div>
            <SheetDescription className="sr-only">
              {NEW_ACTION_TITLE[kind]}, sin guardar todavía
            </SheetDescription>
            <div className="mt-2 flex flex-col gap-3">
              <KindPicker
                value={kind}
                disabled={severalDays ? SINGLE_DAY_KINDS : []}
                onChange={changeKind}
              />
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="action-name">
                      Título <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id="action-name"
                      maxLength={120}
                      autoComplete="off"
                      placeholder={`Título ${TITLE_HINT[kind]}`}
                      aria-invalid={fieldState.invalid}
                      className="h-10 text-base font-semibold"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
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
      >
        <WhenSection preview={preview} plan={plan} bounds={bounds} />
        <PlaceSection phase={phase} />
        <div className="flex flex-col gap-2">
          {kind === "meeting" && <MeetingSection />}
          <NotesSection />
        </div>
      </SidePanel>
    </FormProvider>
  )
}

const TITLE_HINT: Record<ActionFormData["kind"], string> = {
  event: "del evento",
  task: "de la tarea",
  meeting: "de la reunión",
  reminder: "del recordatorio",
  hiring: "de la contratación",
  travel: "del viaje",
}
