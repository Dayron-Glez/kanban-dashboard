import { Controller, useFormContext, useWatch } from "react-hook-form"
import type { VideoApp } from "@repo/contracts"
import { IconVideo } from "@tabler/icons-react"
import {
  cn,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/shared/index"
import { FoldSection } from "../FoldSection"
import type { ActionFormValues } from "../actionForm"
import { FIELD, FIELD_GAP } from "../fieldStyle"

const VIDEO_APP_LABELS: Record<VideoApp, string> = {
  meet: "Google Meet",
  teams: "Microsoft Teams",
  zoom: "Zoom",
  webex: "Webex",
  other: "Otra",
}

/** La reunión: presencial o por videollamada, con su app y su enlace. */
export function MeetingSection({ changed = false }: Readonly<{ changed?: boolean }>) {
  const { control, setValue, formState } = useFormContext<ActionFormValues>()
  const videoApp = useWatch({ control, name: "videoApp" })
  const online = videoApp != null
  const dirty = { shouldDirty: true }
  const invalid = formState.errors.videoApp != null || formState.errors.videoUrl != null

  return (
    <FoldSection
      icon={IconVideo}
      title="Videollamada"
      summary={online ? VIDEO_APP_LABELS[videoApp] : "Presencial"}
      defaultOpen
      invalid={invalid}
      changed={changed}
    >
      <label className="flex w-fit items-center gap-2 text-base">
        <Switch
          checked={online}
          onCheckedChange={(next) => {
            setValue("videoApp", next ? "meet" : null, dirty)
            if (!next) setValue("videoUrl", null, dirty)
          }}
        />
        Es una videollamada
      </label>
      {online && (
        <div className="grid grid-cols-[10rem_1fr] gap-4">
          <Controller
            name="videoApp"
            control={control}
            render={({ field }) => (
              <Field className={FIELD_GAP}>
                <FieldLabel>App</FieldLabel>
                <Select value={field.value ?? "meet"} onValueChange={field.onChange}>
                  <SelectTrigger
                    aria-label="App de la videollamada"
                    className={cn("w-full", FIELD)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VIDEO_APP_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            name="videoUrl"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={FIELD_GAP}>
                <FieldLabel htmlFor="action-video-url">Enlace</FieldLabel>
                <Input
                  id="action-video-url"
                  type="url"
                  inputMode="url"
                  value={field.value ?? ""}
                  placeholder="https://"
                  aria-invalid={fieldState.invalid}
                  className={FIELD}
                  onChange={(event) => field.onChange(event.target.value.trim() || null)}
                  onBlur={field.onBlur}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
      )}
    </FoldSection>
  )
}
