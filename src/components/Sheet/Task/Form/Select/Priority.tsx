import { useFormContext, Controller } from "react-hook-form";
import {
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TASK_PRIORITIES,
} from "@/index";

interface SelectPriorityProps {
  disabled?: boolean;
}

export function Priority({ disabled = false }: SelectPriorityProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <Controller
      name="priority"
      control={control}
      render={({ field }) => (
        <Field data-invalid={!!errors.priority}>
          <FieldLabel htmlFor="priority" className=" text-primary">
            Prioridad
          </FieldLabel>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger id="priority" disabled={disabled}>
              <SelectValue placeholder="Selecciona una prioridad" />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.priority && <FieldError errors={[errors.priority]} />}
        </Field>
      )}
    />
  );
}
