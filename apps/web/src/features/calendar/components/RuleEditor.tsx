import { useState, type FormEvent } from "react"
import type {
  CalendarElement,
  DatePoint,
  Duration,
  ElementDependency,
  SetElementRuleInput,
} from "@repo/contracts"
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/index"
import { DURATION_UNIT_OPTIONS } from "../lib/planFormat"

interface RuleEditorProps {
  point: DatePoint
  current: ElementDependency | undefined
  /** Los elementos de los que puede depender sin cerrar un ciclo, en el orden del árbol. */
  candidates: { element: CalendarElement; depth: number }[]
  fallbackPredecessorId: string | null
  pending: boolean
  onSave: (input: SetElementRuleInput) => void
  onRemove: () => void
}

const POINT_OPTIONS: { value: DatePoint; label: string }[] = [
  { value: "start", label: "el inicio" },
  { value: "end", label: "el fin" },
]

const toText = (amount: number) => String(amount).replace(".", ",")

/** La regla de un extremo como frase: «Empieza [+1 día] desde [el fin] de [Shooting]». */
export function RuleEditor({
  point,
  current,
  candidates,
  fallbackPredecessorId,
  pending,
  onSave,
  onRemove,
}: Readonly<RuleEditorProps>) {
  const [predecessorId, setPredecessorId] = useState<string>(
    current?.predecessorId ?? fallbackPredecessorId ?? ""
  )
  const [predecessorPoint, setPredecessorPoint] = useState<DatePoint>(
    current?.predecessorPoint ?? "start"
  )
  const [amount, setAmount] = useState<string>(toText(current?.lag.amount ?? 0))
  const [unit, setUnit] = useState<Duration["unit"]>(current?.lag.unit ?? "days")

  const parsed = Number(amount.replace(",", "."))
  const valid = predecessorId !== "" && amount.trim() !== "" && Number.isFinite(parsed)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    onSave({ predecessorId, predecessorPoint, lag: { amount: parsed, unit } })
  }

  const verb = point === "start" ? "Empieza" : "Acaba"

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>{verb}</span>
        <Input
          aria-label="Desfase"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="h-8 w-16"
        />
        <Select value={unit} onValueChange={(next) => setUnit(next as Duration["unit"])}>
          <SelectTrigger aria-label="Unidad del desfase" size="sm" className="w-28">
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
        <span>desde</span>
        <Select
          value={predecessorPoint}
          onValueChange={(next) => setPredecessorPoint(next as DatePoint)}
        >
          <SelectTrigger aria-label="Desde qué fecha" size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POINT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>de</span>
        <Select value={predecessorId} onValueChange={setPredecessorId}>
          <SelectTrigger aria-label="De qué elemento" size="sm" className="min-w-40 flex-1">
            <SelectValue placeholder="Elige un elemento" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map(({ element, depth }) => (
              <SelectItem key={element.id} value={element.id}>
                <span style={{ paddingLeft: `${depth * 12}px` }}>{element.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-muted-foreground text-xs">
        El desfase puede ser negativo: «−4 semanas desde el fin de Edición» es cuatro semanas antes.
      </p>
      <div className="flex justify-between gap-2">
        {current ? (
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onRemove}>
            Quitar la regla
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={!valid || pending}>
          Guardar la regla
        </Button>
      </div>
    </form>
  )
}
