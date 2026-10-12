import type { CalendarElement } from "@repo/contracts"
import { toIsoDate, type ScheduleChange } from "@repo/domain"
import { IconAlertTriangle } from "@tabler/icons-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/index"
import { formatPlanDate } from "../lib/planFormat"
import { groupMoves } from "../lib/planPreview"

export interface PendingChange {
  moved: ScheduleChange[]
  /** Nombres de lo que pasa a empezar fuera de su fase, con la fase. */
  outside: { name: string; parent: string }[]
}

interface ChangePreviewDialogProps {
  pending: PendingChange | null
  elements: CalendarElement[]
  onConfirm: () => void
  onCancel: () => void
}

const day = (value: number | null) => (value == null ? "—" : formatPlanDate(toIsoDate(value)))

/** «Este cambio mueve N fechas»: lo que se adelanta o se retrasa, antes de guardarlo. */
export function ChangePreviewDialog({
  pending,
  elements,
  onConfirm,
  onCancel,
}: Readonly<ChangePreviewDialogProps>) {
  const nameOf = (id: string) => elements.find((element) => element.id === id)?.name ?? id
  const count = pending?.moved.length ?? 0

  return (
    <AlertDialog open={pending != null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {count === 0
              ? "Este cambio saca un elemento de su fase"
              : `Este cambio mueve ${count === 1 ? "1 elemento" : `${count} elementos`}`}
          </AlertDialogTitle>
          <AlertDialogDescription>Revisa lo que cambia antes de guardarlo.</AlertDialogDescription>
        </AlertDialogHeader>

        {pending && pending.outside.length > 0 && (
          <ul className="flex flex-col gap-1">
            {pending.outside.map(({ name, parent }) => (
              <li key={name} className="text-warn flex items-start gap-2 text-sm">
                <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                {name} pasa a empezar fuera de {parent}.
              </li>
            ))}
          </ul>
        )}

        {count > 0 && (
          <div className="border-border max-h-80 divide-y overflow-y-auto rounded-md border text-sm">
            {groupMoves(pending!.moved).map((group) => (
              <details key={group.label} open={group.changes.length <= 5} className="group">
                <summary className="hover:bg-muted/60 flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
                  <span className="font-medium">{group.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {group.changes.length === 1
                      ? nameOf(group.changes[0]!.id)
                      : `${group.changes.length} elementos`}
                  </span>
                </summary>
                <ul className="flex flex-col gap-1 px-3 pb-2">
                  {group.changes.map((change) => (
                    <li
                      key={change.id}
                      className="flex items-baseline justify-between gap-2 text-xs"
                    >
                      <span>{nameOf(change.id)}</span>
                      <span className="text-muted-foreground">
                        {day(change.before.start)} – {day(change.before.end)} →{" "}
                        <span className="text-foreground">
                          {day(change.after.start)} – {day(change.after.end)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Guardar el cambio</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
