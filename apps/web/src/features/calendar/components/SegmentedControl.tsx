import { cn } from "@/shared/index"

interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}

/** Un grupo de opciones excluyentes, compacto, para cambiar de vista o de escala. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: Readonly<SegmentedControlProps<T>>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="bg-muted/60 border-border inline-flex rounded-lg border p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "focus-visible:ring-ring/50 h-6 rounded-md px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]",
            option.value === value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
