import { useState, type ChangeEvent } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

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
  const [content, setContent] = useState<string>("");
  const handleSave = (): void => {
    onSave(columnId, content);
    onOpenChange?.(false);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className=" font-semibold text-primary">
              Crear Tarea
            </SheetTitle>
            <SheetDescription>
              Esciba el contenido de la tarea y de click en Guardar
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 px-2">
            <Textarea
              placeholder="Escriba el contenido de la tarea"
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setContent(e.target.value)
              }
              className="min-h-32 max-h-96 focus-visible:ring-0"
            />
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
