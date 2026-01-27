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
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { validationSchema } from "@/components/Sheet/Task/Form/validationSchema";
import { Content } from "./Form/TextArea/Content";

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
  const form = useForm<z.infer<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      content: initialContent,
    },
  });

  // Actualizar el formulario cuando cambia initialContent
  useEffect(() => {
    form.reset({ content: initialContent });
  }, [initialContent, form]);

  const handleOpenChange = (isOpen: boolean): void => {
    onOpenChange?.(isOpen);
    if (!isOpen) {
      form.reset({ content: initialContent });
    }
  };

  const handleSave = async (): Promise<void> => {
    const isValid = await form.trigger();

    if (isValid) {
      const { content } = form.getValues();
      onSave(taskId, content);
      onOpenChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-primary font-semibold">
              Editar Tarea
            </SheetTitle>
            <SheetDescription>
              Modifique el contenido de la tarea y haga clic en Guardar Cambios
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 px-2">
            <FormProvider {...form}>
              <Content />
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
