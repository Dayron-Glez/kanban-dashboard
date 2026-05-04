// src/features/task/components/TaskCard.tsx
import { useState } from "react"
import { IconDots, IconTrash, IconEye, IconEdit } from "@tabler/icons-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Button,
} from "@/shared/index"
import { type Task } from "@/features/board/index"
import { type TaskFormValues } from "../schemas/task.schema"
import { DetailsTaskSheet } from "./DetailsTaskSheet"
import { EditTaskSheet } from "./EditTaskSheet"
import { PRIORITY_CONFIG, SIZE_CONFIG } from "./taskChips"

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface Props {
  task: Task
  deleteTask: (id: string) => void
  updateTask: (id: string, taskData: TaskFormValues) => void
}

export function TaskCard({ task, deleteTask, updateTask }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  })

  const style = { transition, transform: CSS.Transform.toString(transform) }

  const priority = PRIORITY_CONFIG[task.priority]
  const size = SIZE_CONFIG[task.size]

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`border border-l-4 border-dashed ${priority.borderClassName} bg-muted/30 min-h-[72px] rounded-[10px] opacity-60`}
      />
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`border border-l-4 ${priority.borderClassName} ${priority.bgClassName} flex cursor-grab flex-col gap-2 rounded-[10px] px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md`}
      >
        {/* Fila superior: título + menú */}
        <div className="flex items-center gap-2">
          <span className="text-foreground line-clamp-2 flex-1 text-sm leading-snug font-medium">
            {task.content}
          </span>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                aria-label="Abrir menú de acciones"
              >
                <IconDots size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>
                  <IconEye size={14} />
                  Ver Detalles
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <IconEdit size={14} />
                  Editar Tarea
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteDialogOpen(true)}>
                  <IconTrash size={14} />
                  Eliminar Tarea
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Fila inferior: badges + avatar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority.className}`}
            >
              {priority.label}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${size.className}`}
            >
              {size.label}
            </span>
          </div>

          {task.assigneeProfile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-6 w-6 shrink-0 cursor-default items-center justify-center rounded-full border border-white bg-violet-100 text-[9px] font-bold text-violet-600 shadow-sm">
                    {getInitials(task.assigneeProfile.full_name)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {task.assigneeProfile.full_name ?? "Sin nombre"}
                  </span>
                  {task.assigneeProfile.email && (
                    <span className="text-xs opacity-75">{task.assigneeProfile.email}</span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <DetailsTaskSheet task={task} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <EditTaskSheet task={task} onSave={updateTask} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La tarea será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTask(task.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
