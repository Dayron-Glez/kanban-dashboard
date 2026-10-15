import { useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import type { CalendarElement } from "@repo/contracts"
import {
  Button,
  cn,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from "@/shared/index"
import type { PhaseTint } from "../lib/phaseColors"
import { TruncatedText } from "./TruncatedText"

/** Un elemento que se puede elegir: sangrado por su nivel y con el color de su fase. */
export interface PickerOption {
  element: CalendarElement
  depth: number
  tint: PhaseTint
  /** Una nota a la derecha, como «en curso». */
  hint?: string
}

// El color de su fase: una barrita en las fases, un punto en lo demás.
function Mark({ option }: Readonly<{ option: PickerOption }>) {
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 rounded-full",
        option.depth === 0 ? "h-3 w-1" : "size-1.5",
        option.tint.className
      )}
      style={option.tint.style}
    />
  )
}

interface ElementPickerListProps {
  options: PickerOption[]
  onSelect: (elementId: string) => void
  className?: string
}

/**
 * El buscador de elementos: se escribe para filtrar y la lista se desplaza con un
 * ScrollArea cuando son muchos.
 */
export function ElementPickerList({
  options,
  onSelect,
  className,
}: Readonly<ElementPickerListProps>) {
  return (
    <Command className={className}>
      <CommandInput placeholder="Buscar un elemento…" />
      {/* El viewport hereda el alto máximo: así el ScrollArea desplaza la lista. */}
      <ScrollArea className="max-h-72 [&>[data-slot=scroll-area-viewport]]:max-h-[inherit]">
        <CommandList className="max-h-none overflow-visible">
          <CommandEmpty>No hay ninguno con ese nombre.</CommandEmpty>
          {options.map((option) => (
            <CommandItem
              key={option.element.id}
              value={`${option.element.name} ${option.element.id}`}
              onSelect={() => onSelect(option.element.id)}
            >
              <span
                className="flex min-w-0 flex-1 items-center gap-2"
                style={{ paddingLeft: option.depth * 12 }}
              >
                <Mark option={option} />
                <TruncatedText
                  text={option.element.name}
                  className={cn(option.depth === 0 && "font-semibold")}
                />
              </span>
              {option.hint && (
                <span className="text-muted-foreground shrink-0 text-xs">{option.hint}</span>
              )}
            </CommandItem>
          ))}
        </CommandList>
      </ScrollArea>
    </Command>
  )
}

interface ElementPickerProps {
  label: string
  options: PickerOption[]
  value: string | null
  onChange: (elementId: string) => void
  /** Lo que dice mientras no hay nada elegido. */
  placeholder: string
}

/** Un campo para elegir un elemento: un botón con el elegido que abre el buscador. */
export function ElementPicker({
  label,
  options,
  value,
  onChange,
  placeholder,
}: Readonly<ElementPickerProps>) {
  const [open, setOpen] = useState<boolean>(false)
  const selected = options.find((option) => option.element.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label={label} className="w-full justify-between font-normal">
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <Mark option={selected} />
              <TruncatedText text={selected.element.name} />
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <IconChevronDown className="opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <ElementPickerList
          options={options}
          onSelect={(id) => {
            onChange(id)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
