import { useFormContext, Controller } from "react-hook-form";
import { Field, FieldError, FieldLabel, Textarea } from "@/shared/index";

interface ContentProps {
  disabled?: boolean;
}

export function ContentTextArea({ disabled = false }: ContentProps) {
  const { control } = useFormContext();

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
            className="w-full min-h-32 max-h-96 p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Escriba el contenido de la tarea"
            disabled={disabled}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
