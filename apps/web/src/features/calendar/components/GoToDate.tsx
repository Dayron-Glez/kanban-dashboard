import { useState } from "react"
import { fromIsoDate, toISODate, toIsoDate, type EpochDay } from "@repo/domain"
import { IconCalendarSearch } from "@tabler/icons-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from "@/shared/index"

const THIS_YEAR = new Date().getFullYear()

interface GoToDateProps {
  /** Saltos habituales: el inicio del rodaje, el del plan… */
  shortcuts: { label: string; day: EpochDay }[]
  onGo: (day: EpochDay) => void
}

/** «Ir a fecha»: lleva el Gantt a un día elegido en el calendario o a uno habitual. */
export function GoToDate({ shortcuts, onGo }: Readonly<GoToDateProps>) {
  const [open, setOpen] = useState<boolean>(false)
  const go = (day: EpochDay) => {
    onGo(day)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-muted-foreground h-8 text-xs">
          <IconCalendarSearch className="size-3.5" aria-hidden />
          Ir a fecha
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={es}
          captionLayout="dropdown"
          startMonth={new Date(THIS_YEAR - 10, 0)}
          endMonth={new Date(THIS_YEAR + 15, 11)}
          formatters={{ formatMonthDropdown: (date) => format(date, "LLL", { locale: es }) }}
          onSelect={(date) => date && go(fromIsoDate(toISODate(date)))}
          defaultMonth={shortcuts[0] ? parseISO(toIsoDate(shortcuts[0].day)) : undefined}
        />
        {shortcuts.length > 0 && (
          <div className="border-border flex flex-wrap gap-1.5 border-t p-2">
            {shortcuts.map((shortcut) => (
              <Button
                key={shortcut.label}
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => go(shortcut.day)}
              >
                {shortcut.label}
              </Button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
