import { useEffect, useState } from "react"
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react"
import {
  ACTION_KINDS,
  ACTION_PARENT_KINDS,
  type ActionKind,
  type CreateActionInput,
} from "@repo/contracts"
import { fromIsoDate, mondayOf, toIsoDate, weekNumber, type EpochDay } from "@repo/domain"
import { Button, cn, SheetDescription, SheetTitle } from "@/shared/index"
import {
  ELEMENT_KIND_LABELS,
  flattenTree,
  isAction,
  type ElementNode,
  lacksDuration,
} from "../lib/elementTree"
import { phaseTint } from "../lib/phaseColors"
import { formatFullDate, formatLongDate, formatShortDay } from "../lib/planFormat"
import type { Timeline } from "../lib/timeline"
import { ActionGlyph } from "./ActionGlyph"
import { CellMenu } from "./CellMenu"
import { SidePanel } from "./SidePanel"
import { ElementPicker } from "./ElementPicker"
import { MissingDurationHint } from "./MissingDurationHint"
import { TruncatedText } from "./TruncatedText"

interface DaySheetProps {
  day: EpochDay
  /** La fila desde la que se abrió: se crea dentro de su fase. */
  rowId: string | null
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

// Los títulos de sección, como en el panel del elemento.
const HEADING = "text-muted-foreground text-sm font-semibold tracking-wider uppercase"

/**
 * Todo el proyecto en un día: sus acciones por tipo y lo que está en curso. Desde
 * aquí también se crea, eligiendo de qué cuelga. ← → pasan de un día a otro.
 */
export function DaySheet({
  day,
  rowId,
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
  const activeIds = new Set(active.map((node) => node.element.id))
  // Desde una fila, se cuelga de su fase o de lo que la forma, nunca de una fase
  // hermana. Desde la cabecera del día, de cualquier fase, subfase o proceso.
  // La fila «Acciones» de un elemento cuenta como el propio elemento.
  const fromRow = rowId?.replace(/#acciones$/, "") ?? null
  const rowPhase = fromRow
    ? tree.find((phase) => flattenTree([phase]).some((node) => node.element.id === fromRow))
    : undefined
  const scope = rowPhase ? [rowPhase] : tree
  const parents = flattenTree(scope).filter((node) =>
    ACTION_PARENT_KINDS.includes(node.element.kind)
  )
  // Por defecto, la propia fila; si no, lo más concreto que esté en curso.
  const fallback =
    parents.find((node) => node.element.id === fromRow) ??
    parents
      .filter((node) => activeIds.has(node.element.id))
      .reduce<ElementNode | null>(
        (deepest, node) => (deepest == null || node.depth > deepest.depth ? node : deepest),
        null
      ) ??
    null
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
    <SidePanel
      onClose={onClose}
      footer={
        canCreate &&
        !adding && (
          <Button className="flex-1" onClick={() => setAdding(true)}>
            <IconPlus aria-hidden />
            Nueva acción
          </Button>
        )
      }
      actions={
        <>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Día anterior"
            disabled={day <= timeline.range.start}
            onClick={() => step(-1)}
          >
            <IconChevronLeft aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Día siguiente"
            disabled={day >= timeline.range.end}
            onClick={() => step(1)}
          >
            <IconChevronRight aria-hidden />
          </Button>
        </>
      }
      header={
        <>
          {/* La fecha corta: con la larga no cabían las flechas. */}
          <SheetTitle
            className="text-base first-letter:uppercase"
            title={formatFullDate(toIsoDate(day))}
          >
            {formatLongDate(toIsoDate(day))}
          </SheetTitle>
          <SheetDescription className="text-sm">
            {weekend && "Fin de semana · "}
            {timeline.shootWeek != null
              ? `Semana ${signed(weekNumber(day, timeline.shootWeek))}`
              : "Sin semana de rodaje"}
          </SheetDescription>
        </>
      }
    >
      {canCreate && adding && (
        <div className="border-border flex flex-col gap-2 rounded-lg border p-2">
          <div className="flex flex-col gap-1 px-1">
            <span className="text-muted-foreground text-xs">Cuelga de</span>
            <ElementPicker
              label="Cuelga de"
              options={parents.map((node) => ({
                element: node.element,
                depth: node.depth,
                tint: phaseTint(node.phaseColor, node.depth === 0),
                hint: activeIds.has(node.element.id) ? "en curso" : undefined,
              }))}
              value={parent?.element.id ?? null}
              onChange={setParentId}
              placeholder="Elige una fase, subfase o proceso"
            />
          </div>
          {parent && (
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
              onCreate={(input) => onCreateAction(parent.element.id, input, () => setAdding(false))}
            />
          )}
        </div>
      )}

      <section aria-label="Acciones del día" className="flex flex-col gap-2">
        <h3 className={HEADING}>Acciones · {actions.length}</h3>
        {actions.length === 0 && <p className="text-muted-foreground text-sm">Nada este día.</p>}
        {actions.length > 0 && (
          <div className="border-border bg-card flex flex-col gap-1 rounded-xl border p-1.5">
            {ACTION_KINDS.map((kind) => {
              const ofKind = actions.filter((node) => node.element.kind === kind)
              if (ofKind.length === 0) return null
              return (
                <div key={kind} className="flex flex-col">
                  <p className="text-muted-foreground px-1.5 pt-1 text-xs">
                    {ELEMENT_KIND_LABELS[kind]}
                  </p>
                  {ofKind.map(({ element }) => (
                    <button
                      key={element.id}
                      type="button"
                      onClick={() => onOpen(element.id)}
                      className="hover:bg-muted focus-visible:bg-muted flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left outline-none"
                    >
                      <span className="text-muted-foreground flex w-[18px] shrink-0 justify-center">
                        <ActionGlyph kind={element.kind as ActionKind} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <TruncatedText text={element.name} className="text-sm" />
                        <TruncatedText
                          text={nameOf(element.parentId) ?? ""}
                          className="text-muted-foreground text-xs"
                        />
                      </span>
                      {lacksDuration(element) && <MissingDurationHint />}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section aria-label="En curso" className="flex flex-col gap-1">
        <h3 className={HEADING}>En curso · {active.length}</h3>
        {active.map((node) => {
          return (
            <button
              key={node.element.id}
              type="button"
              onClick={() => onOpen(node.element.id)}
              className="hover:bg-muted focus-visible:bg-muted flex items-center gap-2 rounded-md py-1.5 pr-1.5 text-left outline-none"
              style={{ paddingLeft: node.depth * 14 + 6 }}
            >
              <Mark node={node} />
              <TruncatedText
                text={node.element.name}
                className={cn("text-sm", node.depth === 0 && "font-semibold")}
              />
              <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
                {formatShortDay(fromIsoDate(node.element.startsOn!))}
                {node.element.endsOn && ` → ${formatShortDay(fromIsoDate(node.element.endsOn))}`}
              </span>
            </button>
          )
        })}
      </section>
    </SidePanel>
  )
}

// El color de su fase: una barrita en las fases, un punto en lo demás.
function Mark({ node }: Readonly<{ node: ElementNode }>) {
  const tint = phaseTint(node.phaseColor, node.depth === 0)
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 rounded-full",
        node.depth === 0 ? "h-3 w-1" : "size-1.5",
        tint.className
      )}
      style={tint.style}
    />
  )
}
