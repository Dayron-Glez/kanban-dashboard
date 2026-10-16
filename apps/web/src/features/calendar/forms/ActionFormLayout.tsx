import type { FormEventHandler, ReactNode } from "react"
import { Controller, FormProvider, useWatch, type UseFormReturn } from "react-hook-form"
import type { ActionKind, CalendarElement, CalendarPlan } from "@repo/contracts"
import type { EpochDay } from "@repo/domain"
import { cn, Field, FieldError, FieldLabel, Input } from "@/shared/index"
import { SidePanel } from "../components/SidePanel"
import type { WhenChange } from "../components/WhenPicker"
import { changedMark } from "../lib/changedMark"
import type { ElementNode } from "../lib/elementTree"
import type { ActionFormData, ActionFormValues } from "./actionForm"
import { KindPicker } from "./sections/KindPicker"
import { MeetingSection } from "./sections/MeetingSection"
import { NotesSection } from "./sections/NotesSection"
import { PlaceSection } from "./sections/PlaceSection"
import { WhenSection } from "./sections/WhenSection"
import { FIELD, FIELD_GAP } from "./fieldStyle"

/** Lo que comparten crear y editar una acción. */
export interface ActionSheetBaseProps {
  projectId: string
  /** El plan tal como se ve: con la acción nueva pintada o con lo editado sin guardar. */
  plan: CalendarPlan
  tree: ElementNode[]
  bounds?: { start: EpochDay; end: EpochDay }
  pending: boolean
  onClose: () => void
}

export type ActionForm = UseFormReturn<ActionFormValues, unknown, ActionFormData>

interface ActionFormLayoutProps extends Omit<ActionSheetBaseProps, "projectId" | "pending"> {
  form: ActionForm
  /** El nombre del formulario, para quien lee la pantalla. */
  label: string
  /** La primera línea de la cabecera: el título de la acción nueva o la ruta de la guardada. */
  heading: ReactNode
  footer: ReactNode
  editable: boolean
  /** La acción tal como se pinta, para el calendario de «Cuándo». */
  preview: CalendarElement
  disabledKinds?: readonly ActionKind[]
  onKindChange: (kind: ActionKind) => void
  onApplyWhen?: (change: WhenChange) => void
  /** Si alguno de esos campos lleva cambios sin guardar: la marca cian. */
  isDirty: (...keys: (keyof ActionFormData)[]) => boolean
  onSubmit: FormEventHandler<HTMLFormElement>
}

const TITLE_HINT: Record<ActionKind, string> = {
  event: "del evento",
  task: "de la tarea",
  meeting: "de la reunión",
  reminder: "del recordatorio",
  hiring: "de la contratación",
  travel: "del viaje",
}

// La fase en la que está lo que se elige como padre: de ella, o de dentro, puede colgar.
const phaseOf = (tree: ElementNode[], parentId: string | undefined) => {
  const inside = (node: ElementNode): boolean =>
    node.element.id === parentId || node.children.some(inside)
  return tree.find(inside)
}

/**
 * El armazón del Sheet de una acción: tipo y título arriba, lo esencial abierto
 * (cuándo y dónde) y lo demás plegado con su resumen. Enter guarda desde un
 * campo; Ctrl + Enter, desde cualquier sitio.
 */
export function ActionFormLayout({
  form,
  label,
  heading,
  footer,
  editable,
  preview,
  plan,
  tree,
  bounds,
  disabledKinds = [],
  onKindChange,
  onApplyWhen,
  isDirty,
  onSubmit,
  onClose,
}: Readonly<ActionFormLayoutProps>) {
  const { control } = form
  const kind = useWatch({ control, name: "kind" })
  const parentId = useWatch({ control, name: "parentId" })

  return (
    <FormProvider {...form}>
      <SidePanel
        onClose={onClose}
        form={{
          "aria-label": label,
          noValidate: true,
          onSubmit,
          onKeyDown: (event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              event.currentTarget.requestSubmit()
            }
          },
        }}
        header={
          <>
            {heading}
            <fieldset disabled={!editable} className="mt-2 flex min-w-0 flex-col gap-4">
              <div className={cn(changedMark(isDirty("kind")))}>
                <KindPicker value={kind} disabled={disabledKinds} onChange={onKindChange} />
              </div>
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className={cn(FIELD_GAP, changedMark(isDirty("name")))}
                  >
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
                      className={cn(FIELD, "font-semibold")}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </fieldset>
          </>
        }
        footer={footer}
      >
        <fieldset disabled={!editable} className="flex min-w-0 flex-col gap-4">
          <div className={cn(changedMark(isDirty("plan", "hours", "completed")))}>
            <WhenSection preview={preview} plan={plan} bounds={bounds} onApply={onApplyWhen} />
          </div>
          <div className={cn(changedMark(isDirty("parentId", "priority", "location")))}>
            <PlaceSection phase={phaseOf(tree, parentId)} />
          </div>
          <div className="flex flex-col gap-4">
            {kind === "meeting" && <MeetingSection changed={isDirty("videoApp", "videoUrl")} />}
            <NotesSection changed={isDirty("notes")} />
          </div>
        </fieldset>
      </SidePanel>
    </FormProvider>
  )
}
