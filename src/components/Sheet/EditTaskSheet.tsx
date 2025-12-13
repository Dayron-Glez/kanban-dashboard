import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { IconEdit, IconEye } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";

interface EditTaskSheetProps {
  taskId: string | number;
  initialContent: string;
  onSave: (id: string | number, content: string) => void;
}

export function EditTaskSheet({
  taskId,
  initialContent,
  onSave,
}: EditTaskSheetProps) {
  const [editedContent, setEditedContent] = useState(initialContent);

  // Resetear contenido cada vez que se abre
  useEffect(() => {
    setEditedContent(initialContent);
  }, [initialContent]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="group hover:bg-transparent"
              >
                <IconEdit className="group-hover:stroke-rose-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit Task</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SheetTrigger>

      <SheetContent className="bg-columnBg border-transparent flex flex-col justify-between">
        {/* Header + Textarea */}
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-white">Edit Task</SheetTitle>
            <SheetDescription className="text-white">
              Modify the content of this task and click save.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 px-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-32 max-h-96"
            />
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="grid grid-cols-2 mt-6 gap-2">
          <SheetClose asChild>
            <Button
              className="bg-rose-500 hover:bg-transparent hover:ring-2 hover:ring-inset hover:ring-rose-500"
              type="button"
              onClick={() => onSave(taskId, editedContent)}
            >
              Save changes
            </Button>
          </SheetClose>

          <SheetClose asChild>
            <Button
              type="button"
              className="bg-rose-500 hover:bg-transparent hover:ring-2 hover:ring-inset hover:ring-rose-500"
            >
              Close
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
