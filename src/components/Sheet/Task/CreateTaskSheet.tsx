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
import { Content } from "./Form/TextArea/Content";

interface CreateTaskSheetProps {
  columnId: string | number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (id: string | number, content: string) => void;
}

export default function CreateTaskSheet({
  columnId,
  open,
  onOpenChange,
  onSave,
}: CreateTaskSheetProps) {
  const form = useForm<z.infer<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      content: "",
    },
  });

  const handleSave = async (): Promise<void> => {
    const isValid = await form.trigger();

    if (isValid) {
      const { content } = form.getValues();
      onSave(columnId, content);
      form.reset();
      onOpenChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      onOpenChange?.(isOpen);
      if (!isOpen) form.reset();
    }}>
      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-semibold text-primary">
              Crear Tarea
            </SheetTitle>
            <SheetDescription>
              Esciba el contenido de la tarea y de click en Guardar Cambios
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
