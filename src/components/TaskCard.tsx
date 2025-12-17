import type { Task } from "@/types";
import { Card, CardHeader, CardTitle } from "./ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import { IconTrash } from "@tabler/icons-react";
import { EditTaskSheet } from "./Sheet/EditTaskSheet";
import { DetailsTaskSheet } from "./Sheet/DetailsTaskSheet";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface Props {
  task: Task;
  deleteTask: (id: number | string) => void;
  updateTask: (id: number | string, content: string) => void;
}

export default function TaskCard({ task, deleteTask, updateTask }: Props) {
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
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-card h-24 min-h-24 justify-center hover:border-sky cursor-grab text-md rounded-lg font-bold p-2 my-2"
    >
      <CardHeader className="p-0 flex">
        <CardTitle className="flex items-center justify-between w-full">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-48 truncate block cursor-default">
                  {task.content}
                </span>
              </TooltipTrigger>
              <TooltipContent>{task.content}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex">
            <DetailsTaskSheet task={task} />
            <EditTaskSheet
              taskId={task.id}
              initialContent={task.content}
              onSave={updateTask}
            />
            <AlertDialog>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <IconTrash />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>

                  <TooltipContent>Delete Task</TooltipContent>
                </Tooltip>
              </TooltipProvider>

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
                    className=" bg-destructive text-destructive-foreground hover:bg-destructive/60"
                    onClick={() => deleteTask(task.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
