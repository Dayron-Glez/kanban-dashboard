import { useFormContext, Controller } from "react-hook-form"
import {
  Field,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/index"
import { useKanban } from "@/features/board/index"

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface AssigneeSelectProps {
  disabled?: boolean
}

export function AssigneeSelect({ disabled = false }: AssigneeSelectProps) {
  const { control } = useFormContext()
  const { members } = useKanban()

  return (
    <Controller
      name="assignee_id"
      control={control}
      render={({ field }) => (
        <Field className="col-span-2">
          <FieldLabel htmlFor="assignee_id" className="text-primary">
            Asignado a
          </FieldLabel>
          <Select
            value={field.value ?? "none"}
            onValueChange={(val) => field.onChange(val === "none" ? null : val)}
            disabled={disabled}
          >
            <SelectTrigger id="assignee_id" disabled={disabled}>
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-600">
                      {getInitials(m.profiles?.full_name)}
                    </span>
                    <div className="flex flex-col gap-0">
                      <span className="text-sm leading-tight">
                        {m.profiles?.full_name ?? m.user_id.slice(0, 8)}
                      </span>
                      {m.profiles?.email && (
                        <span className="text-muted-foreground text-[10px] leading-tight">
                          {m.profiles.email}
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  )
}
