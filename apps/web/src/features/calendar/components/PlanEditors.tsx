import { useState, type FormEvent } from "react"
import type { Duration } from "@repo/contracts"
import { toISODate } from "@repo/domain"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  Button,
  Calendar,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@/shared/index"
import {
  DURATION_UNIT_OPTIONS,
  formatDuration,
  formatLongDate,
  formatPlanDate,
} from "../lib/planFormat"

// Los desplegables de mes y año necesitan un rango; sin él, se quedan en el año en curso.
const THIS_YEAR = new Date().getFullYear()
const DROPDOWN_START = new Date(THIS_YEAR - 10, 0)
const DROPDOWN_END = new Date(THIS_YEAR + 15, 11)

// Lo vacío no se pinta: aparece al pasar por la fila (group/row) o al llegar con el teclado.
const QUIET =
  "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"

const FIELD =
  "hover:bg-muted/60 focus-visible:ring-ring/50 block w-full rounded-lg px-2.5 py-1.5 text-left outline-none focus-visible:ring-[3px] disabled:cursor-default"

const TRIGGER =
  "hover:bg-muted focus-visible:ring-ring/50 rounded px-1.5 py-0.5 text-left outline-none focus-visible:ring-[3px] disabled:cursor-default disabled:hover:bg-transparent"

interface DurationEditorProps {
  label: string
  value: Duration | null
  editable: boolean
  pending: boolean
  onSave: (duration: Duration | null) => void
  /** Lo que se ve sin duración; por defecto, «Añadir». */
  emptyLabel?: string
  /** Sin valor, solo aparece al pasar por la fila o con el foco. */
  quiet?: boolean
  /** Solo la cantidad: la unidad se elige aparte. */
  amountOnly?: boolean
}

export function DurationEditor({
  label,
  value,
  editable,
  pending,
  onSave,
  emptyLabel = "Añadir",
  quiet = false,
  amountOnly = false,
}: Readonly<DurationEditorProps>) {
  const [open, setOpen] = useState<boolean>(false)
  const [amount, setAmount] = useState<string>("")
  const [unit, setUnit] = useState<Duration["unit"]>("weeks")

  const openEditor = (next: boolean) => {
    if (next) {
      setAmount(value ? String(value.amount).replace(".", ",") : "")
      setUnit(value?.unit ?? "weeks")
    }
    setOpen(next)
  }

  const parsed = Number(amount.replace(",", "."))
  const valid = amount.trim() !== "" && Number.isFinite(parsed) && parsed > 0

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    onSave({ amount: parsed, unit })
    setOpen(false)
  }

  if (!editable) {
    return <span>{value ? formatDuration(value) : "—"}</span>
  }

  return (
    <Popover open={open} onOpenChange={openEditor}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={pending}
          className={cn(TRIGGER, !value && "text-muted-foreground", !value && quiet && QUIET)}
        >
          {value
            ? amountOnly
              ? String(value.amount).replace(".", ",")
              : formatDuration(value)
            : emptyLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-base font-medium">{label}</p>
          <div className="flex gap-2">
            <Input
              aria-label="Cantidad"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-20"
              autoFocus
            />
            <Select value={unit} onValueChange={(next) => setUnit(next as Duration["unit"])}>
              <SelectTrigger aria-label="Unidad" className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between gap-2">
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSave(null)
                  setOpen(false)
                }}
              >
                Quitar
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm" disabled={!valid}>
              Guardar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

interface DateEditorProps {
  label: string
  value: string | null
  editable: boolean
  pending: boolean
  onSave: (date: string) => void
  /** Lo que se ve sin fecha; por defecto, «Escribir fecha». */
  emptyLabel?: string
  /** Por qué no hay fecha, al pasar el cursor. */
  reason?: string
  /** Sin valor, solo aparece al pasar por la fila o con el foco. */
  quiet?: boolean
  /** Como campo con su etiqueta encima («Inicio», «Fin»), en vez de en línea. */
  fieldLabel?: string
}

export function DateEditor({
  label,
  value,
  editable,
  pending,
  onSave,
  emptyLabel = "Escribir fecha",
  reason,
  quiet = false,
  fieldLabel,
}: Readonly<DateEditorProps>) {
  const [open, setOpen] = useState<boolean>(false)
  const selected = value ? parseISO(value) : undefined

  if (!editable) {
    return fieldLabel ? (
      <div className="px-2.5 py-1.5" title={reason}>
        <span className="text-muted-foreground block text-sm">{fieldLabel}</span>
        <span className="text-base font-semibold">{value ? formatLongDate(value) : "—"}</span>
      </div>
    ) : (
      <span title={reason}>{value ? formatPlanDate(value) : "—"}</span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={value ? undefined : reason}
          disabled={pending}
          className={
            fieldLabel
              ? FIELD
              : cn(TRIGGER, !value && "text-muted-foreground", !value && quiet && QUIET)
          }
        >
          {fieldLabel ? (
            <>
              <span className="text-muted-foreground block text-sm">{fieldLabel}</span>
              <span
                className={cn(
                  "text-base font-semibold",
                  !value && "text-muted-foreground font-normal"
                )}
              >
                {value ? formatLongDate(value) : emptyLabel}
              </span>
            </>
          ) : value ? (
            formatPlanDate(value)
          ) : (
            emptyLabel
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          locale={es}
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={DROPDOWN_START}
          endMonth={DROPDOWN_END}
          formatters={{ formatMonthDropdown: (date) => format(date, "LLL", { locale: es }) }}
          onSelect={(date) => {
            if (!date) return
            onSave(toISODate(date))
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
