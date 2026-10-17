import { useState } from "react"
import type { CalendarElement, Duration } from "@repo/contracts"
import { durationBetween, endFromStart, fromIsoDate, toIsoDate, type EpochDay } from "@repo/domain"
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconChevronDown,
  IconLink,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react"
import { Button, cn, Popover, PopoverContent, PopoverTrigger, ScrollArea } from "@/shared/index"
import { DURATION_UNIT_OPTIONS, formatDuration } from "../lib/planFormat"
import { PlanCalendar, type CalendarOccupancy } from "./PlanCalendar"
import { SegmentedControl } from "./SegmentedControl"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

/** Lo que se aplica al borrador: solo lo que cambió. */
export interface WhenChange {
  start?: string
  end?: string
  duration?: Duration
}

interface WhenPickerProps {
  element: CalendarElement
  /** Reuniones y recordatorios: un solo día, un mes y sin duración. */
  single: boolean
  /**
   * Las acciones: duran poco, así que sin la duración con su unidad, y lo elegido
   * se aplica al momento, sin Aplicar ni Cancelar.
   */
  instant?: boolean
  editable: boolean
  pending: boolean
  /** Los días que dibuja el Gantt: fuera no se puede elegir. */
  bounds?: { start: EpochDay; end: EpochDay }
  occupancy?: CalendarOccupancy
  /** De qué sale el inicio, si lo fija una regla. */
  ruleFrom?: string
  /** Desde la lista de un día del calendario: abrir una acción, o el día entero. */
  onOpenAction?: (elementId: string) => void
  onOpenDay?: (day: EpochDay) => void
  /** Por qué le falta alguna fecha. */
  reason?: string
  onApply: (change: WhenChange) => void
}

interface WhenValue {
  start: EpochDay | null
  end: EpochDay | null
  duration: Duration | null
}

// «lun 5 abr»; con el año, «lun 5 abr 2027».
const day = (value: EpochDay, year = false) =>
  format(parseISO(toIsoDate(value)), year ? "EEE d MMM yyyy" : "EEE d MMM", { locale: es })

const valueOf = (element: CalendarElement): WhenValue => ({
  start: element.startsOn ? fromIsoDate(element.startsOn) : null,
  end: element.endsOn ? fromIsoDate(element.endsOn) : null,
  duration: element.duration,
})

/**
 * «Cuándo» en un solo campo: el tramo y lo que dura. Al abrirlo, la duración con
 * su unidad arriba y el calendario debajo, con lo que ya hay en la fase. Nada
 * cambia hasta Aplicar, y lo aplicado va al borrador del panel.
 */
export function WhenPicker({
  element,
  single,
  instant = false,
  editable,
  pending,
  bounds,
  occupancy,
  ruleFrom,
  reason,
  onApply,
  onOpenAction,
  onOpenDay,
}: Readonly<WhenPickerProps>) {
  const [open, setOpen] = useState<boolean>(false)
  const [value, setValue] = useState<WhenValue>(() => valueOf(element))
  // Qué se eligió a mano además del inicio: la duración, el día de fin o nada.
  const [touched, setTouched] = useState<"none" | "duration" | "end">("none")

  const saved = valueOf(element)
  const apply = (chosen = value, how = touched) => {
    const change: WhenChange = {}
    if (chosen.start != null && chosen.start !== saved.start) change.start = toIsoDate(chosen.start)
    if (!single) {
      if (how === "duration" && chosen.duration) change.duration = chosen.duration
      if (how === "end" && chosen.end != null && chosen.end !== saved.end) {
        change.end = toIsoDate(chosen.end)
      }
    }
    setOpen(false)
    if (Object.keys(change).length > 0) onApply(change)
  }

  const openPicker = (next: boolean) => {
    if (next) {
      setValue(saved)
      setTouched("none")
    }
    // Al momento, cerrar aplica lo elegido: un inicio solo mueve el tramo entero.
    if (!next && instant) return apply()
    setOpen(next)
  }

  const changeDuration = (duration: Duration) => {
    setTouched("duration")
    setValue((current) => ({
      ...current,
      duration,
      end:
        current.start != null
          ? endFromStart(current.start, duration.amount, duration.unit)
          : current.end,
    }))
  }
  const unit = value.duration?.unit ?? "days"
  const step = (delta: number) =>
    changeDuration({ amount: Math.max(1, (value.duration?.amount ?? 0) + delta), unit })
  const changeUnit = (next: Duration["unit"]) => {
    if (value.start != null && value.end != null) {
      // Lo que dura se conserva, en la unidad nueva y redondeado.
      const days = value.end - value.start + 1
      const per = next === "days" ? 1 : next === "weeks" ? 7 : 30.4375
      changeDuration({ amount: Math.max(1, Math.round(days / per)), unit: next })
    } else changeDuration({ amount: value.duration?.amount ?? 1, unit: next })
  }

  const pick = ({ start, end }: { start: EpochDay | null; end: EpochDay | null }) => {
    if (start == null) return
    if (single) {
      const chosen = { ...value, start, end: start }
      return instant ? apply(chosen) : setValue(chosen)
    }
    // Solo el inicio: el tramo se mueve entero, con lo que dura.
    if (end == null) {
      const { duration } = value
      return setValue({
        ...value,
        start,
        end: duration ? endFromStart(start, duration.amount, duration.unit) : null,
      })
    }
    const chosen = {
      start,
      end,
      duration: durationBetween(start, end, value.duration?.unit ?? null),
    }
    if (instant) return apply(chosen, "end")
    setTouched("end")
    setValue(chosen)
  }

  const summary = (shown: WhenValue) => {
    if (shown.start == null) return { main: "Sin fechas", sub: reason ?? "Elige cuándo empieza" }
    if (single) return { main: day(shown.start, true), sub: "Un solo día" }
    if (shown.end == null)
      return { main: `${day(shown.start, true)} → sin fin`, sub: "Falta la duración" }
    const days = `${shown.end - shown.start + 1} días naturales`
    return {
      main: `${day(shown.start)} → ${day(shown.end, true)}`,
      sub: shown.duration ? `${formatDuration(shown.duration)} · ${days}` : days,
    }
  }
  const current = summary(saved)
  const missing = !single && saved.start != null && saved.end == null

  const trigger = (
    <span className="flex w-full items-center gap-3 text-left">
      <IconCalendarEvent className="text-primary size-[18px] shrink-0" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-semibold first-letter:uppercase">{current.main}</span>
        <span className="text-muted-foreground text-sm">{current.sub}</span>
      </span>
      {missing && (
        <span className="border-warn/40 bg-warn-soft/40 text-warn flex shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-medium">
          <IconAlertTriangle className="size-3" aria-hidden />
          sin duración
        </span>
      )}
      {editable && (
        <IconChevronDown className="text-muted-foreground size-4 shrink-0" aria-hidden />
      )}
    </span>
  )

  if (!editable) {
    return <div className="border-border bg-card rounded-xl border p-3">{trigger}</div>
  }

  const draftSummary = summary(value)
  return (
    <Popover open={open} onOpenChange={openPicker}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Cuándo: ${current.main}`}
          disabled={pending}
          className="border-border bg-card hover:border-primary/60 focus-visible:ring-ring/50 rounded-xl border p-3 outline-none focus-visible:ring-2 disabled:opacity-60"
        >
          {trigger}
        </button>
      </PopoverTrigger>
      {/* Nunca más alto que lo que queda de pantalla: la duración y los botones
          se quedan fijos, y lo de en medio se desplaza. */}
      <PopoverContent
        align="center"
        collisionPadding={12}
        className="flex max-h-(--radix-popover-content-available-height) w-[496px] flex-col p-0"
      >
        {!single && !instant && (
          <div className="border-border flex shrink-0 items-center gap-3 border-b px-3.5 py-3">
            <span className="text-muted-foreground text-sm">Duración</span>
            <div className="border-border bg-background flex h-7 items-center rounded-lg border">
              <button
                type="button"
                aria-label="Una unidad menos"
                disabled={(value.duration?.amount ?? 0) <= 1}
                onClick={() => step(-1)}
                className="text-muted-foreground hover:text-foreground flex h-full w-7 items-center justify-center disabled:opacity-40"
              >
                <IconMinus size={13} />
              </button>
              <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                {value.duration?.amount ?? "—"}
              </span>
              <button
                type="button"
                aria-label="Una unidad más"
                onClick={() => step(1)}
                className="text-muted-foreground hover:text-foreground flex h-full w-7 items-center justify-center"
              >
                <IconPlus size={13} />
              </button>
            </div>
            <SegmentedControl
              label="Unidad de la duración"
              value={unit}
              options={DURATION_UNIT_OPTIONS}
              onChange={changeUnit}
            />
            <span className="text-muted-foreground ml-auto text-xs">desde el inicio</span>
          </div>
        )}
        <ScrollArea className="flex min-h-0 flex-1 flex-col [&>[data-slot=scroll-area-viewport]]:min-h-0 [&>[data-slot=scroll-area-viewport]]:flex-1">
          <div className="flex flex-col gap-3 p-3">
            {ruleFrom && (
              <p className="border-primary/25 bg-primary/5 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
                <IconLink className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  El inicio sale de <b>{ruleFrom}</b>. Si eliges otro día, se reescribe el desfase
                  de la regla; no se rompe.
                </span>
              </p>
            )}
            <PlanCalendar
              mode={single ? "single" : "range"}
              numberOfMonths={single ? 1 : 2}
              value={{ start: value.start, end: value.end }}
              onChange={pick}
              defaultMonth={value.start ?? undefined}
              bounds={bounds}
              occupancy={occupancy}
              onOpenAction={
                onOpenAction &&
                ((id) => {
                  setOpen(false)
                  onOpenAction(id)
                })
              }
              onOpenDay={
                onOpenDay &&
                ((picked) => {
                  setOpen(false)
                  onOpenDay(picked)
                })
              }
            />
          </div>
        </ScrollArea>
        {!instant && (
          <div className="border-border flex shrink-0 items-center gap-2 border-t px-3 py-3">
            <span className={cn("min-w-0 flex-1 truncate text-sm")}>
              <b className="first-letter:uppercase">{draftSummary.main}</b>
              {!single && value.duration && value.end != null && (
                <span className="text-muted-foreground"> · {formatDuration(value.duration)}</span>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => apply()}>
              Aplicar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
