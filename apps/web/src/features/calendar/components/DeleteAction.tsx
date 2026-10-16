import { IconTrash } from "@tabler/icons-react"
import { Button } from "@/shared/index"

/** El botón de borrar del panel: la confirmación la pide quien lo usa. */
export function DeleteAction({
  disabled,
  onDelete,
}: Readonly<{ disabled: boolean; onDelete: () => void }>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onDelete}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <IconTrash aria-hidden />
      Borrar
    </Button>
  )
}
