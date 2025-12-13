import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "@/types";
import { IconEye } from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface EditTaskSheetProps {
  task: Task;
}

export function DetailsTaskSheet({ task }: EditTaskSheetProps) {
  return (
    <Sheet>
      <TooltipProvider>
        <Tooltip>
          <SheetTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="group hover:bg-transparent"
              >
                <IconEye className="group-hover:stroke-rose-500" />
              </Button>
            </TooltipTrigger>
          </SheetTrigger>
          <TooltipContent>View Task Details</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SheetContent className="bg-columnBg border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-white">View Task Details</SheetTitle>
             <SheetDescription className="text-white"/>
          </SheetHeader>

          <div className="mt-4 px-2">
            <Textarea
              value={task.content}
              readOnly
              className="min-h-32 max-h-96"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
