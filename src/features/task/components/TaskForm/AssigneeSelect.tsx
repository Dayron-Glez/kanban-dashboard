import { useFormContext, Controller } from "react-hook-form";
import {
  Field,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/shared/index";
import { useKanban } from "@/features/board/index";

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

interface AssigneeSelectProps {
  disabled?: boolean;
}

export function AssigneeSelect({ disabled = false }: AssigneeSelectProps) {
  const { control } = useFormContext();
  const { members } = useKanban();

  return (
    <Controller
      name="assignee_id"
      control={control}
      render={({ field }) => {
        const selected = members.find((m) => m.user_id === field.value);

        return (
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
              {selected ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-[9px] font-bold shrink-0">
                    {getInitials(selected.profiles?.full_name)}
                  </span>
                  <span className="text-sm truncate">
                    {selected.profiles?.full_name ?? selected.user_id.slice(0, 8)}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">Sin asignar</span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-[9px] font-bold shrink-0">
                      {getInitials(m.profiles?.full_name)}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm leading-snug">
                        {m.profiles?.full_name ?? m.user_id.slice(0, 8)}
                      </span>
                      {m.profiles?.email && (
                        <span className="text-[10px] text-muted-foreground leading-tight">
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
        );
      }}
    />
  );
}
