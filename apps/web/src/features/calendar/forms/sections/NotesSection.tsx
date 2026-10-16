import { Controller, useFormContext, useWatch } from "react-hook-form"
import { IconNotes } from "@tabler/icons-react"
import { cn, Field, FieldError, FieldLabel, Textarea } from "@/shared/index"
import { FoldSection } from "../FoldSection"
import type { ActionFormValues } from "../actionForm"
import { FIELD_GAP, FIELD_SURFACE } from "../fieldStyle"

/** Las notas, en texto libre. */
export function NotesSection({ changed = false }: Readonly<{ changed?: boolean }>) {
  const { control, formState } = useFormContext<ActionFormValues>()
  const notes = useWatch({ control, name: "notes" })

  return (
    <FoldSection
      icon={IconNotes}
      title="Notas"
      summary={notes ? notes.split("\n")[0]! : "Sin notas"}
      invalid={formState.errors.notes != null}
      changed={changed}
    >
      <Controller
        name="notes"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className={FIELD_GAP}>
            <FieldLabel htmlFor="action-notes" className="sr-only">
              Notas
            </FieldLabel>
            <Textarea
              id="action-notes"
              value={field.value ?? ""}
              placeholder="Añadir notas…"
              aria-invalid={fieldState.invalid}
              className={cn(FIELD_SURFACE, "min-h-24 resize-y")}
              onChange={(event) => field.onChange(event.target.value || null)}
              onBlur={field.onBlur}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </FoldSection>
  )
}
