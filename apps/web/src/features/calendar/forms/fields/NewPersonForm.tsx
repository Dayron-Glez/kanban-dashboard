import type { KeyboardEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CreateCrewMemberInputSchema, type Department } from "@repo/contracts"
import { IconCheck, IconMail, IconUserPlus } from "@tabler/icons-react"
import * as z from "zod"
import {
  Button,
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
} from "@/shared/index"
import { FIELD, FIELD_GAP } from "../fieldStyle"

const NewPersonSchema = CreateCrewMemberInputSchema.extend({
  email: z.email().max(200).nullable(),
  departmentId: z.uuid().nullable(),
})
// De fuera: sin departamento y con email, que es por donde le llega la convocatoria.
const GuestSchema = NewPersonSchema.extend({ email: z.email().max(200) })

export type NewPerson = z.output<typeof NewPersonSchema>
type NewPersonValues = z.input<typeof NewPersonSchema>

const NO_DEPARTMENT = "none"

interface NewPersonFormProps {
  /** Al equipo del proyecto, o un participante de fuera. */
  mode: "crew" | "guest"
  /** Lo que se había escrito en el buscador. */
  initialName: string
  departments: Department[]
  pending: boolean
  onCancel: () => void
  onAdd: (person: NewPerson) => void
}

/**
 * La mini ficha para añadir a alguien al equipo y asignarlo de una vez, o para
 * invitar a alguien de fuera. Va dentro del formulario de la acción: Enter la
 * envía a ella, no a la acción.
 */
export function NewPersonForm({
  mode,
  initialName,
  departments,
  pending,
  onCancel,
  onAdd,
}: Readonly<NewPersonFormProps>) {
  const { control, handleSubmit } = useForm<NewPersonValues, unknown, NewPerson>({
    resolver: zodResolver(mode === "crew" ? NewPersonSchema : GuestSchema),
    defaultValues: { fullName: initialName, email: null, departmentId: null },
  })
  const submit = handleSubmit(onAdd)
  const crew = mode === "crew"
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      onCancel()
    }
    const inField = event.target instanceof HTMLInputElement
    if (event.key !== "Enter" || !inField || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    event.stopPropagation()
    void submit()
  }

  return (
    <div
      role="group"
      aria-label={crew ? "Añadir al equipo del proyecto" : "Invitar a alguien de fuera"}
      className="border-primary/45 flex flex-col gap-4 rounded-xl border border-dashed p-3"
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center gap-2 text-base">
        {crew ? (
          <IconUserPlus size={16} className="text-primary" aria-hidden />
        ) : (
          <IconMail size={16} className="text-primary" aria-hidden />
        )}
        <span className="font-semibold">
          {crew ? "Añadir al equipo del proyecto" : "Invitar a alguien de fuera"}
        </span>
        <span className="text-muted-foreground ml-auto text-sm">
          {crew ? "para todo el proyecto" : "recibe la convocatoria"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="fullName"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className={FIELD_GAP}>
              <FieldLabel htmlFor={`new-${mode}-name`}>
                Nombre <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                {...field}
                id={`new-${mode}-name`}
                autoFocus
                autoComplete="off"
                maxLength={200}
                aria-invalid={fieldState.invalid}
                className={FIELD}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className={FIELD_GAP}>
              <FieldLabel htmlFor={`new-${mode}-email`}>
                Email {!crew && <span className="text-destructive">*</span>}
              </FieldLabel>
              <Input
                id={`new-${mode}-email`}
                type="email"
                autoComplete="off"
                maxLength={200}
                placeholder={crew ? "opcional" : undefined}
                value={field.value ?? ""}
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
      {crew && (
        <Controller
          name="departmentId"
          control={control}
          render={({ field }) => (
            <Field className={FIELD_GAP}>
              <FieldLabel htmlFor="new-crew-department">Departamento</FieldLabel>
              <Select
                value={field.value ?? NO_DEPARTMENT}
                onValueChange={(value) => field.onChange(value === NO_DEPARTMENT ? null : value)}
              >
                <SelectTrigger id="new-crew-department" className={cn("w-full", FIELD)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPARTMENT}>Sin departamento</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={() => void submit()}>
          <IconCheck aria-hidden />
          {crew ? "Añadir y asignar" : "Invitar"}
        </Button>
      </div>
    </div>
  )
}
