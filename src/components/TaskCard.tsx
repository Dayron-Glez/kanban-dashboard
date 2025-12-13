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

interface Props {
  task: Task;
  deleteTask: (id: number | string) => void;
  updateTask: (id: number | string, content: string) => void;
}

export default function TaskCard({ task, deleteTask, updateTask }: Props) {
  return (
    <Card className="bg-mainBg h-24 min-h-24 justify-center hover:ring-2 hover:ring-inset hover:ring-rose-500 cursor-grab text-md text-white rounded-lg font-bold p-2 my-2 border-transparent">
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => deleteTask(task.id)}
                    variant="ghost"
                    size="icon-sm"
                    className="group hover:bg-transparent"
                  >
                    <IconTrash className="group-hover:stroke-rose-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Task</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
