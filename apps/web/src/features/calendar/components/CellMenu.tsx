import { useState, type FormEvent, type KeyboardEvent } from "react"
import {
  ACTION_KINDS,
  SINGLE_DAY_ACTION_KINDS,
  type ActionKind,
  type CreateActionInput,
} from "@repo/contracts"
import { toIsoDate } from "@repo/domain"
import { IconPlus } from "@tabler/icons-react"
import { Button, Input } from "@/shared/index"
import { ELEMENT_KIND_LABELS } from "../lib/elementTree"
import { formatLongDate, formatShortDay } from "../lib/planFormat"
import { ActionGlyph } from "./ActionGlyph"
import { ActionList, DayLink, type ListedAction } from "./ActionList"

const HINTS: Record<ActionKind, string> = {
  event: "un día o periodo",
  task: "un día o periodo",
  meeting: "solo un día",
  reminder: "solo un día",
  hiring: "del alta a la baja",
}

interface CellMenuProps {
  /** Lo que se crea: un día, o un periodo si se eligieron varias celdas. */
  start: number
  end: number
  parentName: string
  /** Lo que ya hay en esas celdas; `owner`, de qué cuelga si no es de la fila. */
  actions: ListedAction[]
  canCreate: boolean
  pending: boolean
  onOpen: (elementId: string) => void
  /** Ver el día completo: el primero de los elegidos. */
  onOpenDay?: () => void
  onCreate: (input: CreateActionInput) => void
  onCancel: () => void
}

/**
 * Las celdas elegidas: si hay acciones, su lista; para crear, primero el tipo y,
 * en el mismo menú, el nombre. El día, el periodo y de qué cuelga ya vienen puestos.
 */
export function CellMenu({
  start,
  end,
  parentName,
  actions,
  canCreate,
  pending,
  onOpen,
  onOpenDay,
  onCreate,
  onCancel,
}: Readonly<CellMenuProps>) {
  const [kind, setKind] = useState<ActionKind | null>(null)
  const [choosing, setChoosing] = useState<boolean>(actions.length === 0)
  const [name, setName] = useState<string>("")
  const days = end - start + 1
  const when =
    days === 1
      ? formatLongDate(toIsoDate(start))
      : `${formatShortDay(start)} → ${formatShortDay(end)} · ${days} días`

  const dayLink = onOpenDay && <DayLink onClick={onOpenDay} shortcut="Mayús + Enter" />

  // Lo que promete la pista del enlace: Mayús + Enter abre el día desde cualquier punto del menú.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" || !event.shiftKey || !onOpenDay) return
    event.preventDefault()
    onOpenDay()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!kind || name.trim() === "") return
    onCreate({
      kind,
      name: name.trim(),
      startsOn: toIsoDate(start),
      endsOn: days === 1 ? null : toIsoDate(end),
    })
  }

  if (kind) {
    return (
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <p className="text-base font-semibold">Nueva {ELEMENT_KIND_LABELS[kind].toLowerCase()}</p>
          <p className="text-muted-foreground text-sm first-letter:uppercase">
            {when} · en {parentName}
          </p>
        </div>
        <Input
          autoFocus
          aria-label="Nombre"
          placeholder="Nombre"
          maxLength={200}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={pending || name.trim() === ""}>
            Crear
          </Button>
        </div>
      </form>
    )
  }

  if (!choosing) {
    return (
      <div
        data-cell-menu
        tabIndex={-1}
        className="flex flex-col outline-none"
        onKeyDown={onKeyDown}
      >
        <ActionList title={when} subtitle={`en ${parentName}`} actions={actions} onOpen={onOpen} />
        {canCreate && (
          <div className="border-border mt-1 border-t pt-1">
            <button
              type="button"
              onClick={() => setChoosing(true)}
              className="text-primary hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm font-medium outline-none"
            >
              <IconPlus className="size-3.5" aria-hidden />
              {days === 1 ? "Nueva acción en este día" : "Nueva acción en estos días"}
            </button>
          </div>
        )}
        {dayLink}
      </div>
    )
  }

  return (
    <div data-cell-menu tabIndex={-1} className="flex flex-col outline-none" onKeyDown={onKeyDown}>
      <div className="px-2 pt-1 pb-2">
        <p className="text-base font-semibold first-letter:uppercase">
          {days === 1
            ? `Crear el ${when}`
            : `Crear del ${formatShortDay(start)} al ${formatShortDay(end)}`}
        </p>
        <p className="text-muted-foreground text-sm">
          en {parentName}
          {days > 1 && ` · ${days} días`}
        </p>
      </div>
      <div
        role="menu"
        aria-label="Tipo de acción"
        className="border-border flex flex-col border-t pt-1"
      >
        {ACTION_KINDS.map((option) => {
          const singleDay = days > 1 && SINGLE_DAY_ACTION_KINDS.includes(option)
          return (
            <button
              key={option}
              type="button"
              role="menuitem"
              disabled={singleDay}
              onClick={() => setKind(option)}
              className="hover:bg-muted focus-visible:bg-muted flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none disabled:pointer-events-none disabled:opacity-45"
            >
              <span className="text-muted-foreground flex w-[18px] shrink-0 justify-center">
                <ActionGlyph kind={option} />
              </span>
              {ELEMENT_KIND_LABELS[option]}
              <span className="text-muted-foreground ml-auto text-xs">{HINTS[option]}</span>
            </button>
          )
        })}
      </div>
      {dayLink}
    </div>
  )
}
