import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { validationSchema } from "@/components/Sheet/Task/Form/validationSchema";
import { TaskForm } from "./Form/TaskForm";
import { useEffect } from "react";
import type { Task } from "@/types";

interface EditTaskSheetProps {
  task: Task | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (
    id: string | number,
    taskData: z.infer<typeof validationSchema>,
  ) => void;
}

export function EditTaskSheet({
  task,
  open,
  onOpenChange,
  onSave,
}: EditTaskSheetProps) {
  const form = useForm<z.infer<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      content: "",
      priority: "P1",
      size: "M",
    },
  });

  useEffect(() => {
    if (task && open) {
      form.reset({
        content: task.content,
        priority: task.priority,
        size: task.size,
      });
    }
  }, [task, open, form]);

  const handleOpenChange = (isOpen: boolean): void => {
    onOpenChange?.(isOpen);
    if (!isOpen && task) {
      form.reset({
        content: task.content,
        priority: task.priority,
        size: task.size,
      });
    }
  };

  const handleSave = async (): Promise<void> => {
    const isValid = await form.trigger();

    if (isValid && task) {
      const data = form.getValues();
      onSave(task.id, data);
      onOpenChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-semibold text-primary">
              Editar Tarea
            </SheetTitle>
            <SheetDescription>
              Modifique los detalles de la tarea y haga clic en Guardar Cambios
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 px-2">
            <FormProvider {...form}>
              <TaskForm />
            </FormProvider>
          </div>
        </div>
        <SheetFooter className="grid grid-cols-2 mt-6 gap-2">
          <SheetClose asChild>
            <Button type="button" variant="outline">
              Cerrar
            </Button>
          </SheetClose>
          <Button variant="default" type="button" onClick={handleSave}>
            Guardar Cambios
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
