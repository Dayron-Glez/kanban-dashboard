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
import { IconEdit } from "@tabler/icons-react";
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
  const [editedContent, setEditedContent] = useState<string>(initialContent);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    setEditedContent(initialContent);
  }, [initialContent]);

  const handleOpenChange = (isOpen: boolean): void => {
    setOpen(isOpen);
    if (isOpen) {
      setEditedContent(initialContent);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <IconEdit />
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>Edit Task</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className=" text-primary font-semibold">
              Edit Task
            </SheetTitle>
            <SheetDescription>
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

        <SheetFooter className="grid grid-cols-2 mt-6 gap-2">
          <SheetClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button
              variant="default"
              type="button"
              onClick={() => onSave(taskId, editedContent)}
            >
              Save changes
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
