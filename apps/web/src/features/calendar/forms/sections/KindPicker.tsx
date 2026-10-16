import { ACTION_KINDS, type ActionKind } from "@repo/contracts"
import { ToggleGroup, ToggleGroupItem } from "@/shared/index"
import { ActionGlyph } from "../../components/ActionGlyph"
import { ELEMENT_KIND_LABELS } from "../../lib/elementTree"

interface KindPickerProps {
  value: ActionKind
  /** Los tipos que no caben, como una reunión en un periodo de varios días. */
  disabled?: readonly ActionKind[]
  onChange: (kind: ActionKind) => void
}

/** Los seis tipos de acción, con su icono y su color. */
export function KindPicker({ value, disabled = [], onChange }: Readonly<KindPickerProps>) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Tipo de acción"
      value={value}
      onValueChange={(next) => next && onChange(next as ActionKind)}
      className="w-full"
    >
      {ACTION_KINDS.map((option) => (
        <ToggleGroupItem
          key={option}
          value={option}
          disabled={disabled.includes(option)}
          aria-label={ELEMENT_KIND_LABELS[option]}
          className="h-14 flex-1 flex-col gap-1 px-1 text-xs"
        >
          <ActionGlyph kind={option} />
          {ELEMENT_KIND_LABELS[option]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
