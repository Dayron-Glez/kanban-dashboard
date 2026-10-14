import type { CSSProperties, ReactNode } from "react"
import { IconAnchor, IconPin } from "@tabler/icons-react"
import { ScrollArea, ScrollBar, Tooltip, TooltipContent, TooltipTrigger, cn } from "@/shared/index"
import { ACTION_KINDS } from "@repo/contracts"
import { ELEMENT_KIND_LABELS } from "../lib/elementTree"
import type { GanttLegend } from "../lib/ganttLegend"
import { phaseTint } from "../lib/phaseColors"
import { ActionGlyph } from "./ActionGlyph"

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

// Las muestras de barra, con el gris neutro: no son de ninguna fase.
const neutral = (isPhase: boolean) => phaseTint(null, isPhase)

interface GanttLegendProps {
  legend: GanttLegend
}

/**
 * La leyenda del Gantt, en una línea: las marcas del tiempo, los tipos de
 * barra y los tipos de acción. Los colores de las fases no van: cada fila ya lleva el suyo.
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
        {!time && !shapes && !legend.actions && <span>Leyenda vacía: elige qué ver en ▾</span>}
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
              <Swatch
                className={cn("h-3 w-5", neutral(true).className)}
                style={neutral(true).style}
              />
              Fase
            </Item>
            <Item>
              <Swatch
                className={cn("h-2 w-5", neutral(false).className)}
                style={neutral(false).style}
              />
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
        {legend.actions && (time || shapes) && (
          <span aria-hidden className="bg-border h-3.5 w-px shrink-0" />
        )}
        {legend.actions &&
          ACTION_KINDS.map((kind) => (
            <Item key={kind}>
              <ActionGlyph kind={kind} className="size-3.5" />
              {ELEMENT_KIND_LABELS[kind]}
            </Item>
          ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
