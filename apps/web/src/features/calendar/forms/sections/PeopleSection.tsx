import { useState, type ReactNode } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { NO_PEOPLE, type CrewMember, type PeopleData } from "@repo/contracts"
import { IconMail, IconUserPlus, IconUsers } from "@tabler/icons-react"
import { Field, FieldError, FieldLabel } from "@/shared/index"
import { useCreateCrewMember, useCrew, useDepartments } from "../../api/crew"
import { FoldSection } from "../FoldSection"
import type { ActionFormValues } from "../actionForm"
import { FIELD_GAP } from "../fieldStyle"
import { NewPersonForm, type NewPerson } from "../fields/NewPersonForm"
import { Chip, PeoplePicker, type PickAction } from "../fields/PeoplePicker"

type Role = "responsible" | "executor" | "guest"

/** La mini ficha abierta: para qué papel y si es del equipo o de fuera. */
interface Adding {
  role: Role
  mode: "crew" | "guest"
  name: string
}

// Las personas, con alguien del equipo más en ese papel.
const withPerson = (people: PeopleData, role: Role, crewMemberId: string): Partial<PeopleData> => {
  if (role === "responsible") return { responsibleId: crewMemberId }
  if (role === "executor") return { executorIds: [...people.executorIds, crewMemberId] }
  return { guests: [...people.guests, { crewMemberId, fullName: null, email: null }] }
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** Quién interviene, en una línea: lo que se ve con la sección plegada. */
const peopleSummary = (people: PeopleData, nameOf: (id: string) => string) => {
  const parts = [
    ...(people.responsibleId ? [nameOf(people.responsibleId)] : []),
    ...(people.executorIds.length
      ? [plural(people.executorIds.length, "ejecutante", "ejecutantes")]
      : []),
    ...(people.guests.length
      ? [plural(people.guests.length, "participante", "participantes")]
      : []),
    ...(people.departmentIds.length
      ? [plural(people.departmentIds.length, "departamento", "departamentos")]
      : []),
  ]
  return parts.length ? parts.join(" · ") : "Sin nadie"
}

interface PeopleFieldProps {
  id: string
  label: string
  hint?: string
  error?: { message?: string }
  children: ReactNode
}

function PeopleField({ id, label, hint, error, children }: Readonly<PeopleFieldProps>) {
  return (
    <Field data-invalid={error != null} className={FIELD_GAP}>
      <FieldLabel htmlFor={id}>
        {label}
        {hint && <span className="text-muted-foreground text-sm font-normal">· {hint}</span>}
      </FieldLabel>
      {children}
      <FieldError errors={[error]} />
    </Field>
  )
}

interface PeopleSectionProps {
  projectId: string
  changed?: boolean
}

/**
 * Quién interviene en la acción: un responsable, los ejecutantes y los
 * departamentos, del equipo del proyecto, y los participantes, del equipo o de
 * fuera. Desde cualquier buscador se puede añadir a alguien al equipo.
 */
export function PeopleSection({ projectId, changed = false }: Readonly<PeopleSectionProps>) {
  const { control, setValue, formState } = useFormContext<ActionFormValues>()
  const people = { ...NO_PEOPLE, ...useWatch({ control, name: "people" }) } as PeopleData
  const crew = useCrew(projectId).data ?? []
  const departments = useDepartments(projectId).data ?? []
  const createMember = useCreateCrewMember(projectId)
  const [adding, setAdding] = useState<Adding | null>(null)
  const errors = formState.errors.people

  const byId = new Map(crew.map((member) => [member.id, member]))
  const departmentName = new Map(departments.map((department) => [department.id, department.name]))
  const nameOf = (id: string) => byId.get(id)?.fullName ?? "Alguien que ya no está"
  const optionOf = (member: CrewMember) => ({
    id: member.id,
    label: member.fullName,
    hint: member.departmentId ? departmentName.get(member.departmentId) : undefined,
  })
  const guestCrew = new Set(people.guests.flatMap((guest) => guest.crewMemberId ?? []))
  const assigned = new Set([people.responsibleId, ...people.executorIds])

  const update = (next: Partial<PeopleData>) =>
    setValue(
      "people",
      { ...people, ...next },
      { shouldDirty: true, shouldValidate: formState.isSubmitted }
    )
  const assign = (role: Role, crewMemberId: string) =>
    update(withPerson(people, role, crewMemberId))
  const addPerson = ({ fullName, email, departmentId }: NewPerson) => {
    if (adding?.mode === "guest") {
      update({ guests: [...people.guests, { crewMemberId: null, fullName, email }] })
      setAdding(null)
      return
    }
    const role = adding?.role ?? "executor"
    createMember.mutate(
      { fullName, email, departmentId },
      {
        onSuccess: (member) => {
          assign(role, member.id)
          setAdding(null)
        },
      }
    )
  }

  const addToCrew = (role: Role): PickAction => ({
    icon: IconUserPlus,
    label: (query) => (query ? `Añadir «${query}» al equipo…` : "Añadir a alguien al equipo…"),
    onSelect: (name) => setAdding({ role, mode: "crew", name }),
  })
  const inviteGuest: PickAction = {
    icon: IconMail,
    label: () => "Invitar a alguien de fuera…",
    onSelect: (name) => setAdding({ role: "guest", mode: "guest", name }),
  }
  const miniForm = (role: Role) =>
    adding?.role === role && (
      <NewPersonForm
        key={`${adding.mode}-${adding.name}`}
        mode={adding.mode}
        initialName={adding.name}
        departments={departments}
        pending={createMember.isPending}
        onCancel={() => setAdding(null)}
        onAdd={addPerson}
      />
    )
  const personChip = (id: string, onRemove: () => void) => (
    <Chip key={id} label={nameOf(id)} onRemove={onRemove} />
  )
  const emptyCrew =
    crew.length === 0
      ? "El equipo del proyecto todavía está vacío."
      : "No hay nadie con ese nombre."

  return (
    <FoldSection
      icon={IconUsers}
      title="Personas"
      summary={peopleSummary(people, nameOf)}
      invalid={errors != null}
      changed={changed}
    >
      <PeopleField id="people-responsible" label="Responsable">
        <PeoplePicker
          id="people-responsible"
          label="Responsable"
          group="Equipo"
          placeholder={people.responsibleId ? "Cambiar…" : "Elige del equipo"}
          empty={emptyCrew}
          options={crew.filter((member) => !assigned.has(member.id)).map(optionOf)}
          chips={
            people.responsibleId &&
            personChip(people.responsibleId, () => update({ responsibleId: null }))
          }
          actions={[addToCrew("responsible")]}
          onPick={(id) => assign("responsible", id)}
        />
      </PeopleField>
      {miniForm("responsible")}
      <PeopleField id="people-executors" label="Ejecutantes" error={errors?.executorIds}>
        <PeoplePicker
          id="people-executors"
          label="Ejecutantes"
          group="Equipo"
          placeholder="Añadir del equipo…"
          empty={emptyCrew}
          invalid={errors?.executorIds != null}
          options={crew.filter((member) => !assigned.has(member.id)).map(optionOf)}
          chips={people.executorIds.map((id) =>
            personChip(id, () =>
              update({ executorIds: people.executorIds.filter((other) => other !== id) })
            )
          )}
          actions={[addToCrew("executor")]}
          onPick={(id) => assign("executor", id)}
        />
      </PeopleField>
      {miniForm("executor")}
      <PeopleField id="people-departments" label="Departamentos" error={errors?.departmentIds}>
        <PeoplePicker
          id="people-departments"
          label="Departamentos"
          group="Departamentos"
          placeholder="Añadir…"
          empty="No hay ninguno con ese nombre."
          invalid={errors?.departmentIds != null}
          options={departments
            .filter((department) => !people.departmentIds.includes(department.id))
            .map((department) => ({ id: department.id, label: department.name }))}
          chips={people.departmentIds.map((id) => (
            <Chip
              key={id}
              variant="department"
              label={departmentName.get(id) ?? "Departamento borrado"}
              onRemove={() =>
                update({ departmentIds: people.departmentIds.filter((other) => other !== id) })
              }
            />
          ))}
          onPick={(id) => update({ departmentIds: [...people.departmentIds, id] })}
        />
      </PeopleField>
      <PeopleField
        id="people-guests"
        label="Participantes"
        hint="reciben la convocatoria"
        error={errors?.guests}
      >
        <PeoplePicker
          id="people-guests"
          label="Participantes"
          group="Equipo"
          placeholder="Del equipo o de fuera…"
          empty={emptyCrew}
          invalid={errors?.guests != null}
          options={crew.filter((member) => !guestCrew.has(member.id)).map(optionOf)}
          chips={people.guests.map((guest, index) => {
            const remove = () =>
              update({ guests: people.guests.filter((_, other) => other !== index) })
            return guest.crewMemberId ? (
              personChip(guest.crewMemberId, remove)
            ) : (
              <Chip
                key={guest.email}
                variant="external"
                icon={IconMail}
                label={guest.fullName ?? ""}
                detail={guest.email ?? undefined}
                onRemove={remove}
              />
            )
          })}
          actions={[addToCrew("guest"), inviteGuest]}
          onPick={(id) => assign("guest", id)}
        />
      </PeopleField>
      {miniForm("guest")}
      <FieldError errors={[errors?.root, errors?.message ? errors : undefined]} />
    </FoldSection>
  )
}
