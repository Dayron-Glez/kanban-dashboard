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
import { DURATION_UNIT_OPTIONS, formatDuration, formatPlanDate } from "../lib/planFormat"

// Los desplegables de mes y año necesitan un rango; sin él, se quedan en el año en curso.
const THIS_YEAR = new Date().getFullYear()
const DROPDOWN_START = new Date(THIS_YEAR - 10, 0)
const DROPDOWN_END = new Date(THIS_YEAR + 15, 11)

const TRIGGER =
  "hover:bg-muted focus-visible:ring-ring/50 rounded px-1.5 py-0.5 text-left outline-none focus-visible:ring-[3px] disabled:cursor-default disabled:hover:bg-transparent"

interface DurationEditorProps {
  label: string
  value: Duration | null
  editable: boolean
  pending: boolean
  onSave: (duration: Duration | null) => void
}

export function DurationEditor({
  label,
  value,
  editable,
  pending,
  onSave,
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
          className={cn(TRIGGER, !value && "text-muted-foreground")}
        >
          {value ? formatDuration(value) : "Añadir"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-sm font-medium">{label}</p>
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
}

export function DateEditor({ label, value, editable, pending, onSave }: Readonly<DateEditorProps>) {
  const [open, setOpen] = useState<boolean>(false)
  const selected = value ? parseISO(value) : undefined

  if (!editable) {
    return <span>{value ? formatPlanDate(value) : "—"}</span>
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={pending}
          className={cn(TRIGGER, !value && "text-muted-foreground")}
        >
          {value ? formatPlanDate(value) : "Escribir fecha"}
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
