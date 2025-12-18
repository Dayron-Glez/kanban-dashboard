import { useState } from "react";
import type { Task } from "@/types";
import { Card, CardHeader, CardTitle } from "./ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import { IconDots, IconTrash, IconEye, IconEdit } from "@tabler/icons-react";
import { EditTaskSheet } from "./Sheet/EditTaskSheet";
import { DetailsTaskSheet } from "./Sheet/DetailsTaskSheet";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Props {
  task: Task;
  deleteTask: (id: number | string) => void;
  updateTask: (id: number | string, content: string) => void;
}

export default function TaskCard({ task, deleteTask, updateTask }: Props) {
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
        className="bg-sky/10 h-24 min-h-24 justify-center hover:border-sky cursor-grab text-md rounded-lg font-bold p-2 my-2"
      >
        <CardHeader className="p-0 flex">
          <CardTitle className="flex items-center justify-between w-full">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-64 truncate block">{task.content}</span>
                </TooltipTrigger>
                <TooltipContent>{task.content}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex">
              <DropdownMenu modal={false}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          aria-label="Open menu"
                          size="icon-sm"
                          className=" hover:bg-transparent"
                        >
                          <IconDots />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Actions</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent className="w-40" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className=" hover:bg-transparent"
                      >
                        <IconEye />
                      </Button>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className=" hover:bg-transparent"
                      >
                        <IconEdit />
                      </Button>
                      Edit Task
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleteDialogOpen(true)}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className=" hover:bg-transparent"
                      >
                        <IconTrash className=" text-destructive" />
                      </Button>
                      Delete Task
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
        taskId={task.id}
        initialContent={task.content}
        onSave={updateTask}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/60"
              onClick={() => deleteTask(task.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
