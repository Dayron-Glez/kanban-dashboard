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
} from "@/shared/index"

interface DiscardDialogProps {
  open: boolean
  name: string
  changes: number
  /** La acción aún no existe: lo que se pierde es la acción entera. */
  creating?: boolean
  onStay: () => void
  onDiscard: () => void
}

/** Salir del panel con cambios sin guardar: se pregunta antes de perderlos. */
export function DiscardDialog({
  open,
  name,
  changes,
  creating = false,
  onStay,
  onDiscard,
}: Readonly<DiscardDialogProps>) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onStay()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-semibold">
            {creating ? "¿Descartar la acción nueva?" : "¿Descartar los cambios?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {creating ? (
              <>“{name}” todavía no se ha creado. Si sales, se pierde.</>
            ) : (
              <>
                Tienes {changes} {changes === 1 ? "cambio sin guardar" : "cambios sin guardar"} en “
                {name}”. Si sales, se pierden.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>Seguir editando</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className={buttonVariants({ variant: "destructive" })}
          >
            Descartar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
