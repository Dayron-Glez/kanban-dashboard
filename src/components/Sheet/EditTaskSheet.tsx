import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

interface EditTaskSheetProps {
  taskId: string | number;
  initialContent: string;
  onSave: (id: string | number, content: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditTaskSheet({
  taskId,
  initialContent,
  onSave,
  open,
  onOpenChange,
}: EditTaskSheetProps) {
  const [editedContent, setEditedContent] = useState<string>(initialContent);

  // Resetear el contenido cuando se abre el sheet o cambia initialContent
  useEffect(() => {
    if (open) {
      setEditedContent(initialContent);
    }
  }, [open, initialContent]);

  const handleOpenChange = (isOpen: boolean): void => {
    onOpenChange?.(isOpen);
    // Resetear contenido cuando se cierra
    if (!isOpen) {
      setEditedContent(initialContent);
    }
  };

  const handleSave = () => {
    onSave(taskId, editedContent);
    onOpenChange?.(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-primary font-semibold">
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
          <Button variant="default" type="button" onClick={handleSave}>
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
