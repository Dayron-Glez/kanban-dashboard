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
import { useState } from "react";

interface Props {
  task: Task;
  deleteTask: (id: number | string) => void;
  updateTask: (id: number | string, content: string) => void;
}

export default function TaskCard({ task, deleteTask, updateTask }: Props) {
  const [editMode, setEditMode] = useState<boolean>(false);

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
        className="bg-mainBg h-24 min-h-24 justify-center border-2 border-rose-500 cursor-grab text-md text-white rounded-lg font-bold p-2 my-2 opacity-40"
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-mainBg h-24 min-h-24 justify-center hover:ring-2 hover:ring-inset hover:ring-rose-500 cursor-grab text-md text-white rounded-lg font-bold p-2 my-2 border-transparent"
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
                        variant="ghost"
                        size="icon-sm"
                        className="group hover:bg-transparent"
                      >
                        <IconTrash className="group-hover:stroke-rose-500" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>

                  <TooltipContent>Delete Task</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <AlertDialogContent className="bg-columnBg border-transparent">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">
                    Delete task?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-white">
                    This action cannot be undone. The task will be permanently
                    removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-rose-500 border-none hover:bg-transparent hover:ring-2 hover:ring-inset hover:ring-rose-500 hover:text-white">
                    Cancel
                  </AlertDialogCancel>

                  <AlertDialogAction
                    className="bg-rose-500 hover:bg-transparent hover:ring-2 hover:ring-inset hover:ring-rose-500"
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
