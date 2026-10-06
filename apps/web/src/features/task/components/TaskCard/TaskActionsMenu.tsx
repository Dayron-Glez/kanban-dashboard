import { IconDots, IconEdit, IconEye, IconTrash } from "@tabler/icons-react"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/index"

interface TaskActionsMenuProps {
  onViewDetails: () => void
  onEdit: () => void
  onDelete: () => void
}

export function TaskActionsMenu({
  onViewDetails,
  onEdit,
  onDelete,
}: Readonly<TaskActionsMenuProps>) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground hover:bg-muted -mr-1.5 shrink-0"
          aria-label="Abrir menú de acciones"
        >
          <IconDots size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onViewDetails}>
            <IconEye size={14} />
            Ver Detalles
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onEdit}>
            <IconEdit size={14} />
            Editar Tarea
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <IconTrash size={14} />
            Eliminar Tarea
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
