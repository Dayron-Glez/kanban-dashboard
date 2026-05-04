import { useFormContext, Controller } from "react-hook-form"
import { Field, FieldError, FieldLabel, Textarea } from "@/shared/index"

interface ContentProps {
  disabled?: boolean
}

export function ContentTextArea({ disabled = false }: ContentProps) {
  const { control } = useFormContext()

  return (
    <Controller
      name="content"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel
            htmlFor="content"
            className={`text-primary ${fieldState.invalid ? "text-red-500" : ""}`}
          >
            Contenido de la Tarea
          </FieldLabel>
          <Textarea
            {...field}
            id="content"
            aria-invalid={fieldState.invalid}
            className="max-h-96 min-h-32 w-full resize-none rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Escriba el contenido de la tarea"
            disabled={disabled}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
