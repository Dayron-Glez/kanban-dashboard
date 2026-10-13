import type { UpdateElementPlanInput } from "@repo/contracts"
import { IconCheck } from "@tabler/icons-react"
import { cn } from "@/shared/index"
import { formatDuration, formatPlanDate, type SetupStep } from "../lib/planFormat"
import { DateEditor, DurationEditor } from "./PlanEditors"

interface PlanSetupProps {
  steps: SetupStep[]
  pending: boolean
  onUpdate: (elementId: string, input: UpdateElementPlanInput) => void
}

/**
 * Los pasos para que el plan salga solo, con lo hecho marcado. Desaparece
 * cuando ya está todo.
 */
export function PlanSetup({ steps, pending, onUpdate }: Readonly<PlanSetupProps>) {
  const done = steps.filter((step) => step.done).length
  if (steps.length === 0 || done === steps.length) return null

  return (
    <section
      aria-labelledby="plan-setup-title"
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2 id="plan-setup-title" className="text-sm font-semibold">
            Para que el plan salga solo
          </h2>
          <p className="text-muted-foreground text-xs">
            Con la fecha del rodaje y la duración de las fases, el resto de fechas se calcula.
          </p>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {done} de {steps.length}
        </span>
      </div>
      <div className="bg-muted h-1 overflow-hidden rounded-full" aria-hidden>
        <div
          className="bg-primary h-full rounded-full transition-[width]"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>

      <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {steps.map((step) => (
          <li
            key={`${step.element.id}-${step.field}`}
            className="flex h-8 items-center gap-2.5 text-sm"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border",
                step.done ? "border-primary bg-primary text-primary-foreground" : "border-border"
              )}
            >
              {step.done && <IconCheck size={11} stroke={3} />}
            </span>
            <span className={cn("flex-1 truncate", step.done && "text-muted-foreground")}>
              {step.label}
              {step.done && <span className="sr-only"> (hecho)</span>}
            </span>
            {step.done ? (
              <span className="text-muted-foreground text-xs tabular-nums">
                {step.field === "duration"
                  ? formatDuration(step.element.duration!)
                  : formatPlanDate(step.element.startsOn!)}
              </span>
            ) : step.field === "duration" ? (
              <DurationEditor
                label={step.label}
                value={null}
                editable
                pending={pending}
                onSave={(duration) => onUpdate(step.element.id, { duration })}
              />
            ) : (
              <DateEditor
                label={step.label}
                value={null}
                editable
                pending={pending}
                onSave={(fixedStart) => onUpdate(step.element.id, { fixedStart })}
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
