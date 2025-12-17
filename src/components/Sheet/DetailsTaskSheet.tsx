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
                type="button"
                variant="ghost"
                size="icon-lg"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <IconEye />
              </Button>
            </TooltipTrigger>
          </SheetTrigger>
          <TooltipContent>View Task Details</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className=" font-semibold text-primary">
              View Task Details
            </SheetTitle>
            <SheetDescription />
          </SheetHeader>
          <div className="mt-4 px-2">
            <Textarea
              value={task.content}
              readOnly
              disabled
              className="min-h-32 max-h-96 bg-muted"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
