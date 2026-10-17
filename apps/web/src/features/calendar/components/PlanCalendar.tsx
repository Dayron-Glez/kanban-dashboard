import { createContext, useContext, useState } from "react"
import type { ActionKind } from "@repo/contracts"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { fromIsoDate, toISODate, toIsoDate, type EpochDay } from "@repo/domain"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { CustomComponents, DayButton } from "react-day-picker"
import {
  Button,
  Calendar,
  cn,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/index"
import { ACTION_BG } from "../lib/actionStyle"
import { formatLongDate } from "../lib/planFormat"
import { today } from "../lib/today"
import { ActionList, type ListedAction } from "./ActionList"

/** Lo que ya hay cada día (por fecha ISO), y de dónde: «en SoftPre». */
export interface CalendarOccupancy {
  /** La fase: su id, para abrir el día desde ella, y su nombre. */
  scopeId?: string
  scope: string
  days: Record<string, ListedAction[]>
}

export interface CalendarValue {
  start: EpochDay | null
  end: EpochDay | null
}

interface PlanCalendarProps {
  /** Un día, o un periodo: el primer clic es el inicio (con el fin a null) y el segundo, el fin. */
  mode: "single" | "range"
  value: CalendarValue
  onChange: (value: CalendarValue) => void
  /** El mes que se ve al abrir; si no, el del inicio. */
  defaultMonth?: EpochDay
  numberOfMonths?: 1 | 2
  /** Los días con acciones llevan puntos del color de su tipo. */
  occupancy?: CalendarOccupancy
  /** Desde la lista de un día: abrir una de sus acciones, o el día entero. */
  onOpenAction?: (elementId: string) => void
  onOpenDay?: (day: EpochDay) => void
  /** Los días que se pueden elegir: los del Gantt, y nunca antes de hoy. Fuera, desactivados. */
  bounds?: { start: EpochDay; end: EpochDay }
}

const NO_OCCUPANCY: CalendarOccupancy = { scope: "", days: {} }
// El día va fuera del componente para no remontarse en cada vista previa; lo que
// hay cada día, y qué hacer desde su lista, le llega por contexto.
const OccupancyContext = createContext<{
  occupancy: CalendarOccupancy
  onOpenAction?: (elementId: string) => void
  onOpenDay?: (day: EpochDay) => void
}>({ occupancy: NO_OCCUPANCY })

const MONTHS = Array.from({ length: 12 }, (_, index) =>
  format(new Date(2026, index, 1), "LLLL", { locale: es })
)
const THIS_YEAR = new Date().getFullYear()

const toDate = (day: EpochDay) => parseISO(toIsoDate(day))
const toDay = (date: Date) => fromIsoDate(toISODate(date))
// Los meses como un número seguido, para compararlos y moverse entre ellos.
const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth()
const fromIndex = (index: number) => new Date(Math.floor(index / 12), index % 12, 1)

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
  onOpenAction,
  onOpenDay,
  bounds,
}: Readonly<PlanCalendarProps>) {
  // El primer mes que se puede ver y el último en que puede empezar la vista: con
  // dos meses, el anterior al del fin.
  // No se planifica hacia atrás: el primer día que se puede elegir es hoy.
  const now = today()
  const firstDay = Math.max(now, bounds?.start ?? now)
  const first = monthIndex(toDate(firstDay))
  const last = bounds
    ? Math.max(first, monthIndex(toDate(bounds.end)) - numberOfMonths + 1)
    : Infinity
  const clamp = (index: number) => fromIndex(Math.min(last, Math.max(first, index)))

  const [month, setMonthState] = useState<Date>(() =>
    clamp(monthIndex(toDate(defaultMonth ?? value.start ?? fromIsoDate(toISODate(new Date())))))
  )
  const setMonth = (date: Date) => setMonthState(clamp(monthIndex(date)))
  const current = monthIndex(month)
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
      // Solo el inicio: quien lo usa decide el fin (conservar lo que dura, por ejemplo).
      return onChange({ start: day, end: null })
    }
    setPicking(null)
    setHovered(null)
    onChange({ start: Math.min(picking, day), end: Math.max(picking, day) })
  }

  // Los años del selector: de hoy al fin del plan o, sin él, quince adelante.
  const firstYear = toDate(firstDay).getFullYear()
  const lastYear = bounds ? toDate(bounds.end).getFullYear() : THIS_YEAR + 15
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index)

  // Un mes del selector sin ningún día del plan.
  const outside = (index: number) =>
    index < first || (bounds != null && index > monthIndex(toDate(bounds.end)))

  const step = (delta: number) => setMonth(fromIndex(current + delta))

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

  const nextMonth = (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Mes siguiente"
      disabled={current >= last}
      onClick={() => step(1)}
    >
      <IconChevronRight aria-hidden />
    </Button>
  )

  return (
    <OccupancyContext value={{ occupancy, onOpenAction, onOpenDay }}>
      <div className="flex flex-col gap-2">
        {/* La navegación va en la línea de los títulos: con dos meses, los selectores
            sobre el primero y el nombre del segundo sobre el suyo. */}
        <div className={cn("grid items-center gap-6", numberOfMonths === 2 && "grid-cols-2")}>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Mes anterior"
              disabled={current <= first}
              onClick={() => step(-1)}
            >
              <IconChevronLeft aria-hidden />
            </Button>
            <div className="flex items-center gap-1.5">
              <Select
                value={String(month.getMonth())}
                onValueChange={(next) => setMonth(new Date(month.getFullYear(), Number(next), 1))}
              >
                <SelectTrigger size="sm" aria-label="Mes" className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, index) => (
                    <SelectItem
                      key={name}
                      value={String(index)}
                      disabled={outside(month.getFullYear() * 12 + index)}
                      className="capitalize"
                    >
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(month.getFullYear())}
                onValueChange={(next) => setMonth(new Date(Number(next), month.getMonth(), 1))}
              >
                <SelectTrigger size="sm" aria-label="Año">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {numberOfMonths === 1 ? nextMonth : <span className="size-8" aria-hidden />}
          </div>
          {numberOfMonths === 2 && (
            <div className="flex items-center justify-between gap-2">
              <span className="size-8" aria-hidden />
              <span aria-hidden className="text-sm font-semibold capitalize">
                {format(fromIndex(current + 1), "LLLL yyyy", { locale: es })}
              </span>
              {nextMonth}
            </div>
          )}
        </div>
        <Calendar
          locale={es}
          weekStartsOn={1}
          showOutsideDays={false}
          hideNavigation
          month={month}
          onMonthChange={setMonth}
          numberOfMonths={numberOfMonths}
          disabled={[
            { before: toDate(firstDay) },
            ...(bounds ? [{ after: toDate(bounds.end) }] : []),
          ]}
          onDayClick={pick}
          onDayMouseEnter={(date) => picking != null && setHovered(toDay(date))}
          modifiers={modifiers}
          formatters={{ formatCaption: (date) => format(date, "LLLL yyyy", { locale: es }) }}
          className="w-full bg-transparent p-0 [--cell-size:--spacing(8)]"
          classNames={{
            months: "flex gap-6",
            month: "flex flex-1 flex-col",
            month_grid: "w-full border-collapse",
            // Lo dice la línea de arriba; aquí queda para quien lee la pantalla.
            month_caption: "sr-only",
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
// hay acciones, hasta tres puntos con su color y, al pasar por encima, la lista de lo que hay.
function PlanDay({ day, modifiers, className, ...props }: React.ComponentProps<typeof DayButton>) {
  const { occupancy, onOpenAction, onOpenDay } = useContext(OccupancyContext)
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
          : !modifiers.disabled && "hover:ring-primary hover:ring-1 hover:ring-inset",
        // Antes de hoy, o fuera del plan, donde el Gantt no llega.
        modifiers.disabled && "cursor-not-allowed opacity-30",
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
          onOpen={onOpenAction}
          onOpenDay={onOpenDay && (() => onOpenDay(toDay(day.date)))}
        />
      </HoverCardContent>
    </HoverCard>
  )
}
