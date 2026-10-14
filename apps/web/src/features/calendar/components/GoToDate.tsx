import { useState } from "react"
import { fromIsoDate, toISODate, toIsoDate, type EpochDay } from "@repo/domain"
import { IconCalendarSearch, IconPointFilled } from "@tabler/icons-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/index"

const THIS_YEAR = new Date().getFullYear()

interface GoToDateProps {
  /** Saltos habituales: el inicio del rodaje, el del plan… */
  shortcuts: { label: string; day: EpochDay }[]
  today: EpochDay
  onGo: (day: EpochDay) => void
}

/**
 * Moverse en el tiempo, en un solo control: «Hoy», lo más usado, con texto; y el
 * calendario para ir a cualquier otro día, solo icono con su tooltip.
 */
export function GoToDate({ shortcuts, today, onGo }: Readonly<GoToDateProps>) {
  const [open, setOpen] = useState<boolean>(false)
  const go = (day: EpochDay) => {
    onGo(day)
    setOpen(false)
  }

  return (
    <div className="flex">
      <Button
        variant="outline"
        size="sm"
        className="text-primary h-8 rounded-r-none text-sm"
        onClick={() => onGo(today)}
      >
        <IconPointFilled className="size-3.5" aria-hidden />
        Hoy
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Ir a fecha"
                className="text-muted-foreground h-8 rounded-l-none border-l-0 px-2.5"
              >
                <IconCalendarSearch className="size-4" aria-hidden />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Ir a fecha</TooltipContent>
        </Tooltip>
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
                  className="h-7 text-sm"
                  onClick={() => go(shortcut.day)}
                >
                  {shortcut.label}
                </Button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
