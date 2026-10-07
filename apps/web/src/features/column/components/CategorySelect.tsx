import { Controller, useFormContext } from "react-hook-form"
import { COLUMN_CATEGORIES } from "@repo/contracts"
import {
  Field,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/index"
import { CATEGORY_CONFIG } from "../lib/columnCategories"

export function CategorySelect() {
  const { control } = useFormContext()

  return (
    <Controller
      name="category"
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor="category" className="text-primary">
            Categoría
          </FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="category" className="bg-background dark:bg-muted/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLUMN_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: CATEGORY_CONFIG[category].color }}
                    />
                    {CATEGORY_CONFIG[category].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  )
}
