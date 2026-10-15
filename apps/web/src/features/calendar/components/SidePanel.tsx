import type { ReactNode } from "react"
import { ScrollArea, Sheet, SheetContent, SheetFooter, SheetHeader } from "@/shared/index"

interface SidePanelProps {
  /** La cabecera: la ruta o la fecha, y el título (SheetTitle). */
  header: ReactNode
  /** Botones junto a la X, como pasar al anterior o al siguiente. */
  actions?: ReactNode
  /** El pie, fijo abajo: Guardar, Cancelar, Nueva acción… */
  footer?: ReactNode
  onClose: () => void
  children: ReactNode
}

// Lo que se pulsa sin cerrar el panel: el calendario, para seguir trabajando con
// él abierto, y los avisos (toasts).
const KEEPS_OPEN = "[data-calendar-surface], [data-sonner-toaster]"

/**
 * El armazón de los paneles de la derecha, sobre el Sheet de shadcn: 520 px,
 * cabecera, cuerpo con scroll y pie fijo. No es modal: el calendario se sigue
 * tocando con él abierto. Esc, la X o pulsar fuera del calendario lo cierran.
 */
export function SidePanel({
  header,
  actions,
  footer,
  onClose,
  children,
}: Readonly<SidePanelProps>) {
  return (
    <Sheet open modal={false} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[520px] gap-0 sm:max-w-[520px]"
        // El foco se queda donde estaba, para seguir con el teclado en el calendario.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if ((event.target as HTMLElement | null)?.closest(KEEPS_OPEN)) event.preventDefault()
        }}
      >
        <SheetHeader className="border-border flex-row items-start gap-2 border-b px-5 pt-4 pb-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">{header}</div>
          {actions && <div className="mr-7 flex shrink-0 items-center gap-1">{actions}</div>}
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-6 px-5 py-5">{children}</div>
        </ScrollArea>
        {footer && (
          <SheetFooter className="border-border mt-0 flex-row items-center gap-2 border-t px-5 py-3">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
