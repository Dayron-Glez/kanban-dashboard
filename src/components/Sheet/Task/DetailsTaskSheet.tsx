import { Field, FieldLabel } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "@/types";

interface DetailsTaskSheetProps {
  task: Task;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DetailsTaskSheet({
  task,
  open,
  onOpenChange,
}: DetailsTaskSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className=" font-semibold text-primary">
              Detalles de la tarea
            </SheetTitle>
            <SheetDescription />
          </SheetHeader>
          <div className="mt-4 px-2">
            <Field>
              <FieldLabel htmlFor="task-content">Contenido</FieldLabel>
              <Textarea
                id="task-content"
                value={task.content}
                readOnly
                disabled
                className="min-h-32 max-h-96 bg-muted"
              />
            </Field>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
