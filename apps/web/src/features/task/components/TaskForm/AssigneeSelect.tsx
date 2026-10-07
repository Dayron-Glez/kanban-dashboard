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
import { useProjectId } from "@/features/board/index"
import { useMembers } from "@/features/project"

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
  const { data: members = [] } = useMembers(useProjectId())

  return (
    <Controller
      name="assigneeId"
      control={control}
      render={({ field }) => (
        <Field className="col-span-2">
          <FieldLabel htmlFor="assigneeId" className="text-primary">
            Asignado a
          </FieldLabel>
          <Select
            value={field.value ?? "none"}
            onValueChange={(val) => field.onChange(val === "none" ? null : val)}
            disabled={disabled}
          >
            <SelectTrigger
              id="assigneeId"
              disabled={disabled}
              className="bg-background dark:bg-muted/60"
            >
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/15 text-primary inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold">
                      {getInitials(m.profile.fullName)}
                    </span>
                    <div className="flex flex-col gap-0">
                      <span className="text-sm leading-tight">
                        {m.profile.fullName ?? m.userId.slice(0, 8)}
                      </span>
                      {m.profile.email && (
                        <span className="text-muted-foreground text-[10px] leading-tight">
                          {m.profile.email}
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
