import type { CalendarElement, UpdateElementPlanInput } from "@repo/contracts"
import { fromIsoDate, type EpochDay } from "@repo/domain"
import { cn } from "@/shared/index"
import type { PhaseTint } from "../lib/phaseColors"
import { durationSuggestions, formatDuration, formatPlanDate } from "../lib/planFormat"
import type { CalendarOccupancy } from "./PlanCalendar"
import { DurationEditor } from "./PlanEditors"
import { WhenPicker, type WhenChange } from "./WhenPicker"

interface WhenFieldProps {
  element: CalendarElement
  /** Dónde se sitúa: el elemento del que cuelga, o el plan entero si es una fase. */
  context: { name: string; start: string; end: string } | null
  /** El color de su fase. */
  tint: PhaseTint
  editable: boolean
  pending: boolean
  /** Reuniones y recordatorios: un solo día. */
  single: boolean
  bounds?: { start: EpochDay; end: EpochDay }
  occupancy?: CalendarOccupancy
  /** De qué sale el inicio, si lo fija una regla. */
  ruleFrom?: string
  reason?: string
  onOpenAction?: (elementId: string) => void
  onOpenDay?: (day: EpochDay) => void
  onUpdate: (input: UpdateElementPlanInput) => void
  onApply: (change: WhenChange) => void
}

const daysBetween = (start: string, end: string) => fromIsoDate(end) - fromIsoDate(start) + 1

/** Cuándo: el tramo y lo que dura en un solo campo, con su sitio dentro de la fase. */
export function WhenField({
  element,
  context,
  tint,
  editable,
  pending,
  single,
  bounds,
  occupancy,
  ruleFrom,
  reason,
  onUpdate,
  onApply,
  onOpenAction,
  onOpenDay,
}: Readonly<WhenFieldProps>) {
  const contextBar = () => {
    if (!context || !element.startsOn) return null
    const total = daysBetween(context.start, context.end)
    const left = ((fromIsoDate(element.startsOn) - fromIsoDate(context.start)) / total) * 100
    const width = element.endsOn ? (daysBetween(element.startsOn, element.endsOn) / total) * 100 : 1
    // Las fechas encima y la pista debajo: la barra nunca tapa el texto.
    return (
      <div className="flex flex-col gap-1.5 px-1" aria-hidden>
        <div className="text-muted-foreground flex justify-between gap-2 text-sm tabular-nums">
          <span className="truncate">
            {context.name} · {formatPlanDate(context.start)}
          </span>
          <span className="shrink-0">{formatPlanDate(context.end)}</span>
        </div>
        <div className="bg-muted relative h-1.5 overflow-hidden rounded-full">
          <div
            className={cn("absolute inset-y-0 rounded-full", tint.className)}
            style={{
              ...tint.style,
              left: `${Math.min(Math.max(left, 0), 99)}%`,
              width: `${Math.max(Math.min(width, 100 - Math.max(left, 0)), 1)}%`,
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <section aria-labelledby="inspector-when" className="flex flex-col gap-2">
      <h3
        id="inspector-when"
        className="text-muted-foreground text-sm font-semibold tracking-wider uppercase"
      >
        Cuándo
      </h3>
      <WhenPicker
        key={element.id}
        element={element}
        single={single}
        editable={editable}
        pending={pending}
        bounds={bounds}
        occupancy={occupancy}
        ruleFrom={ruleFrom}
        reason={reason}
        onApply={onApply}
        onOpenAction={onOpenAction}
        onOpenDay={onOpenDay}
      />
      {!single && !element.duration && editable && (
        // Sin duración: las habituales a un clic, y «otra…» para escribirla.
        <div
          role="group"
          aria-label="¿Cuánto dura?"
          className="border-warn/40 bg-warn-soft/40 flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5"
        >
          <span className="text-warn mr-1 text-sm">¿Cuánto dura?</span>
          {durationSuggestions(element).map((suggestion) => (
            <button
              key={`${suggestion.amount}-${suggestion.unit}`}
              type="button"
              disabled={pending}
              onClick={() => onUpdate({ duration: suggestion })}
              className="bg-card border-border hover:bg-muted h-6 rounded-full border px-2.5 text-sm font-medium"
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
      )}
      {contextBar()}
      {single && (
        <p className="text-muted-foreground text-sm">
          Las reuniones y los recordatorios son de un solo día.
        </p>
      )}
    </section>
  )
}
