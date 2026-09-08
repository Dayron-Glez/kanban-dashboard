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

/**
 * Mismo aspecto que el disparador de los Select del formulario. No se usa el
 * componente Button porque su variante lleva `disabled:pointer-events-none`, y
 * sin eventos de puntero no se pinta el cursor de "no permitido" que sí
 * muestran el resto de campos en la vista de solo lectura. Su hover tampoco es
 * el de un campo, sino el de un boton.
 */
const TRIGGER_CLASS =
  "border-input bg-background dark:bg-muted/60 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
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
                  <button
                    id="due_date"
                    type="button"
                    disabled={disabled}
                    className={cn(TRIGGER_CLASS, "flex-1", !value && "text-muted-foreground")}
                  >
                    <IconCalendar size={15} className="text-muted-foreground shrink-0" />
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
                  </button>
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
