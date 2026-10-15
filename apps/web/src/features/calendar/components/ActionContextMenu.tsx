import type { ReactNode } from "react"
import { ACTION_KINDS, type ActionKind, type CalendarElement } from "@repo/contracts"
import { fromIsoDate } from "@repo/domain"
import { IconLayoutSidebarRight, IconSwitchHorizontal, IconTrash } from "@tabler/icons-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/shared/index"
import { ELEMENT_KIND_LABELS } from "../lib/elementTree"
import { formatShortDay } from "../lib/planFormat"
import { ActionGlyph } from "./ActionGlyph"

/** Lo que se puede hacer con una acción desde su menú: cambiarla de tipo y borrarla. */
export interface ActionMenuHandlers {
  onChangeKind: (elementId: string, kind: ActionKind) => void
  onDelete: (elementId: string) => void
}

interface ActionContextMenuProps {
  action: CalendarElement
  onOpen: () => void
  /** Sin ellos (un miembro, o con un cambio guardándose), solo se puede abrir. */
  handlers?: ActionMenuHandlers
  children: ReactNode
}

const day = (iso: string) => formatShortDay(fromIsoDate(iso))

/**
 * El clic derecho (o la tecla de menú) sobre una acción del Gantt: abrirla,
 * cambiarla de tipo y, aparte y en rojo, borrarla, que pide confirmación.
 */
export function ActionContextMenu({
  action,
  onOpen,
  handlers,
  children,
}: Readonly<ActionContextMenuProps>) {
  const kind = action.kind as ActionKind
  const when =
    action.startsOn &&
    (action.endsOn && action.endsOn !== action.startsOn
      ? `${day(action.startsOn)} → ${day(action.endsOn)}`
      : day(action.startsOn))

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <ContextMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-semibold">{action.name}</span>
          <span className="text-muted-foreground text-xs font-normal">
            {[ELEMENT_KIND_LABELS[kind], when].filter(Boolean).join(" · ")}
          </span>
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onOpen}>
          <IconLayoutSidebarRight aria-hidden />
          Abrir el detalle
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
        {handlers && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <IconSwitchHorizontal aria-hidden />
                Cambiar a
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-44">
                {ACTION_KINDS.filter((option) => option !== kind).map((option) => (
                  <ContextMenuItem
                    key={option}
                    onSelect={() => handlers.onChangeKind(action.id, option)}
                  >
                    <ActionGlyph kind={option} />
                    {ELEMENT_KIND_LABELS[option]}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onSelect={() => handlers.onDelete(action.id)}>
              <IconTrash aria-hidden />
              Borrar…
              <ContextMenuShortcut>Supr</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
