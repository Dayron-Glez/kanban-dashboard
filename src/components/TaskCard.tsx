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
import { useState } from "react";

interface Props {
  task: Task;
  deleteTask: (id: number | string) => void;
}

export default function TaskCard({ task, deleteTask }: Props) {
  const [deleteButtonVisible, setDeleteButtonVisible] =
    useState<boolean>(false);

  return (
    <Card
      onMouseEnter={() => setDeleteButtonVisible(true)}
      onMouseLeave={() => setDeleteButtonVisible(false)}
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

            <Button
			  onClick={() => deleteTask(task.id)}
              variant="ghost"
              type="button"
              className={`
                group ml-2 hover:bg-transparent
                transition-all duration-300 ease-out
                ${deleteButtonVisible ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"}
              `}
            >
              <IconTrash className="group-hover:stroke-rose-500" />
            </Button>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
