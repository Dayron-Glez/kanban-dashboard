// src/features/task/components/TaskCard.tsx
import { useState } from "react";
import { IconDots, IconTrash, IconEye, IconEdit } from "@tabler/icons-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
} from "@/shared/index";
import { type Task } from "@/features/board/index";
import { type TaskFormValues } from "../schemas/task.schema";
import { DetailsTaskSheet } from "./DetailsTaskSheet";
import { EditTaskSheet } from "./EditTaskSheet";
import { PRIORITY_CONFIG, SIZE_CONFIG } from "./taskChips";

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

interface Props {
  task: Task;
  deleteTask: (id: string) => void;
  updateTask: (id: string, taskData: TaskFormValues) => void;
}

export function TaskCard({ task, deleteTask, updateTask }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: "task", task } });

  const style = { transition, transform: CSS.Transform.toString(transform) };

  const priority = PRIORITY_CONFIG[task.priority];
  const size = SIZE_CONFIG[task.size];

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="border border-dashed border-border rounded-lg min-h-[72px] bg-muted/50 my-2 opacity-60"
      />
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md hover:border-muted-foreground/30 transition-all cursor-grab my-2 p-3 flex flex-col gap-2"
      >
        {/* Fila superior: título + menú */}
        <div className="flex items-start gap-2">
          <span className="flex-1 text-sm font-medium text-foreground leading-snug line-clamp-2">
            {task.content}
          </span>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
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

        {/* Fila inferior: badges + avatar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priority.className}`}>
              {priority.label}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${size.className}`}>
              {size.label}
            </span>
          </div>

          {task.assigneeProfile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-6 w-6 rounded-full bg-violet-100 text-violet-600 text-[9px] font-bold flex items-center justify-center shrink-0 cursor-default border border-white shadow-sm">
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
          <AlertDialogTitle>¿Eliminar Tarea?</AlertDialogTitle>
          <AlertDialogHeader>
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
  );
}
