import { Controller, useFormContext, useWatch } from "react-hook-form"
import { ACTION_PARENT_KINDS, type ActionPriority } from "@repo/contracts"
import {
  cn,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/index"
import { ElementPicker } from "../../components/ElementPicker"
import { flattenTree, type ElementNode } from "../../lib/elementTree"
import { phaseTint } from "../../lib/phaseColors"
import type { ActionFormValues } from "../actionForm"
import { FIELD, FIELD_GAP } from "../fieldStyle"

const PRIORITIES: readonly { value: ActionPriority; label: string }[] = [
  { value: "high", label: "Alta" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Baja" },
]

const heading = "text-muted-foreground text-sm font-semibold tracking-wider uppercase"

interface PlaceSectionProps {
  /** La fase de la acción: de ella, o de lo que tiene dentro, puede colgar. */
  phase: ElementNode | undefined
}

/** De qué cuelga, su prioridad y dónde es. */
export function PlaceSection({ phase }: Readonly<PlaceSectionProps>) {
  const { control } = useFormContext<ActionFormValues>()
  const kind = useWatch({ control, name: "kind" })
  const parents = phase
    ? flattenTree([phase]).filter((node) => ACTION_PARENT_KINDS.includes(node.element.kind))
    : []

  return (
    <section aria-labelledby="action-place" className="flex flex-col gap-4">
      <h3 id="action-place" className={heading}>
        Dónde
      </h3>
      <div className="grid grid-cols-[1fr_9rem] gap-4">
        <Controller
          name="parentId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className={FIELD_GAP}>
              <FieldLabel>{kind === "hiring" ? "Fase de incorporación" : "Cuelga de"}</FieldLabel>
              <ElementPicker
                label="Cuelga de"
                options={parents.map((node) => ({
                  element: node.element,
                  depth: node.depth,
                  tint: phaseTint(node.phaseColor, node.depth === 0),
                }))}
                value={field.value}
                onChange={field.onChange}
                placeholder="Elige una fase, subfase o proceso"
                className={FIELD}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <Field className={FIELD_GAP}>
              <FieldLabel>Prioridad</FieldLabel>
              <Select value={field.value ?? "normal"} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Prioridad" className={cn("w-full", FIELD)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      </div>
      <Controller
        name="location"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className={FIELD_GAP}>
            <FieldLabel htmlFor="action-location">
              {kind === "hiring" ? "Lugar" : "Ubicación"}
            </FieldLabel>
            <Input
              id="action-location"
              value={field.value ?? ""}
              maxLength={200}
              placeholder={kind === "hiring" ? "Plató, localización…" : "Añadir ubicación"}
              aria-invalid={fieldState.invalid}
              className={FIELD}
              onChange={(event) => field.onChange(event.target.value || null)}
              onBlur={field.onBlur}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </section>
  )
}
