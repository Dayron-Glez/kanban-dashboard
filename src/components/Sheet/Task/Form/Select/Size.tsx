import { useFormContext, Controller } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { TASK_SIZES } from "@/types";

interface SelectSizeProps {
  disabled?: boolean;
}

export function Size({ disabled = false }: SelectSizeProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <Controller
      name="size"
      control={control}
      render={({ field }) => (
        <Field data-invalid={!!errors.size}>
          <FieldLabel htmlFor="size" className=" text-primary">
            Tamaño
          </FieldLabel>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger id="size" disabled={disabled}>
              <SelectValue placeholder="Selecciona un tamaño" />
            </SelectTrigger>
            <SelectContent>
              {TASK_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.size && <FieldError errors={[errors.size]} />}
        </Field>
      )}
    />
  );
}
