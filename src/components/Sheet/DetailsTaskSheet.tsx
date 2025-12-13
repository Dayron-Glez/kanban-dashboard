import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "@/types";
import { IconEye } from "@tabler/icons-react";
interface EditTaskSheetProps {
  task: Task;
}

export function DetailsTaskSheet({ task }: EditTaskSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="group hover:bg-transparent"
        >
          <IconEye className="group-hover:stroke-rose-500" />
        </Button>
      </SheetTrigger>

      <SheetContent className="bg-columnBg border-transparent flex flex-col justify-between">
        {/* Header + Textarea */}
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-white">View Task Details</SheetTitle>
          </SheetHeader>

          <div className="mt-4 px-2">
            <Textarea value={task.content} className="min-h-32 max-h-96" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
