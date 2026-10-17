import { useState, type ReactNode } from "react"
import { IconSearch, IconX, type Icon } from "@tabler/icons-react"
import {
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from "@/shared/index"
import { FIELD_SURFACE } from "../fieldStyle"

export interface PickOption {
  id: string
  label: string
  /** A la derecha, como el departamento de una persona. */
  hint?: string
}

/** Lo que se ofrece siempre al pie de la lista, como añadir a alguien al equipo. */
export interface PickAction {
  icon: Icon
  label: (query: string) => string
  onSelect: (query: string) => void
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("")

interface ChipProps {
  label: string
  /** Lo que sale en gris tras el nombre, como el email de alguien de fuera. */
  detail?: string
  variant?: "person" | "department" | "external"
  icon?: Icon
  onRemove?: () => void
}

/** Alguien o algo ya elegido, con su botón para quitarlo. */
export function Chip({
  label,
  detail,
  variant = "person",
  icon: ChipIcon,
  onRemove,
}: Readonly<ChipProps>) {
  return (
    <span
      className={cn(
        "border-border bg-card inline-flex h-6.5 max-w-full items-center gap-1.5 border pr-1.5 text-sm",
        variant === "department" ? "rounded-md pl-2" : "rounded-full pl-1",
        variant === "external" && "border-dashed"
      )}
    >
      {variant !== "department" && (
        <span
          aria-hidden
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold",
            variant === "external" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
          )}
        >
          {ChipIcon ? <ChipIcon size={12} /> : initials(label)}
        </span>
      )}
      <span className="truncate">{label}</span>
      {detail && <span className="text-muted-foreground truncate">{detail}</span>}
      {onRemove && (
        <button
          type="button"
          aria-label={variant === "department" ? `Quitar ${label}` : `Quitar a ${label}`}
          className="text-muted-foreground hover:text-foreground shrink-0 rounded-full"
          onClick={onRemove}
        >
          <IconX size={13} aria-hidden />
        </button>
      )}
    </span>
  )
}

interface PeoplePickerProps {
  id: string
  /** El nombre del campo, para quien lee la pantalla. */
  label: string
  options: PickOption[]
  /** El encabezado de las opciones, como «Equipo». */
  group: string
  placeholder: string
  empty: string
  chips: ReactNode
  actions?: PickAction[]
  invalid?: boolean
  onPick: (id: string) => void
}

/**
 * Un campo con lo elegido como fichas y un buscador para añadir más: se escribe
 * para filtrar, ↑ ↓ y Enter. Al pie, siempre, las acciones.
 */
export function PeoplePicker({
  id,
  label,
  options,
  group,
  placeholder,
  empty,
  chips,
  actions = [],
  invalid = false,
  onPick,
}: Readonly<PeoplePickerProps>) {
  const [open, setOpen] = useState<boolean>(false)
  const [query, setQuery] = useState<string>("")
  const close = () => {
    setOpen(false)
    setQuery("")
  }

  return (
    <div
      aria-invalid={invalid}
      className={cn(
        FIELD_SURFACE,
        "flex min-h-10 flex-wrap items-center gap-1.5 border px-3 py-1.5",
        invalid && "border-destructive"
      )}
    >
      {chips}
      <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-label={label}
            className="text-muted-foreground flex min-w-32 flex-1 items-center gap-2 text-left outline-none"
          >
            <IconSearch size={15} aria-hidden />
            {placeholder}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command>
            <CommandInput placeholder="Buscar…" value={query} onValueChange={setQuery} />
            <ScrollArea className="max-h-72 [&>[data-slot=scroll-area-viewport]]:max-h-[inherit]">
              <CommandList className="max-h-none overflow-visible">
                <CommandEmpty>{empty}</CommandEmpty>
                {options.length > 0 && (
                  <CommandGroup heading={group}>
                    {options.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={`${option.label} ${option.id}`}
                        onSelect={() => {
                          onPick(option.id)
                          close()
                        }}
                      >
                        <span className="truncate">{option.label}</span>
                        {option.hint && (
                          <span className="text-muted-foreground ml-auto shrink-0 text-sm">
                            {option.hint}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {actions.length > 0 && (
                  <>
                    <CommandSeparator alwaysRender />
                    <CommandGroup forceMount>
                      {actions.map((action) => (
                        <CommandItem
                          key={action.label("")}
                          forceMount
                          value={action.label("")}
                          className="text-primary"
                          onSelect={() => {
                            action.onSelect(query.trim())
                            close()
                          }}
                        >
                          <action.icon aria-hidden />
                          {action.label(query.trim())}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
