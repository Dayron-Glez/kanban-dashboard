import { useEffect, useState } from "react"
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react"
import {
  ACTION_KINDS,
  ACTION_PARENT_KINDS,
  type ActionKind,
  type CreateActionInput,
} from "@repo/contracts"
import { fromIsoDate, mondayOf, toIsoDate, weekNumber, type EpochDay } from "@repo/domain"
import {
  Button,
  cn,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/index"
import { ELEMENT_KIND_LABELS, flattenTree, isAction, type ElementNode } from "../lib/elementTree"
import { phaseTint } from "../lib/phaseColors"
import { formatFullDate, formatShortDay } from "../lib/planFormat"
import type { Timeline } from "../lib/timeline"
import { ActionGlyph } from "./ActionGlyph"
import { CellMenu } from "./CellMenu"

interface DaySheetProps {
  day: EpochDay
  tree: ElementNode[]
  timeline: Timeline
  canCreate: boolean
  creating: boolean
  onDay: (day: EpochDay) => void
  onClose: () => void
  onOpen: (elementId: string) => void
  onCreateAction: (parentId: string, input: CreateActionInput, done: () => void) => void
}

const signed = (n: number) => (n < 0 ? `−${-n}` : String(n))

/**
 * Todo el proyecto en un día: sus acciones por tipo y lo que está en curso. Desde
 * aquí también se crea, eligiendo de qué cuelga. ← → pasan de un día a otro.
 */
export function DaySheet({
  day,
  tree,
  timeline,
  canCreate,
  creating,
  onDay,
  onClose,
  onOpen,
  onCreateAction,
}: Readonly<DaySheetProps>) {
  // Lo que se está creando vale para un día: al pasar a otro, se olvida.
  const [addingOn, setAddingOn] = useState<EpochDay | null>(null)
  const [chosen, setChosen] = useState<{ day: EpochDay; id: string } | null>(null)
  const adding = addingOn === day
  const setAdding = (on: boolean) => setAddingOn(on ? day : null)
  const parentId = chosen?.day === day ? chosen.id : null
  const setParentId = (id: string) => setChosen({ day, id })

  const all = flattenTree(tree)
  const touches = ({ element }: ElementNode) => {
    if (!element.startsOn) return false
    const start = fromIsoDate(element.startsOn)
    const end = element.endsOn
      ? fromIsoDate(element.endsOn)
      : element.kind === "hiring"
        ? Infinity
        : start
    return start <= day && end >= day
  }
  const actions = all.filter((node) => isAction(node.element) && touches(node))
  const active = all.filter((node) => !isAction(node.element) && touches(node))
  const parents = active.filter((node) => ACTION_PARENT_KINDS.includes(node.element.kind))
  // Por defecto, lo más concreto que esté en curso: el proceso antes que la fase.
  const fallback = parents.reduce<ElementNode | null>(
    (deepest, node) => (deepest == null || node.depth > deepest.depth ? node : deepest),
    null
  )
  const parent = parents.find((node) => node.element.id === parentId) ?? fallback
  const nameOf = (id: string | null) => all.find((node) => node.element.id === id)?.element.name

  const step = (delta: -1 | 1) => {
    const next = day + delta
    if (next >= timeline.range.start && next <= timeline.range.end) onDay(next)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      // En una fila del Gantt, las flechas mueven la celda, no el día.
      if (target.closest("input, textarea, [role=listbox], [role=menu], [data-track]")) return
      if (event.key === "ArrowLeft") step(-1)
      if (event.key === "ArrowRight") step(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const weekend = day - mondayOf(day) >= 5

  return (
    <Sheet open modal={false} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[400px] gap-0 sm:max-w-[400px]"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <SheetHeader className="border-border flex-row items-center gap-2 border-b px-4 pt-4 pb-3">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Día anterior"
            disabled={day <= timeline.range.start}
            onClick={() => step(-1)}
          >
            <IconChevronLeft aria-hidden />
          </Button>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base first-letter:uppercase">
              {formatFullDate(toIsoDate(day))}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {weekend && "Fin de semana · "}
              {timeline.shootWeek != null
                ? `Semana ${signed(weekNumber(day, timeline.shootWeek))}`
                : "Sin semana de rodaje"}
            </SheetDescription>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Día siguiente"
            disabled={day >= timeline.range.end}
            onClick={() => step(1)}
            className="mr-7"
          >
            <IconChevronRight aria-hidden />
          </Button>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-6 px-5 py-5">
            <section aria-label="Acciones del día" className="flex flex-col gap-2">
              <h3 className="text-muted-foreground text-sm font-semibold">
                Acciones · {actions.length}
              </h3>
              {actions.length === 0 && (
                <p className="text-muted-foreground text-sm">Nada este día.</p>
              )}
              {ACTION_KINDS.map((kind) => {
                const ofKind = actions.filter((node) => node.element.kind === kind)
                if (ofKind.length === 0) return null
                return (
                  <div key={kind} className="flex flex-col">
                    <p className="text-muted-foreground text-xs">{ELEMENT_KIND_LABELS[kind]}</p>
                    {ofKind.map(({ element }) => (
                      <button
                        key={element.id}
                        type="button"
                        onClick={() => onOpen(element.id)}
                        className="hover:bg-muted focus-visible:bg-muted flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left outline-none"
                      >
                        <span className="text-muted-foreground flex w-[18px] justify-center">
                          <ActionGlyph kind={element.kind as ActionKind} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm">{element.name}</span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {nameOf(element.parentId)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )
              })}

              {canCreate && !adding && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-primary mt-1"
                  disabled={!parent}
                  onClick={() => setAdding(true)}
                >
                  <IconPlus aria-hidden />
                  Nueva acción
                </Button>
              )}
              {canCreate && !parent && (
                <p className="text-muted-foreground text-sm">
                  Ninguna fase ni proceso está en curso este día.
                </p>
              )}
              {canCreate && adding && parent && (
                <div className="border-border flex flex-col gap-2 rounded-lg border p-2">
                  <label className="text-muted-foreground flex flex-col gap-1 px-1 text-xs">
                    Cuelga de
                    <Select value={parent.element.id} onValueChange={setParentId}>
                      <SelectTrigger aria-label="Cuelga de" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {parents.map((node) => (
                          <SelectItem key={node.element.id} value={node.element.id}>
                            <span style={{ paddingLeft: node.depth * 12 }}>
                              {node.element.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <CellMenu
                    key={parent.element.id}
                    start={day}
                    end={day}
                    parentName={parent.element.name}
                    actions={[]}
                    canCreate
                    pending={creating}
                    onOpen={onOpen}
                    onCancel={() => setAdding(false)}
                    onCreate={(input) =>
                      onCreateAction(parent.element.id, input, () => setAdding(false))
                    }
                  />
                </div>
              )}
            </section>

            <section aria-label="En curso" className="flex flex-col gap-1">
              <h3 className="text-muted-foreground text-sm font-semibold">
                En curso · {active.length}
              </h3>
              {active.map((node) => {
                const tint = phaseTint(node.phaseColor, node.depth === 0)
                return (
                  <button
                    key={node.element.id}
                    type="button"
                    onClick={() => onOpen(node.element.id)}
                    className="hover:bg-muted focus-visible:bg-muted flex items-center gap-2 rounded-md py-1.5 pr-1.5 text-left outline-none"
                    style={{ paddingLeft: node.depth * 14 + 6 }}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "shrink-0 rounded-full",
                        node.depth === 0 ? "h-3 w-1" : "size-1.5",
                        tint.className
                      )}
                      style={tint.style}
                    />
                    <span
                      className={cn(
                        "min-w-0 truncate text-sm",
                        node.depth === 0 && "font-semibold"
                      )}
                    >
                      {node.element.name}
                    </span>
                    <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
                      {formatShortDay(fromIsoDate(node.element.startsOn!))}
                      {node.element.endsOn &&
                        ` → ${formatShortDay(fromIsoDate(node.element.endsOn))}`}
                    </span>
                  </button>
                )
              })}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
