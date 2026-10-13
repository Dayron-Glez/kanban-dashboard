import { IconChevronDown } from "@tabler/icons-react"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/index"
import { CALENDAR_VIEWS, type CalendarView } from "../lib/calendarViews"

interface ViewSelectorProps {
  value: CalendarView
  onChange: (view: CalendarView) => void
}

/** Qué vista de calendario se ve. Las que aún no tienen datos dicen con qué llegan. */
export function ViewSelector({ value, onChange }: Readonly<ViewSelectorProps>) {
  const current = CALENDAR_VIEWS.find((view) => view.id === value)!

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Vista: ${current.label}`} className="h-8">
          <span className="text-base font-semibold">{current.label}</span>
          <IconChevronDown className="text-muted-foreground size-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as CalendarView)}
        >
          {CALENDAR_VIEWS.map((view) => (
            <DropdownMenuRadioItem
              key={view.id}
              value={view.id}
              disabled={view.pending != null}
              className="items-start py-2"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-medium">{view.label}</span>
                <span className="text-muted-foreground text-sm">{view.description}</span>
                {view.pending && <span className="text-warn text-sm">{view.pending}</span>}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
