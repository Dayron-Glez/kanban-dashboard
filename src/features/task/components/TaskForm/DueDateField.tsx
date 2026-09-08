import { useState } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { IconCalendar, IconX } from "@tabler/icons-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  Button,
  Calendar,
  Field,
  FieldError,
  FieldLabel,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@/shared/index"
import { DUE_STATE_CHIP, getDueState, toISODate } from "../../lib/dueDate"

interface DueDateFieldProps {
  disabled?: boolean
}

export function DueDateField({ disabled = false }: DueDateFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()
  const [open, setOpen] = useState(false)

  return (
    <Controller
      name="due_date"
      control={control}
      render={({ field }) => {
        const value: string | null = field.value ?? null
        const selected = value ? parseISO(value) : undefined
        const state = getDueState(value)

        return (
          <Field data-invalid={!!errors.due_date} className="col-span-2">
            <FieldLabel htmlFor="due_date" className="text-primary">
              Fecha de vencimiento
            </FieldLabel>

            <div className="flex items-center gap-2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="due_date"
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                      "bg-background dark:bg-muted/60 flex-1 justify-start font-normal",
                      !value && "text-muted-foreground"
                    )}
                  >
                    <IconCalendar size={15} className="mr-2 shrink-0" />
                    {value ? (
                      <span className="flex items-center gap-2">
                        {format(parseISO(value), "d 'de' MMMM 'de' yyyy", { locale: es })}
                        {/* El chip solo aparece cuando dice algo: si la fecha
                            está lejos, la fecha ya se lee sola. */}
                        {(state === "overdue" || state === "today") && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-px text-[10px] font-semibold",
                              DUE_STATE_CHIP[state]
                            )}
                          >
                            {state === "overdue" ? "Atrasada" : "Hoy"}
                          </span>
                        )}
                      </span>
                    ) : (
                      "Sin fecha"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={selected}
                    defaultMonth={selected}
                    onSelect={(date) => {
                      field.onChange(date ? toISODate(date) : null)
                      setOpen(false)
                    }}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Quitar la fecha: sin esto no habría forma de volver a
                  «sin fecha» una vez elegida una. */}
              {value && !disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar la fecha de vencimiento"
                  onClick={() => field.onChange(null)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <IconX size={15} />
                </Button>
              )}
            </div>

            {errors.due_date && <FieldError errors={[errors.due_date]} />}
          </Field>
        )
      }}
    />
  )
}
