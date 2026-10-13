import type { CSSProperties, ReactNode } from "react"
import { IconAnchor, IconChevronDown, IconLayoutBottombar, IconPin } from "@tabler/icons-react"
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ScrollArea,
  ScrollBar,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@/shared/index"
import { LEGEND_PARTS, toggleAllParts, type GanttLegend } from "../lib/ganttLegend"

interface LegendMenuProps {
  value: GanttLegend
  onChange: (legend: GanttLegend) => void
}

/** «Leyenda»: un clic la muestra u oculta entera; ▾ elige qué partes se ven. */
export function LegendMenu({ value, onChange }: Readonly<LegendMenuProps>) {
  const all = LEGEND_PARTS.every((part) => value[part.key])
  return (
    <div className="flex">
      <Button
        variant="outline"
        size="sm"
        aria-pressed={value.visible}
        onClick={() => onChange({ ...value, visible: !value.visible })}
        className={cn("h-8 rounded-r-none text-sm", !value.visible && "text-muted-foreground")}
      >
        <IconLayoutBottombar className="size-3.5" aria-hidden />
        Leyenda
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Qué partes de la leyenda se ven"
            className="h-8 rounded-l-none border-l-0 px-2"
          >
            <IconChevronDown className="size-3.5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuCheckboxItem
            checked={all}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => onChange(toggleAllParts(value))}
            className="font-medium"
          >
            Ver todo
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {LEGEND_PARTS.map((part) => (
            <DropdownMenuCheckboxItem
              key={part.key}
              checked={value[part.key]}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => onChange({ ...value, [part.key]: checked })}
            >
              {part.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

const Swatch = ({ className, style }: { className?: string; style?: CSSProperties }) => (
  <span
    aria-hidden
    className={cn("inline-block shrink-0 rounded-[3px]", className)}
    style={style}
  />
)

// Cada pieza en una caja de 20 px centrada: muestra y texto comparten línea.
function Item({ children, hint }: Readonly<{ children: ReactNode; hint?: string }>) {
  const item = <span className="inline-flex h-5 items-center gap-1.5 leading-none">{children}</span>
  if (!hint) return item
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex h-5 cursor-help items-center gap-1.5 leading-none"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )
}

interface GanttLegendProps {
  legend: GanttLegend
}

/**
 * La leyenda del Gantt, en una línea: las marcas del tiempo y los tipos de
 * barra. Los colores de las fases no van: cada fila ya lleva el suyo.
 */
export function GanttLegendStrip({ legend }: Readonly<GanttLegendProps>) {
  if (!legend.visible) return null
  const time = legend.today || legend.week1 || legend.weekends
  const shapes = legend.bars || legend.marks

  return (
    <ScrollArea
      role="note"
      aria-label="Leyenda"
      className="border-border bg-card/40 text-muted-foreground shrink-0 rounded-lg border text-sm"
    >
      <div className="flex h-[34px] items-center gap-3.5 px-3.5 whitespace-nowrap">
        {!time && !shapes && <span>Leyenda vacía: elige qué ver en ▾</span>}
        {legend.today && (
          <Item>
            <Swatch className="bg-primary h-3.5 w-0.5 rounded-none" />
            Hoy
          </Item>
        )}
        {legend.week1 && (
          <Item hint="La semana en la que empieza el rodaje: de ahí se cuentan las demás">
            <Swatch className="bg-primary/45 h-3.5 w-0.5 rounded-none" />
            Semana 1
          </Item>
        )}
        {legend.weekends && (
          <Item>
            <Swatch
              className="border-border size-3 border"
              style={{ background: "var(--weekend)" }}
            />
            Fin de semana
          </Item>
        )}
        {time && shapes && <span aria-hidden className="bg-border h-3.5 w-px shrink-0" />}
        {legend.bars && (
          <>
            <Item>
              <Swatch className="bg-muted-foreground h-3 w-5" />
              Fase
            </Item>
            <Item>
              <Swatch className="bg-muted-foreground/60 h-2 w-5" />
              Subfase o proceso
            </Item>
            <Item hint="Tiene inicio, pero aún no se sabe cuándo acaba">
              <span
                aria-hidden
                className="border-muted-foreground size-2.5 rounded-full border-2"
              />
              Sin fin
            </Item>
          </>
        )}
        {legend.marks && (
          <>
            <Item hint="La fecha que se escribe a mano: de ella se calcula todo el plan">
              <span className="bg-primary/10 text-primary inline-flex h-5 items-center gap-1 rounded-full px-2 font-medium">
                <IconAnchor size={11} aria-hidden />
                clave
              </span>
              de ella sale el plan
            </Item>
            <Item hint="Su fecha se escribe a mano y no cambia cuando se mueve el plan">
              <span className="bg-muted inline-flex h-5 items-center gap-1 rounded-full px-2 font-medium">
                <IconPin size={11} aria-hidden />
                fija
              </span>
              no se mueve
            </Item>
          </>
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
