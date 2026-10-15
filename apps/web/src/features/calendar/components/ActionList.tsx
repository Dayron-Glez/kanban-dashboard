import type { ActionKind, CalendarElement } from "@repo/contracts"
import { IconCalendarEvent, IconTrash } from "@tabler/icons-react"
import { cn, ScrollArea } from "@/shared/index"
import { ELEMENT_KIND_LABELS, lacksDuration } from "../lib/elementTree"
import { ActionGlyph } from "./ActionGlyph"
import { MissingDurationHint } from "./MissingDurationHint"
import { TruncatedText } from "./TruncatedText"

/** Una acción en la lista; `owner`, de qué cuelga si no es de donde se mira. */
export interface ListedAction {
  element: CalendarElement
  owner: string | null
}

interface ActionListProps {
  /** El día o el periodo, y dónde: «en SoftPre». */
  title: string
  subtitle: string
  actions: ListedAction[]
  /** Sin él, la lista solo informa. */
  onOpen?: (elementId: string) => void
  /** Ver el día completo, en su panel. */
  onOpenDay?: () => void
  /** Borrar una sin abrirla: una papelera en cada fila, al pasar o con el foco. */
  onDelete?: (elementId: string) => void
}

/** «Ver el día completo»: lo mismo en el menú de la celda y en el calendario. */
export function DayLink({
  onClick,
  shortcut,
}: Readonly<{ onClick: () => void; shortcut?: string }>) {
  return (
    <div className="border-border mt-1 border-t pt-1">
      <button
        type="button"
        onClick={onClick}
        className="hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none"
      >
        <IconCalendarEvent className="text-muted-foreground size-3.5" aria-hidden />
        Ver el día completo
        {shortcut && (
          <kbd className="text-muted-foreground border-border ml-auto rounded border px-1 text-[10px]">
            {shortcut}
          </kbd>
        )}
      </button>
    </div>
  )
}

/**
 * Las acciones de unas celdas: la del menú de la celda y la del calendario. Se
 * ven cinco a la vez; con más, la lista se desplaza.
 */
export function ActionList({
  title,
  subtitle,
  actions,
  onOpen,
  onOpenDay,
  onDelete,
}: Readonly<ActionListProps>) {
  const rowClass = "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm"

  return (
    <>
      <div className="px-2 pt-1 pb-2">
        <p className="text-base font-semibold first-letter:uppercase">{title}</p>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
      {/* El contenido de un ScrollArea es una tabla y crece con lo que lleva: en bloque,
          la fila no pasa del ancho de la lista y la papelera no queda fuera. */}
      <ScrollArea className="border-border max-h-[164px] border-t [&>[data-slot=scroll-area-viewport]]:max-h-[inherit] [&>[data-slot=scroll-area-viewport]>div]:!block">
        <div
          role={onOpen ? "menu" : "list"}
          aria-label="Acciones de la celda"
          className="flex flex-col pt-1"
        >
          {actions.map(({ element, owner }) => {
            const content = (
              <>
                <span className="text-muted-foreground flex w-[18px] shrink-0 justify-center">
                  <ActionGlyph kind={element.kind as ActionKind} />
                </span>
                <TruncatedText text={element.name} />
                <span className="ml-auto flex max-w-[50%] min-w-0 items-center gap-1.5">
                  {lacksDuration(element) && <MissingDurationHint />}
                  <span className="text-muted-foreground truncate text-xs">
                    {owner ?? ELEMENT_KIND_LABELS[element.kind]}
                  </span>
                </span>
              </>
            )
            return onOpen ? (
              // La fila se resalta entera, y la papelera va al lado del botón que la
              // abre: un botón no puede ir dentro de otro.
              <div
                key={element.id}
                className="group/row hover:bg-muted focus-within:bg-muted flex items-center rounded-md"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => onOpen(element.id)}
                  className={cn(rowClass, "min-w-0 flex-1 outline-none")}
                >
                  {content}
                </button>
                {onDelete && (
                  <button
                    type="button"
                    aria-label={`Borrar ${element.name}`}
                    title="Borrar"
                    onClick={() => onDelete(element.id)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:text-destructive mr-1 flex size-7 shrink-0 items-center justify-center rounded-md opacity-0 outline-none group-focus-within/row:opacity-100 group-hover/row:opacity-100 focus-visible:opacity-100"
                  >
                    <IconTrash className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            ) : (
              <div key={element.id} role="listitem" className={rowClass}>
                {content}
              </div>
            )
          })}
        </div>
      </ScrollArea>
      {onOpenDay && <DayLink onClick={onOpenDay} />}
    </>
  )
}
