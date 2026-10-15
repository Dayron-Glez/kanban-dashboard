import type { ReactNode } from "react"
import {
  ACTION_KINDS,
  ACTION_PARENT_KINDS,
  type ActionKind,
  type CalendarElement,
  type EditElementInput,
} from "@repo/contracts"
import { IconTrash } from "@tabler/icons-react"
import { Button, cn, ToggleGroup, ToggleGroupItem } from "@/shared/index"
import { ELEMENT_KIND_LABELS, flattenTree, type ElementNode } from "../lib/elementTree"
import { phaseTint } from "../lib/phaseColors"
import { kindChange } from "../lib/actionStyle"
import { ActionGlyph } from "./ActionGlyph"
import { ElementPicker } from "./ElementPicker"

interface ActionFieldsProps {
  element: CalendarElement
  /** La fase de la acción: de ella, o de lo que tiene dentro, puede colgar. */
  phase: ElementNode | undefined
  editable: boolean
  /** Qué partes llevan cambios sin guardar: la marca cian. */
  changed: { kind: boolean; parent: boolean }
  mark: (changed: boolean) => string | false
  onEdit: (input: EditElementInput) => void
  /** Va entre el tipo y «Cuelga de»: el campo «Cuándo». */
  children: ReactNode
}

const heading = "text-muted-foreground text-sm font-semibold tracking-wider uppercase"

/**
 * Lo propio de una acción en el panel: su tipo, cuándo y de qué cuelga. Lo que
 * se cambia va al borrador, como todo en el panel.
 */
export function ActionFields({
  element,
  phase,
  editable,
  changed,
  mark,
  onEdit,
  children,
}: Readonly<ActionFieldsProps>) {
  const kind = element.kind as ActionKind
  const parents = phase
    ? flattenTree([phase]).filter((node) => ACTION_PARENT_KINDS.includes(node.element.kind))
    : []

  const changeKind = (next: ActionKind) => onEdit(kindChange(element, next))

  return (
    <>
      <section
        aria-labelledby="inspector-kind"
        className={cn("flex flex-col gap-2", mark(changed.kind))}
      >
        <h3 id="inspector-kind" className={heading}>
          Tipo
        </h3>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Tipo de acción"
          value={kind}
          disabled={!editable}
          onValueChange={(next) => next && changeKind(next as ActionKind)}
          className="w-full"
        >
          {ACTION_KINDS.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              aria-label={ELEMENT_KIND_LABELS[option]}
              className="h-14 flex-1 flex-col gap-1 px-1 text-xs"
            >
              <ActionGlyph kind={option} />
              {ELEMENT_KIND_LABELS[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      {children}

      <section
        aria-labelledby="inspector-parent"
        className={cn("flex flex-col gap-2", mark(changed.parent))}
      >
        <h3 id="inspector-parent" className={heading}>
          Cuelga de
        </h3>
        {editable ? (
          <ElementPicker
            label="Cuelga de"
            options={parents.map((node) => ({
              element: node.element,
              depth: node.depth,
              tint: phaseTint(node.phaseColor, node.depth === 0),
            }))}
            value={element.parentId}
            onChange={(parentId) => onEdit({ parentId })}
            placeholder="Elige una fase, subfase o proceso"
          />
        ) : (
          <p className="text-base">
            {parents.find((node) => node.element.id === element.parentId)?.element.name}
          </p>
        )}
        {phase && (
          <p className="text-muted-foreground text-sm">
            Dentro de {phase.element.name}: su fase, sus subfases o sus procesos.
          </p>
        )}
      </section>
    </>
  )
}

/** El botón de borrar del panel: la confirmación la pide quien lo usa. */
export function DeleteAction({
  disabled,
  onDelete,
}: Readonly<{ disabled: boolean; onDelete: () => void }>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onDelete}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <IconTrash aria-hidden />
      Borrar
    </Button>
  )
}
