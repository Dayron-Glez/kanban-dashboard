import { useState } from "react"
import type { CalendarPlan } from "@repo/contracts"
import { toIsoDate, type ScheduleChange } from "@repo/domain"
import { IconAlertTriangle, IconChevronDown } from "@tabler/icons-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  cn,
} from "@/shared/index"
import { formatPlanDate } from "../lib/planFormat"
import { summarizeMoves } from "../lib/planPreview"

export interface PendingChange {
  /** Qué se va a cambiar: «Mover Rodaje al 12 abr 2027». */
  title: string
  moved: ScheduleChange[]
  /** Nombres de lo que pasa a empezar fuera de su fase, con la fase. */
  outside: { name: string; parent: string }[]
}

interface ChangePreviewDialogProps {
  pending: PendingChange | null
  plan: CalendarPlan
  onConfirm: () => void
  onCancel: () => void
}

const day = (value: number | null) => (value == null ? "—" : formatPlanDate(toIsoDate(value)))

const elementsLabel = (count: number) => (count === 1 ? "1 elemento" : `${count} elementos`)

/** Antes de guardar: cuánto se mueve el plan, por fases, y las fechas si se piden. */
export function ChangePreviewDialog({
  pending,
  plan,
  onConfirm,
  onCancel,
}: Readonly<ChangePreviewDialogProps>) {
  const [showDates, setShowDates] = useState<boolean>(false)
  const moved = pending?.moved ?? []
  const summary = summarizeMoves(moved, plan)
  const nameOf = (id: string) => plan.elements.find((element) => element.id === id)?.name ?? id

  const close = () => {
    setShowDates(false)
    onCancel()
  }

  return (
    <AlertDialog open={pending != null} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent className="gap-4 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-semibold">{pending?.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            Revisa lo que cambia antes de aplicarlo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {moved.length > 0 && (
          <div className="bg-muted/50 rounded-lg px-3 py-2.5 text-sm">
            {summary.headline ? (
              <>
                <span className="font-semibold tabular-nums">{summary.headline}</span>
                <span className="text-muted-foreground"> para {elementsLabel(moved.length)}</span>
              </>
            ) : (
              <span className="font-medium">{elementsLabel(moved.length)} cambian de fechas</span>
            )}
          </div>
        )}

        {summary.groups.length > 0 && (
          <ul aria-label="Por fases" className="flex flex-col gap-1.5 text-sm">
            {summary.groups.map((group) => (
              <li key={group.phaseId} className="flex items-center gap-2">
                <span
                  className="h-3.5 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color ?? "var(--muted-foreground)" }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">
                  {group.name}
                  <span className="text-muted-foreground"> · {elementsLabel(group.count)}</span>
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">{group.label}</span>
              </li>
            ))}
          </ul>
        )}

        {pending && pending.outside.length > 0 && (
          <ul className="flex flex-col gap-1">
            {pending.outside.map(({ name, parent }) => (
              <li key={name} className="text-warn flex items-start gap-2 text-xs">
                <IconAlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
                {name} pasa a empezar fuera de {parent}.
              </li>
            ))}
          </ul>
        )}

        {moved.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              aria-expanded={showDates}
              onClick={() => setShowDates((open) => !open)}
              className="text-primary flex w-fit items-center gap-1 text-xs font-medium hover:underline"
            >
              {showDates ? "Ocultar las fechas" : `Ver las ${moved.length} fechas`}
              <IconChevronDown
                size={12}
                className={cn("transition-transform", showDates && "rotate-180")}
                aria-hidden
              />
            </button>
            {showDates && (
              <div className="border-border max-h-64 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 text-muted-foreground sticky top-0 text-left">
                    <tr>
                      <th className="px-2.5 py-1.5 font-medium">Elemento</th>
                      <th className="px-2.5 py-1.5 font-medium">Antes</th>
                      <th className="px-2.5 py-1.5 font-medium">Después</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {moved.map((change) => {
                      // La fecha que cambia: el inicio, o el fin si el inicio se queda.
                      const point = change.startShift ? "start" : "end"
                      const prefix = point === "end" ? "fin " : ""
                      return (
                        <tr
                          key={change.id}
                          className={cn(change.leavesParent && "bg-warn-soft/40 text-warn")}
                        >
                          <td className="max-w-44 truncate px-2.5 py-1.5">{nameOf(change.id)}</td>
                          <td className="text-muted-foreground px-2.5 py-1.5 whitespace-nowrap tabular-nums">
                            {prefix}
                            <s>{day(change.before[point])}</s>
                          </td>
                          <td className="px-2.5 py-1.5 whitespace-nowrap tabular-nums">
                            {prefix}
                            {day(change.after[point])}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={close}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowDates(false)
              onConfirm()
            }}
          >
            Aplicar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
