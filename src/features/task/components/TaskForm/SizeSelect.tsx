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
import { TASK_SIZES } from "@/features/board/types/board.types"
import { SIZE_CONFIG } from "../taskChips"

interface SelectSizeProps {
  disabled?: boolean
}

export function SizeSelect({ disabled = false }: SelectSizeProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  return (
    <Controller
      name="size"
      control={control}
      render={({ field }) => (
        <Field data-invalid={!!errors.size}>
          <FieldLabel htmlFor="size" className="text-primary">
            Tamaño
          </FieldLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger id="size" disabled={disabled}>
              <SelectValue placeholder="Selecciona un tamaño" />
            </SelectTrigger>
            <SelectContent>
              {TASK_SIZES.map((size) => {
                const cfg = SIZE_CONFIG[size]
                return (
                  <SelectItem key={size} value={size}>
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
          {errors.size && <FieldError errors={[errors.size]} />}
        </Field>
      )}
    />
  )
}
