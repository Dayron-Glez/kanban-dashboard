import { useFormContext, useWatch } from "react-hook-form"
import type { HoursMode } from "@repo/contracts"
import { ALL_DAY } from "@repo/contracts"
import { Field, FieldError, FieldLabel, Input, Switch } from "@/shared/index"
import { SegmentedControl } from "../../components/SegmentedControl"
import type { ActionFormValues } from "../actionForm"
import { FIELD, FIELD_GAP } from "../fieldStyle"

const HOURS_MODES: readonly { value: HoursMode; label: string }[] = [
  { value: "daily", label: "Cada día" },
  { value: "continuous", label: "Seguidas" },
]

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

// «1 h 30 min», si acaba el mismo día.
const lasting = (start: string | null, end: string | null) => {
  if (!start || !end || end <= start) return null
  const minutes = minutesOf(end) - minutesOf(start)
  const hours = Math.floor(minutes / 60)
  return [hours > 0 && `${hours} h`, minutes % 60 > 0 && `${minutes % 60} min`]
    .filter(Boolean)
    .join(" ")
}

interface HoursFieldProps {
  /** Si dura varios días: entonces hay que decir si las horas son cada día o seguidas. */
  severalDays: boolean
  disabled?: boolean
}

/** Todo el día, o de qué hora a qué hora; con varios días, cada día o seguidas. */
export function HoursField({ severalDays, disabled = false }: Readonly<HoursFieldProps>) {
  const { control, setValue, formState } = useFormContext<ActionFormValues>()
  const hours = useWatch({ control, name: "hours" }) ?? ALL_DAY
  const errors = formState.errors.hours
  const set = (next: Partial<NonNullable<ActionFormValues["hours"]>>) =>
    setValue(
      "hours",
      { ...ALL_DAY, ...hours, ...next },
      { shouldDirty: true, shouldValidate: formState.isSubmitted }
    )
  const duration = lasting(hours.startTime ?? null, hours.endTime ?? null)

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-fit items-center gap-2 text-base">
        <Switch
          checked={hours.allDay ?? true}
          disabled={disabled}
          onCheckedChange={(allDay) =>
            set(
              allDay
                ? ALL_DAY
                : {
                    allDay: false,
                    startTime: "09:00",
                    endTime: "10:00",
                    hoursMode: severalDays ? "daily" : null,
                  }
            )
          }
        />
        Todo el día
      </label>
      {!hours.allDay && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={errors?.startTime != null} className={FIELD_GAP}>
              <FieldLabel htmlFor="action-start-time">Desde</FieldLabel>
              <Input
                id="action-start-time"
                type="time"
                value={hours.startTime ?? ""}
                disabled={disabled}
                aria-invalid={errors?.startTime != null}
                className={FIELD}
                onChange={(event) => set({ startTime: event.target.value || null })}
              />
              <FieldError errors={[errors?.startTime]} />
            </Field>
            <Field data-invalid={errors?.endTime != null} className={FIELD_GAP}>
              <FieldLabel htmlFor="action-end-time">Hasta</FieldLabel>
              <Input
                id="action-end-time"
                type="time"
                value={hours.endTime ?? ""}
                disabled={disabled}
                aria-invalid={errors?.endTime != null}
                className={FIELD}
                onChange={(event) => set({ endTime: event.target.value || null })}
              />
              <FieldError errors={[errors?.endTime]} />
            </Field>
          </div>
          {severalDays && (
            <Field data-invalid={errors?.hoursMode != null} className={FIELD_GAP}>
              <SegmentedControl
                label="Horario"
                value={hours.hoursMode ?? "daily"}
                options={HOURS_MODES}
                onChange={(hoursMode) => set({ hoursMode })}
              />
              <FieldError errors={[errors?.hoursMode]} />
            </Field>
          )}
          {duration && !severalDays && (
            <p className="text-muted-foreground text-sm">Dura {duration}.</p>
          )}
        </>
      )}
    </div>
  )
}
