import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  TaskForm,
  taskValidationSchema,
} from "@/index";

interface CreateTaskSheetProps {
  columnId: string | number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (
    id: string | number,
    taskData: z.infer<typeof taskValidationSchema>,
  ) => void;
}

export function CreateTaskSheet({
  columnId,
  open,
  onOpenChange,
  onSave,
}: CreateTaskSheetProps) {
  const form = useForm<z.infer<typeof taskValidationSchema>>({
    resolver: zodResolver(taskValidationSchema),
    defaultValues: {
      content: "",
      priority: "P1",
      size: "M",
    },
  });

  const handleSave = async (): Promise<void> => {
    const isValid = await form.trigger();

    if (isValid) {
      const data = form.getValues();
      onSave(columnId, data);
      form.reset();
      onOpenChange?.(false);
    }
  };

  const handleOpenChange = (isOpen: boolean): void => {
    onOpenChange?.(isOpen);
    if (!isOpen) form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-semibold text-primary">
              Crear Tarea
            </SheetTitle>
            <SheetDescription>
              Complete los detalles de la tarea y haga clic en Guardar Cambios
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
