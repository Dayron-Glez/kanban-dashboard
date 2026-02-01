import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  TaskForm,
  type Task,
} from "@/index";
import { FormProvider, useForm } from "react-hook-form";

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
  const form = useForm({
    defaultValues: {
      content: task.content,
      priority: task.priority,
      size: task.size,
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-semibold text-primary">
              Detalles de la tarea
            </SheetTitle>
            <SheetDescription />
          </SheetHeader>
          <div className="mt-4 px-2">
            <FormProvider {...form}>
              <TaskForm disabled />
            </FormProvider>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
