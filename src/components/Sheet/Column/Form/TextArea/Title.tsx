import { useFormContext, Controller } from "react-hook-form";
import { Field, FieldError, Textarea } from "@/index";

interface Props {
  disabled?: boolean;
}

export function Title({ disabled }: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      name="title"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Textarea
            {...field}
            id="title"
            aria-invalid={fieldState.invalid}
            className="min-h-32 max-h-96 focus-visible:ring-0"
            placeholder="Escriba el nombre de la columna"
            disabled={disabled}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
