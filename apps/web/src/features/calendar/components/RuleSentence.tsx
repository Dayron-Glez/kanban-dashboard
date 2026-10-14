import { useState, type FormEvent, type ReactNode } from "react"
import type {
  CalendarElement,
  DatePoint,
  Duration,
  ElementDependency,
  SetElementRuleInput,
} from "@repo/contracts"
import { IconChevronDown, IconX } from "@tabler/icons-react"
import {
  Button,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@/shared/index"
import type { PhaseTint } from "../lib/phaseColors"
import { formatDuration } from "../lib/planFormat"
import { SegmentedControl } from "./SegmentedControl"

export interface RuleCandidate {
  element: CalendarElement
  depth: number
  tint: PhaseTint
}

interface RuleSentenceProps {
  point: DatePoint
  current: ElementDependency | undefined
  /** De qué elementos puede depender sin cerrar un ciclo, en el orden del árbol. */
  candidates: RuleCandidate[]
  editable: boolean
  pending: boolean
  onChange: (input: SetElementRuleInput) => void
  onRemove?: () => void
}

type Direction = "before" | "same" | "after"

const UNIT_OPTIONS = [
  { value: "days", label: "días" },
  { value: "weeks", label: "semanas" },
  { value: "months", label: "meses" },
] as const satisfies readonly { value: Duration["unit"]; label: string }[]

const PILL =
  "inline-flex h-7 items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2.5 align-middle text-base font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none disabled:cursor-default disabled:hover:bg-primary/10"

function Pill({
  label,
  children,
  editable,
  pending,
  content,
  open,
  onOpenChange,
}: Readonly<{
  label: string
  children: ReactNode
  editable: boolean
  pending: boolean
  content: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}>) {
  if (!editable) return <span className={cn(PILL, "hover:bg-primary/10")}>{children}</span>
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} disabled={pending} className={PILL}>
          {children}
          <IconChevronDown size={12} className="opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-1">
        {content}
      </PopoverContent>
    </Popover>
  )
}

const directionOf = (amount: number): Direction =>
  amount < 0 ? "before" : amount > 0 ? "after" : "same"

/**
 * La regla de un extremo como frase: «Empieza [4 semanas] [antes] del [fin] de
 * [Edición]». Cada ficha se cambia por separado, sin números negativos.
 */
export function RuleSentence({
  point,
  current,
  candidates,
  editable,
  pending,
  onChange,
  onRemove,
}: Readonly<RuleSentenceProps>) {
  const [openPill, setOpenPill] = useState<string | null>(null)
  const [amountText, setAmountText] = useState<string>("")
  const verb = point === "start" ? "Empieza" : "Acaba"
  const lag = current?.lag ?? { amount: 0, unit: "days" as const }
  const direction = directionOf(lag.amount)
  const predecessor = candidates.find(
    (candidate) => candidate.element.id === current?.predecessorId
  )
  const pointLabel = (current?.predecessorPoint ?? "start") === "start" ? "inicio" : "fin"

  const toggle = (pill: string) => (open: boolean) => {
    if (open && pill === "amount")
      setAmountText(String(Math.abs(lag.amount) || 1).replace(".", ","))
    setOpenPill(open ? pill : null)
  }

  const save = (patch: Partial<SetElementRuleInput>) => {
    setOpenPill(null)
    const predecessorId = patch.predecessorId ?? current?.predecessorId
    if (!predecessorId) return
    onChange({
      predecessorId,
      predecessorPoint: patch.predecessorPoint ?? current?.predecessorPoint ?? point,
      lag: patch.lag ?? lag,
    })
  }

  const setDirection = (next: Direction) => {
    const size = Math.abs(lag.amount) || 1
    save({
      lag: { amount: next === "same" ? 0 : next === "before" ? -size : size, unit: lag.unit },
    })
  }

  const submitAmount = (event: FormEvent) => {
    event.preventDefault()
    const size = Number(amountText.replace(",", "."))
    if (!Number.isFinite(size) || size <= 0) return
    save({ lag: { amount: direction === "before" ? -size : size, unit: lag.unit } })
  }

  const option = (key: string, text: string, selected: boolean, onSelect: () => void) => (
    <button
      key={key}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "hover:bg-muted flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-base",
        selected && "text-primary font-medium"
      )}
    >
      {text}
    </button>
  )

  const elementPicker = (
    <Command className="w-64">
      <CommandInput placeholder="Buscar un elemento…" />
      <CommandList>
        <CommandEmpty>No hay ninguno con ese nombre.</CommandEmpty>
        {candidates.map(({ element, depth, tint }) => (
          <CommandItem
            key={element.id}
            value={`${element.name} ${element.id}`}
            onSelect={() => save({ predecessorId: element.id })}
          >
            <span style={{ paddingLeft: `${depth * 12}px` }} className="flex items-center gap-2">
              <span
                className={cn("size-1.5 shrink-0 rounded-full", tint.className)}
                style={tint.style}
                aria-hidden
              />
              {element.name}
            </span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  )

  const elementPill = (
    <Pill
      label="De qué elemento"
      editable={editable}
      pending={pending}
      open={openPill === "element"}
      onOpenChange={toggle("element")}
      content={elementPicker}
    >
      {predecessor ? (
        <>
          <span
            className={cn("size-1.5 rounded-full", predecessor.tint.className)}
            style={predecessor.tint.style}
            aria-hidden
          />
          {predecessor.element.name}
        </>
      ) : (
        "elige un elemento"
      )}
    </Pill>
  )

  if (!current) {
    return (
      <div className="border-border bg-card rounded-xl border p-3 text-base leading-8">
        {verb} con el{" "}
        <span className="text-muted-foreground">{point === "start" ? "inicio" : "fin"}</span> de{" "}
        {elementPill}
      </div>
    )
  }

  return (
    <div className="border-border bg-card group/rule relative rounded-xl border p-3 pr-9 text-base leading-8">
      {verb}{" "}
      {direction !== "same" && (
        <>
          <Pill
            label="Cuánto"
            editable={editable}
            pending={pending}
            open={openPill === "amount"}
            onOpenChange={toggle("amount")}
            content={
              <form onSubmit={submitAmount} className="flex flex-col gap-2 p-2">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Cantidad del desfase"
                    inputMode="decimal"
                    value={amountText}
                    onChange={(event) => setAmountText(event.target.value)}
                    className="h-8 w-16"
                    autoFocus
                  />
                  <SegmentedControl
                    label="Unidad del desfase"
                    value={lag.unit}
                    options={UNIT_OPTIONS}
                    onChange={(unit) => save({ lag: { amount: lag.amount, unit } })}
                  />
                </div>
                <Button type="submit" size="sm">
                  Aplicar
                </Button>
              </form>
            }
          >
            {formatDuration({ amount: Math.abs(lag.amount), unit: lag.unit })}
          </Pill>{" "}
        </>
      )}
      <Pill
        label="Antes, a la vez o después"
        editable={editable}
        pending={pending}
        open={openPill === "direction"}
        onOpenChange={toggle("direction")}
        content={
          <div role="listbox" aria-label="Antes, a la vez o después" className="w-36">
            {option("before", "antes del", direction === "before", () => setDirection("before"))}
            {option("same", "con el", direction === "same", () => setDirection("same"))}
            {option("after", "después del", direction === "after", () => setDirection("after"))}
          </div>
        }
      >
        {direction === "before" ? "antes del" : direction === "after" ? "después del" : "con el"}
      </Pill>{" "}
      <Pill
        label="Desde qué fecha"
        editable={editable}
        pending={pending}
        open={openPill === "point"}
        onOpenChange={toggle("point")}
        content={
          <div role="listbox" aria-label="Desde qué fecha" className="w-28">
            {option("start", "inicio", pointLabel === "inicio", () =>
              save({ predecessorPoint: "start" })
            )}
            {option("end", "fin", pointLabel === "fin", () => save({ predecessorPoint: "end" }))}
          </div>
        }
      >
        {pointLabel}
      </Pill>{" "}
      de {elementPill}
      {editable && onRemove && (
        <button
          type="button"
          aria-label="Quitar la regla"
          onClick={onRemove}
          disabled={pending}
          className="text-muted-foreground hover:text-foreground absolute top-3 right-2.5 rounded p-1"
        >
          <IconX size={14} />
        </button>
      )}
    </div>
  )
}
