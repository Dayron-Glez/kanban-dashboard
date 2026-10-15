import { createContext, useContext, useState } from "react"
import type { ActionKind } from "@repo/contracts"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

import { fromIsoDate, toISODate, toIsoDate, type EpochDay } from "@repo/domain"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { CustomComponents, DayButton } from "react-day-picker"
import { Button, Calendar, cn, HoverCard, HoverCardContent, HoverCardTrigger } from "@/shared/index"
import { ACTION_BG } from "../lib/actionStyle"
import { formatLongDate } from "../lib/planFormat"
import { ActionList, type ListedAction } from "./ActionList"

/** Lo que ya hay cada día (por fecha ISO), y de dónde: «en SoftPre». */
export interface CalendarOccupancy {
  scope: string
  days: Record<string, ListedAction[]>
}

export interface CalendarValue {
  start: EpochDay | null
  end: EpochDay | null
}

interface PlanCalendarProps {
  /** Un día, o un periodo: el primer clic es el inicio y el segundo, el fin. */
  mode: "single" | "range"
  value: CalendarValue
  onChange: (value: CalendarValue) => void
  /** El mes que se ve al abrir; si no, el del inicio. */
  defaultMonth?: EpochDay
  numberOfMonths?: 1 | 2
  /** Los días con acciones llevan puntos del color de su tipo. */
  occupancy?: CalendarOccupancy
}

const NO_OCCUPANCY: CalendarOccupancy = { scope: "", days: {} }
// El día va fuera del componente para no remontarse en cada vista previa; lo que
// hay cada día le llega por contexto.
const OccupancyContext = createContext<CalendarOccupancy>(NO_OCCUPANCY)

const toDate = (day: EpochDay) => parseISO(toIsoDate(day))
const toDay = (date: Date) => fromIsoDate(toISODate(date))

/**
 * El calendario para elegir fechas, sobre el Calendar de shadcn: la navegación y
 * el mes en una sola línea, inicio y fin en el color principal y los días de en
 * medio teñidos. Al elegir el fin, el tramo se ve antes de pulsar.
 */
export function PlanCalendar({
  mode,
  value,
  onChange,
  defaultMonth,
  numberOfMonths = 1,
  occupancy = NO_OCCUPANCY,
}: Readonly<PlanCalendarProps>) {
  const [month, setMonth] = useState<Date>(() =>
    toDate(defaultMonth ?? value.start ?? fromIsoDate(toISODate(new Date())))
  )
  // El primer día de un periodo, mientras se elige el segundo, y por dónde va el ratón.
  const [picking, setPicking] = useState<EpochDay | null>(null)
  const [hovered, setHovered] = useState<EpochDay | null>(null)

  const preview =
    picking != null && hovered != null
      ? { start: Math.min(picking, hovered), end: Math.max(picking, hovered) }
      : value
  const from = preview.start
  const to = preview.end ?? preview.start

  const pick = (date: Date) => {
    const day = toDay(date)
    if (mode === "single") return onChange({ start: day, end: day })
    if (picking == null) {
      setPicking(day)
      return onChange({ start: day, end: day })
    }
    setPicking(null)
    setHovered(null)
    onChange({ start: Math.min(picking, day), end: Math.max(picking, day) })
  }

  const step = (delta: number) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))

  const days = (predicate: (day: EpochDay) => boolean) => (date: Date) => predicate(toDay(date))
  const modifiers =
    from == null
      ? {}
      : {
          start: days((day) => day === from && to !== from),
          end: days((day) => to != null && day === to && to !== from),
          single: days((day) => day === from && to === from),
          middle: days((day) => to != null && day > from && day < to),
        }

  return (
    <OccupancyContext value={occupancy}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Mes anterior"
            onClick={() => step(-1)}
          >
            <IconChevronLeft aria-hidden />
          </Button>
          <span className="text-muted-foreground text-sm">
            {mode === "single"
              ? "Elige el día"
              : picking != null
                ? "Elige el día de fin"
                : "Pulsa el inicio y el fin"}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Mes siguiente"
            onClick={() => step(1)}
          >
            <IconChevronRight aria-hidden />
          </Button>
        </div>
        <Calendar
          locale={es}
          weekStartsOn={1}
          showOutsideDays={false}
          hideNavigation
          month={month}
          onMonthChange={setMonth}
          numberOfMonths={numberOfMonths}
          onDayClick={pick}
          onDayMouseEnter={(date) => picking != null && setHovered(toDay(date))}
          modifiers={modifiers}
          formatters={{ formatCaption: (date) => format(date, "LLLL yyyy", { locale: es }) }}
          className="w-full bg-transparent p-0 [--cell-size:--spacing(8)]"
          classNames={{
            months: "flex gap-6",
            month: "flex flex-1 flex-col",
            month_grid: "w-full border-collapse",
            month_caption: "flex h-7 items-center justify-center first-letter:uppercase",
            caption_label: "text-sm font-semibold capitalize",
            weekday:
              "min-w-(--cell-size) flex-1 text-xs font-normal text-muted-foreground select-none",
            week: "mt-0.5 flex w-full",
            day: "relative min-w-(--cell-size) flex-1 p-0 text-center select-none",
            today: "",
          }}
          modifiersClassNames={{
            middle: "bg-primary/15",
            start: "bg-linear-to-r from-transparent from-50% to-primary/15 to-50%",
            end: "bg-linear-to-r from-primary/15 from-50% to-transparent to-50%",
          }}
          components={{ Root: PlanRoot, DayButton: PlanDay }}
        />
      </div>
    </OccupancyContext>
  )
}

// El de shadcn va en línea y remonta el calendario en cada render: con la vista
// previa del tramo, el clic caía en un botón ya desmontado.
const PlanRoot: CustomComponents["Root"] = ({ className, rootRef, ...props }) => (
  <div data-slot="calendar" ref={rootRef} className={className} {...props} />
)

// Un día: el número, inicio y fin en el color principal, hoy subrayado y, si
// hay acciones, hasta tres puntos con su color y un Tooltip con lo que hay.
function PlanDay({ day, modifiers, className, ...props }: React.ComponentProps<typeof DayButton>) {
  const occupancy = useContext(OccupancyContext)
  const busy = occupancy.days[toISODate(day.date)] ?? []
  const edge = modifiers.start || modifiers.end || modifiers.single
  const weekend = day.date.getDay() === 0 || day.date.getDay() === 6

  const button = (
    <button
      {...props}
      type="button"
      className={cn(
        "relative flex h-(--cell-size) w-full items-center justify-center text-sm tabular-nums outline-none",
        "focus-visible:ring-ring/50 rounded-lg focus-visible:ring-2",
        weekend && !edge && "text-muted-foreground",
        edge
          ? "text-primary-foreground before:bg-primary font-bold before:absolute before:inset-0.5 before:rounded-lg"
          : "hover:ring-primary hover:ring-1 hover:ring-inset",
        className
      )}
    >
      <span
        className={cn("relative", modifiers.today && !edge && "border-primary border-b-2 px-0.5")}
      >
        {day.date.getDate()}
      </span>
      {busy.length > 0 && (
        <span aria-hidden className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
          {busy.slice(0, 3).map((item) => (
            <span
              key={item.element.id}
              className={cn(
                "size-1 rounded-full",
                ACTION_BG[item.element.kind as ActionKind],
                edge && "ring-primary-foreground ring-1"
              )}
            />
          ))}
        </span>
      )}
    </button>
  )

  if (busy.length === 0) return button
  // Al pasar por encima, las acciones del día como en el menú de la celda; el
  // clic sigue siendo para elegir el día.
  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>{button}</HoverCardTrigger>
      <HoverCardContent side="bottom" className="w-[400px] p-1.5">
        <ActionList
          title={formatLongDate(toISODate(day.date))}
          subtitle={occupancy.scope ? `en ${occupancy.scope}` : ""}
          actions={busy}
        />
      </HoverCardContent>
    </HoverCard>
  )
}
