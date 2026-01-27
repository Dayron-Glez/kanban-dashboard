import { useFormContext, Controller } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError } from "@/components/ui/field";

interface Props {
  disabled?: boolean;
}

export function Content({ disabled }: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      name="content"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Textarea
            {...field}
            id="content"
            aria-invalid={fieldState.invalid}
            className="min-h-32 max-h-96 focus-visible:ring-0"
            placeholder="Escriba el contenido de la tarea"
            disabled={disabled}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
