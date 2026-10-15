import type { ActionKind } from "@repo/contracts"
import { IconAlertTriangle, IconTrash } from "@tabler/icons-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  buttonVariants,
  cn,
} from "@/shared/index"
import { describeAction } from "../lib/actionStyle"
import { ELEMENT_KIND_LABELS } from "../lib/elementTree"
import { formatLongDate } from "../lib/planFormat"
import { ActionGlyph } from "./ActionGlyph"

/** Lo que se enseña de la acción que se va a borrar. */
export interface DeletedAction {
  kind: ActionKind
  name: string
  startsOn: string | null
  endsOn: string | null
  /** De qué cuelga. */
  parent: string | null
}

interface DeleteActionDialogProps {
  /** La acción que se va a borrar; sin ella, el diálogo está cerrado. */
  action: DeletedAction | null
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Borrar una acción pide confirmación, se borre desde el panel o desde el Gantt:
 * no se puede deshacer. La cabecera roja avisa antes de leer nada. Se abre sin
 * foco en los botones, para no borrar ni cancelar por inercia; Esc cancela y, al
 * cerrar, el foco vuelve a donde estaba.
 */
export function DeleteActionDialog({
  action,
  onCancel,
  onConfirm,
}: Readonly<DeleteActionDialogProps>) {
  const when =
    action?.startsOn &&
    (action.endsOn && action.endsOn !== action.startsOn
      ? `${formatLongDate(action.startsOn)} → ${formatLongDate(action.endsOn)}`
      : formatLongDate(action.startsOn))

  return (
    <AlertDialog open={action != null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).focus()
        }}
        className="gap-0 overflow-hidden p-0 outline-none sm:max-w-md"
      >
        <AlertDialogHeader className="bg-destructive/10 border-destructive/30 flex-row items-center gap-3 border-b px-5 py-4 text-left">
          <IconAlertTriangle aria-hidden className="text-destructive size-5 shrink-0" />
          <AlertDialogTitle className="text-base font-semibold">
            ¿Borrar {action && describeAction(action)}?
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 px-5 pt-4 pb-5">
          {action && (
            <div className="border-border bg-muted/40 flex items-center gap-2.5 rounded-lg border px-3 py-2">
              <ActionGlyph kind={action.kind} />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{ELEMENT_KIND_LABELS[action.kind]}</span>
                <span className="text-muted-foreground truncate text-xs first-letter:uppercase">
                  {[when, action.parent && `en ${action.parent}`].filter(Boolean).join(" · ")}
                </span>
              </span>
            </div>
          )}
          <AlertDialogDescription className="text-sm">
            Se quita del plan y no se puede deshacer.
          </AlertDialogDescription>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              // Rojo sólido también en oscuro: el de shadcn se apaga y resta alerta.
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "dark:bg-destructive dark:hover:bg-destructive/90"
              )}
            >
              <IconTrash aria-hidden />
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
