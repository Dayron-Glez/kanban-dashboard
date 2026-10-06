// src/features/task/components/TaskCard.tsx
import { useCallback, useState } from "react"
import { IconDots, IconTrash, IconEye, IconEdit } from "@tabler/icons-react"
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/utils/combine"
import { attachClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge/attach-closest-edge"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge/extract-closest-edge"
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types"
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
  TooltipTrigger,
  Button,
} from "@/shared/index"
import { isTaskDragData, taskDragData, type Task } from "@/features/board/index"
import { type TaskFormValues } from "../schemas/task.schema"
import { DetailsTaskSheet } from "./DetailsTaskSheet"
import { DueDateChip } from "./DueDateChip"
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

interface TaskCardProps {
  task: Task
  deleteTask: (id: string) => void
  updateTask: (id: string, taskData: TaskFormValues) => void
}

export function TaskCard({ task, deleteTask, updateTask }: Readonly<TaskCardProps>) {
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false)
  const [editOpen, setEditOpen] = useState<boolean>(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dropEdge, setDropEdge] = useState<Edge | null>(null)

  // La tarjeta es a la vez lo que se arrastra y un sitio donde soltar otra.
  // El borde más cercano al puntero decide si la soltada queda encima o debajo.
  //
  // Ref callback y no efecto: el registro va atado al elemento, así que React
  // lo hace al montarlo y deshace con la limpieza al desmontarlo. useCallback
  // es imprescindible: cada arrastre provoca renders (el hueco, la línea), y un
  // callback nuevo en cada uno desregistraría la tarjeta en mitad del arrastre.
  const dragRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return

      return combine(
        draggable({
          element,
          getInitialData: () => taskDragData(task.id, task.columnId),
          onDragStart: () => setIsDragging(true),
          onDrop: () => setIsDragging(false),
        }),
        dropTargetForElements({
          element,
          canDrop: ({ source }) => isTaskDragData(source.data) && source.data.taskId !== task.id,
          getData: ({ input }) =>
            attachClosestEdge(taskDragData(task.id, task.columnId), {
              element,
              input,
              allowedEdges: ["top", "bottom"],
            }),
          onDrag: ({ self }) => setDropEdge(extractClosestEdge(self.data)),
          onDragLeave: () => setDropEdge(null),
          onDrop: () => setDropEdge(null),
        })
      )
    },
    [task.id, task.columnId]
  )

  const priority = PRIORITY_CONFIG[task.priority]
  const size = SIZE_CONFIG[task.size]

  return (
    <>
      <div ref={dragRef} className="relative py-[3.5px]">
        {dropEdge && (
          <div
            className={`bg-primary pointer-events-none absolute inset-x-0 h-0.5 rounded-full ${
              dropEdge === "top" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2"
            }`}
          />
        )}
        <div
          className={`border border-l-4 ${priority.borderClassName} ${priority.bgClassName} flex cursor-grab flex-col gap-2 rounded-[10px] px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md ${
            isDragging ? "opacity-40" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-foreground line-clamp-2 flex-1 text-[13px] leading-snug font-medium">
              {task.content}
            </span>
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
                  <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>
                    <IconEye size={14} />
                    Ver Detalles
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                    <IconEdit size={14} />
                    Editar Tarea
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleteDialogOpen(true)}
                  >
                    <IconTrash size={14} />
                    Eliminar Tarea
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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
              <DueDateChip dueDate={task.due_date} />
            </div>

            {task.assigneeProfile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-primary/15 text-primary flex h-5.5 w-5.5 shrink-0 cursor-default items-center justify-center rounded-full text-[9px] font-extrabold">
                    {getInitials(task.assigneeProfile.full_name)}
                  </div>
                </TooltipTrigger>

                <TooltipContent
                  side="top"
                  align="end"
                  sideOffset={6}
                  className="flex flex-col gap-0.5"
                >
                  <span className="font-medium">
                    {task.assigneeProfile.full_name ?? "Sin nombre"}
                  </span>
                  {task.assigneeProfile.email && (
                    <span className="text-xs opacity-75">{task.assigneeProfile.email}</span>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
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
