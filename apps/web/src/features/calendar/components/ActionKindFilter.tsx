import type { CSSProperties, MouseEvent } from "react"
import { IconEyeOff } from "@tabler/icons-react"
import { ACTION_KINDS, type ActionKind } from "@repo/contracts"
import { Toggle, Tooltip, TooltipContent, TooltipTrigger, cn } from "@/shared/index"
import { soloKind, toggleKind } from "../lib/actionFilter"
import { ELEMENT_KIND_LABELS } from "../lib/elementTree"
import { ActionGlyph } from "./ActionGlyph"

interface ActionKindFilterProps {
  counts: Record<ActionKind, number>
  hidden: readonly ActionKind[]
  onChange: (hidden: ActionKind[]) => void
}

/**
 * Sobre el Gantt, un botón por tipo de acción: clic oculta o muestra el tipo, y
 * Alt+clic o doble clic deja solo ese. Si algo está oculto, se dice.
 */
export function ActionKindFilter({ counts, hidden, onChange }: Readonly<ActionKindFilterProps>) {
  const total = ACTION_KINDS.reduce((sum, kind) => sum + counts[kind], 0)
  const shown = ACTION_KINDS.reduce(
    (sum, kind) => sum + (hidden.includes(kind) ? 0 : counts[kind]),
    0
  )

  // El doble clic llega tras un clic que ya ha cambiado el tipo: deja solo ese igualmente.
  const onClick = (kind: ActionKind) => (event: MouseEvent) => {
    event.preventDefault()
    const solo = event.altKey || event.detail === 2
    onChange(solo ? soloKind(hidden, kind) : toggleKind(hidden, kind))
  }

  return (
    <div
      role="group"
      aria-label="Tipos de acción que se ven"
      className="flex shrink-0 flex-wrap items-center gap-1.5 text-sm"
    >
      <span className="text-muted-foreground mr-1">Acciones</span>
      {ACTION_KINDS.map((kind) => {
        const visible = !hidden.includes(kind)
        const label = ELEMENT_KIND_LABELS[kind]
        return (
          <Tooltip key={kind}>
            <TooltipTrigger asChild>
              <Toggle
                pressed={visible}
                onClick={onClick(kind)}
                aria-label={`${label}: ${counts[kind]}`}
                style={{ "--kind": `var(--action-${kind})` } as CSSProperties}
                className={cn(
                  "h-7 min-w-0 gap-1.5 rounded-full border px-2.5 pl-2 text-sm select-none hover:text-current",
                  "data-[state=on]:text-foreground data-[state=on]:border-[color-mix(in_oklch,var(--kind)_35%,transparent)] data-[state=on]:bg-[color-mix(in_oklch,var(--kind)_12%,transparent)]",
                  "data-[state=on]:hover:bg-[color-mix(in_oklch,var(--kind)_20%,transparent)]",
                  "data-[state=off]:text-muted-foreground/70 data-[state=off]:border-border data-[state=off]:border-dashed"
                )}
              >
                <ActionGlyph kind={kind} className={cn("size-3.5", !visible && "text-current")} />
                <span className={cn(!visible && "line-through")}>{label}</span>
                {visible ? (
                  <span className="text-muted-foreground tabular-nums">{counts[kind]}</span>
                ) : (
                  <IconEyeOff aria-hidden className="size-3.5" />
                )}
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              {visible ? "Ocultar" : "Mostrar"} · Alt+clic: solo {label.toLowerCase()}
            </TooltipContent>
          </Tooltip>
        )
      })}
      {hidden.length > 0 && (
        <span className="text-muted-foreground ml-1.5 tabular-nums">
          Se ven {shown} de {total} ·{" "}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-primary font-medium hover:underline"
          >
            Mostrar todas
          </button>
        </span>
      )}
    </div>
  )
}
