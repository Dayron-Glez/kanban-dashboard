import type { Task } from "@/types";
import { Card, CardHeader, CardTitle } from "./ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface Props {
    task: Task;
}

export default function TaskCard({task}: Props) {
  return (
    <Card
      key={task.id}
      className="bg-mainBg text-md text-white rounded-lg font-bold p-2 my-2 border-transparent"
    >
      <CardHeader className="p-0 pb-0! flex ">
        <CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-48 cursor-help truncate block">
                  {task.content}
                </span>
              </TooltipTrigger>
              <TooltipContent>{task.content}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
