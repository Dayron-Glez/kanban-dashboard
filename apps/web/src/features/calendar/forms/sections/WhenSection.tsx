import { useFormContext, useWatch } from "react-hook-form"
import type { CalendarElement, CalendarPlan } from "@repo/contracts"
import { endFromStart, fromIsoDate, toIsoDate, type EpochDay } from "@repo/domain"
import { Switch } from "@/shared/index"
import { occupancyFor } from "../../lib/occupancy"
import { WhenPicker, type WhenChange } from "../../components/WhenPicker"
import { HoursField } from "../fields/HoursField"
import { isSingleDay, type ActionFormValues } from "../actionForm"

interface WhenSectionProps {
  /** La acción tal como se pinta, para el calendario de «Cuándo». */
  preview: CalendarElement
  plan: CalendarPlan
  bounds?: { start: EpochDay; end: EpochDay }
}

const heading = "text-muted-foreground text-sm font-semibold tracking-wider uppercase"

/** Las fechas, en el calendario de siempre; debajo, las horas y si ya se hizo. */
export function WhenSection({ preview, plan, bounds }: Readonly<WhenSectionProps>) {
  const { control, getValues, setValue } = useFormContext<ActionFormValues>()
  const kind = useWatch({ control, name: "kind" })
  const endsOn = useWatch({ control, name: "endsOn" })
  const startsOn = useWatch({ control, name: "startsOn" })
  const completed = useWatch({ control, name: "completed" })
  const severalDays = endsOn != null && endsOn !== startsOn

  const dirty = { shouldDirty: true }
  const apply = (change: WhenChange) => {
    const start = change.start ?? getValues("startsOn")
    const current = getValues("endsOn")
    const length =
      current == null ? null : fromIsoDate(current) - fromIsoDate(getValues("startsOn"))
    let end: string | null = current ?? null
    if (change.duration) {
      end = toIsoDate(
        endFromStart(fromIsoDate(start), change.duration.amount, change.duration.unit)
      )
    } else if (change.end) end = change.end
    else if (change.start && length !== null) end = toIsoDate(fromIsoDate(start) + length)
    // Un día se guarda sin fin, salvo en la contratación, donde sin fin es sin baja.
    if (isSingleDay(kind) || (end === start && kind !== "hiring")) end = null
    setValue("startsOn", start, dirty)
    setValue("endsOn", end, dirty)
    // Con horas, varios días piden decir cómo son; uno solo, no.
    const hours = getValues("hours")
    if (hours && !hours.allDay) {
      const several = end !== null && end !== start
      setValue(
        "hours",
        { ...hours, hoursMode: several ? (hours.hoursMode ?? "daily") : null },
        dirty
      )
    }
  }

  return (
    <section aria-labelledby="action-when" className="flex flex-col gap-3">
      <h3 id="action-when" className={heading}>
        {kind === "hiring" ? "Alta y baja" : "Cuándo"}
      </h3>
      <WhenPicker
        key={`${preview.startsOn}-${preview.endsOn}`}
        element={preview}
        single={isSingleDay(kind)}
        editable
        pending={false}
        bounds={bounds}
        occupancy={occupancyFor(plan, preview.id)}
        onApply={apply}
      />
      {kind === "hiring" ? (
        <p className="text-muted-foreground text-sm">
          {endsOn == null
            ? "Sin baja todavía: sigue activa. Siempre son días completos."
            : "Siempre son días completos, sin horas."}
        </p>
      ) : (
        <HoursField severalDays={severalDays} />
      )}
      {kind === "task" && (
        <label className="flex w-fit items-center gap-2 text-base">
          <Switch
            checked={completed ?? false}
            onCheckedChange={(next) => setValue("completed", next, dirty)}
          />
          Hecha
          <span className="text-muted-foreground text-sm">· la tacha y quita sus avisos</span>
        </label>
      )}
    </section>
  )
}
