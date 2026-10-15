import type { ActionKind, CalendarElement } from "@repo/contracts"
import { cn } from "@/shared/index"
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
  /** Sin él, la lista solo informa: en el calendario, un clic elige el día. */
  onOpen?: (elementId: string) => void
}

/** Las acciones de unas celdas: la del menú de la celda y la del calendario. */
export function ActionList({ title, subtitle, actions, onOpen }: Readonly<ActionListProps>) {
  const rowClass = "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm"

  return (
    <>
      <div className="px-2 pt-1 pb-2">
        <p className="text-base font-semibold first-letter:uppercase">{title}</p>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
      <div
        role={onOpen ? "menu" : "list"}
        aria-label="Acciones de la celda"
        className="border-border flex flex-col border-t pt-1"
      >
        {actions.map(({ element, owner }) => {
          const content = (
            <>
              <span className="text-muted-foreground flex w-[18px] justify-center">
                <ActionGlyph kind={element.kind as ActionKind} />
              </span>
              <TruncatedText text={element.name} />
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                {lacksDuration(element) && <MissingDurationHint />}
                <span className="text-muted-foreground text-xs">
                  {owner ?? ELEMENT_KIND_LABELS[element.kind]}
                </span>
              </span>
            </>
          )
          return onOpen ? (
            <button
              key={element.id}
              type="button"
              role="menuitem"
              onClick={() => onOpen(element.id)}
              className={cn(rowClass, "hover:bg-muted focus-visible:bg-muted outline-none")}
            >
              {content}
            </button>
          ) : (
            <div key={element.id} role="listitem" className={rowClass}>
              {content}
            </div>
          )
        })}
      </div>
    </>
  )
}
