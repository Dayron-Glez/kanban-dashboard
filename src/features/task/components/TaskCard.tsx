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
  Card,
  CardHeader,
  CardTitle,
} from "@/shared/index";
import { type Task } from "@/features/board/index";
import { type TaskFormValues } from "../schemas/task.schema";
import { DetailsTaskSheet } from "./DetailsTaskSheet";
import { EditTaskSheet } from "./EditTaskSheet";

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
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-card h-24 min-h-24 justify-center border-sky cursor-grab text-md rounded-lg font-bold p-2 my-2 opacity-40"
      />
    );
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-sky/10 min-h-24 justify-center hover:border-sky cursor-grab text-md rounded-lg font-bold p-2 my-2"
      >
        <CardHeader className="p-0 flex">
          <CardTitle className="flex items-center justify-between w-full">
            <div className="flex-1">
              <span className="max-w-56 line-clamp-3 text-ellipsis block mb-2">
                {task.content}
              </span>
              <div className="flex gap-2 flex-wrap">
                <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded uppercase">
                  {task.priority}
                </span>
                <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded uppercase">
                  {task.size}
                </span>
              </div>
              {task.assigneeProfile && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-semibold shrink-0">
                    {getInitials(task.assigneeProfile.full_name)}
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {task.assigneeProfile.full_name ?? "Sin nombre"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex self-start">
              <DropdownMenu modal={false}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          aria-label="Abrir menú de acciones"
                          size="icon-sm"
                          className="hover:bg-transparent"
                        >
                          <IconDots />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Acciones</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent className="w-40" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="hover:bg-transparent"
                      >
                        <IconEye />
                      </Button>
                      Ver Detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="hover:bg-transparent"
                      >
                        <IconEdit />
                      </Button>
                      Editar Tarea
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleteDialogOpen(true)}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="hover:bg-transparent"
                      >
                        <IconTrash className="text-destructive" />
                      </Button>
                      Eliminar Tarea
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <DetailsTaskSheet
        task={task}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <EditTaskSheet
        task={task}
        onSave={updateTask}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>¿ Eliminar Tarea ?</AlertDialogTitle>
          <AlertDialogHeader>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La tarea será eliminada
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/60"
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
