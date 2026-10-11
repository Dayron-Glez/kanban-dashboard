import type { UpdateElementPlanInput } from "@repo/contracts"
import { IconWand } from "@tabler/icons-react"
import type { SetupStep } from "../lib/planFormat"
import { DateEditor, DurationEditor } from "./PlanEditors"

interface PlanSetupProps {
  steps: SetupStep[]
  pending: boolean
  onUpdate: (elementId: string, input: UpdateElementPlanInput) => void
}

/** Lo mínimo para que el plan salga solo. Desaparece cuando ya está todo. */
export function PlanSetup({ steps, pending, onUpdate }: Readonly<PlanSetupProps>) {
  if (steps.length === 0) return null

  return (
    <section
      aria-labelledby="plan-setup-title"
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4"
    >
      <div className="flex items-start gap-2">
        <IconWand size={18} className="text-primary mt-0.5 shrink-0" />
        <div>
          <h2 id="plan-setup-title" className="text-sm font-semibold">
            Para que el plan salga solo
          </h2>
          <p className="text-muted-foreground text-xs">
            Con la fecha del rodaje y la duración de las fases, el resto de fechas se calcula.
          </p>
        </div>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {steps.map((step) => (
          <li
            key={`${step.element.id}-${step.field}`}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span>{step.label}</span>
            {step.field === "duration" ? (
              <DurationEditor
                label={step.label}
                value={step.element.duration}
                editable
                pending={pending}
                onSave={(duration) => onUpdate(step.element.id, { duration })}
              />
            ) : (
              <DateEditor
                label={step.label}
                value={step.element.startsOn}
                editable
                pending={pending}
                onSave={(fixedStart) => onUpdate(step.element.id, { fixedStart })}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
