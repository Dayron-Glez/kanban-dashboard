import { useFormContext, Controller } from "react-hook-form"
import {
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/index"
import { TASK_PRIORITIES } from "@/features/board/types/board.types"
import { PRIORITY_CONFIG } from "../taskChips"

interface SelectPriorityProps {
  disabled?: boolean
}

export function PrioritySelect({ disabled = false }: SelectPriorityProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  return (
    <Controller
      name="priority"
      control={control}
      render={({ field }) => (
        <Field data-invalid={!!errors.priority}>
          <FieldLabel htmlFor="priority" className="text-primary">
            Prioridad
          </FieldLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger
              id="priority"
              disabled={disabled}
              className="bg-background dark:bg-muted/60"
            >
              <SelectValue placeholder="Selecciona una prioridad" />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((priority) => {
                const cfg = PRIORITY_CONFIG[priority]
                return (
                  <SelectItem key={priority} value={priority}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.className}`}
                    >
                      {cfg.label}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {errors.priority && <FieldError errors={[errors.priority]} />}
        </Field>
      )}
    />
  )
}
