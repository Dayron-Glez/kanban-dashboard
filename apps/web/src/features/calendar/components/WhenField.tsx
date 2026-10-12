import type { CalendarElement, DatePoint, Duration, UpdateElementPlanInput } from "@repo/contracts"
import { fromIsoDate } from "@repo/domain"
import { IconArrowRight, IconMinus, IconPlus } from "@tabler/icons-react"
import { durationSuggestions, formatDuration, formatPlanDate } from "../lib/planFormat"
import { DateEditor, DurationEditor } from "./PlanEditors"
import { SegmentedControl } from "./SegmentedControl"

interface WhenFieldProps {
  element: CalendarElement
  /** Dónde se sitúa: el elemento del que cuelga, o el plan entero si es una fase. */
  context: { name: string; start: string; end: string } | null
  color: string | undefined
  editable: boolean
  pending: boolean
  reason?: string
  onUpdate: (input: UpdateElementPlanInput) => void
  onMoveDate: (point: DatePoint, date: string) => void
}

const UNIT_OPTIONS = [
  { value: "days", label: "días" },
  { value: "weeks", label: "semanas" },
  { value: "months", label: "meses" },
] as const satisfies readonly { value: Duration["unit"]; label: string }[]

const UNIT_DAYS: Record<Duration["unit"], number> = { days: 1, weeks: 7, months: 30.4375 }

const daysBetween = (start: string, end: string) => fromIsoDate(end) - fromIsoDate(start) + 1

/** Inicio, fin y duración como una sola pieza, con su sitio dentro de la fase. */
export function WhenField({
  element,
  context,
  color,
  editable,
  pending,
  reason,
  onUpdate,
  onMoveDate,
}: Readonly<WhenFieldProps>) {
  const { duration } = element
  const writesStart = element.isAnchor || element.isPinned

  // Cambiar de unidad conserva lo que dura, redondeado a la unidad nueva.
  const changeUnit = (unit: Duration["unit"]) => {
    if (!duration || unit === duration.unit) return
    const days =
      element.startsOn && element.endsOn
        ? daysBetween(element.startsOn, element.endsOn)
        : duration.amount * UNIT_DAYS[duration.unit]
    onUpdate({ duration: { amount: Math.max(1, Math.round(days / UNIT_DAYS[unit])), unit } })
  }

  const step = (delta: number) => {
    if (!duration) return
    const amount = Math.max(1, Math.round(duration.amount) + delta)
    if (amount !== duration.amount) onUpdate({ duration: { amount, unit: duration.unit } })
  }

  const contextBar = () => {
    if (!context || !element.startsOn) return null
    const total = daysBetween(context.start, context.end)
    const left = ((fromIsoDate(element.startsOn) - fromIsoDate(context.start)) / total) * 100
    const width = element.endsOn ? (daysBetween(element.startsOn, element.endsOn) / total) * 100 : 1
    return (
      <div className="bg-muted/50 relative h-7 overflow-hidden rounded-md" aria-hidden>
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-between px-2 text-[11px]">
          <span className="truncate">
            {context.name} · {formatPlanDate(context.start)}
          </span>
          <span>{formatPlanDate(context.end)}</span>
        </div>
        <div
          className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-sm"
          style={{
            left: `${Math.min(Math.max(left, 0), 99)}%`,
            width: `${Math.max(Math.min(width, 100 - Math.max(left, 0)), 1)}%`,
            backgroundColor: color ?? "var(--primary)",
          }}
        />
      </div>
    )
  }

  return (
    <section aria-labelledby="inspector-when" className="flex flex-col gap-2">
      <h3
        id="inspector-when"
        className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase"
      >
        Cuándo
      </h3>
      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-2.5">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <DateEditor
              label={`Inicio de ${element.name}`}
              fieldLabel="Inicio"
              value={element.startsOn}
              editable={editable}
              pending={pending}
              reason={reason}
              emptyLabel={writesStart ? "Escribir fecha" : "Sin fecha"}
              onSave={(date) => onMoveDate("start", date)}
            />
          </div>
          <IconArrowRight size={14} className="text-muted-foreground shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <DateEditor
              label={`Fin de ${element.name}`}
              fieldLabel="Fin"
              value={element.endsOn}
              editable={editable}
              pending={pending}
              reason={reason}
              emptyLabel="Sin fecha"
              onSave={(date) => onMoveDate("end", date)}
            />
          </div>
        </div>

        {contextBar()}

        <div className="flex items-center gap-2 px-1 text-sm">
          <span className="text-muted-foreground">Dura</span>
          {duration && editable ? (
            <>
              <div className="border-border bg-background flex h-7 items-center rounded-lg border">
                <button
                  type="button"
                  aria-label="Una unidad menos"
                  disabled={pending || duration.amount <= 1}
                  onClick={() => step(-1)}
                  className="text-muted-foreground hover:text-foreground flex h-full w-7 items-center justify-center disabled:opacity-40"
                >
                  <IconMinus size={13} />
                </button>
                <DurationEditor
                  label={`Duración de ${element.name}`}
                  value={duration}
                  editable
                  pending={pending}
                  amountOnly
                  onSave={(next) => onUpdate({ duration: next })}
                />
                <button
                  type="button"
                  aria-label="Una unidad más"
                  disabled={pending}
                  onClick={() => step(1)}
                  className="text-muted-foreground hover:text-foreground flex h-full w-7 items-center justify-center disabled:opacity-40"
                >
                  <IconPlus size={13} />
                </button>
              </div>
              <SegmentedControl
                label="Unidad de la duración"
                value={duration.unit}
                options={UNIT_OPTIONS}
                onChange={changeUnit}
              />
            </>
          ) : !duration && editable ? (
            // Sin duración: las habituales a un clic, y «otra…» para escribirla.
            <div
              role="group"
              aria-label="¿Cuánto dura?"
              className="border-warn/40 bg-warn-soft/40 flex flex-1 flex-wrap items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5"
            >
              <span className="text-warn mr-1 text-xs">¿Cuánto dura?</span>
              {durationSuggestions(element).map((suggestion) => (
                <button
                  key={`${suggestion.amount}-${suggestion.unit}`}
                  type="button"
                  disabled={pending}
                  onClick={() => onUpdate({ duration: suggestion })}
                  className="bg-card border-border hover:bg-muted h-6 rounded-full border px-2.5 text-xs font-medium"
                >
                  {formatDuration(suggestion)}
                </button>
              ))}
              <DurationEditor
                label={`Duración de ${element.name}`}
                value={null}
                editable
                pending={pending}
                emptyLabel="otra…"
                onSave={(next) => onUpdate({ duration: next })}
              />
            </div>
          ) : (
            <DurationEditor
              label={`Duración de ${element.name}`}
              value={duration}
              editable={editable}
              pending={pending}
              onSave={(next) => onUpdate({ duration: next })}
            />
          )}
        </div>
      </div>
      {editable && (
        <p className="text-muted-foreground text-xs">
          Escribe cualquier fecha: el plan se recoloca para que salga y te enseña qué más se mueve
          antes de guardar.
        </p>
      )}
    </section>
  )
}
