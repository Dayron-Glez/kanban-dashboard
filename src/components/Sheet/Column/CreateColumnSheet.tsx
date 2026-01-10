import { useState, type ChangeEvent } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface CreateColumnSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (content: string) => void;
}

export default function CreateColumnSheet({
  open,
  onOpenChange,
  onSave,
}: CreateColumnSheetProps) {
  const [content, setContent] = useState<string>("");

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      setContent("");
    }
    onOpenChange?.(open);
  };

  const handleSave = (): void => {
    onSave(content);
    setContent("");
    onOpenChange?.(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="border-transparent flex flex-col justify-between">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className=" font-semibold text-primary">
              Crear Columna
            </SheetTitle>
            <SheetDescription>
              Esciba el nombre de la columna y de click en Guardar Cambios
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 px-2">
            <Textarea
              value={content}
              placeholder="Escriba el nombre de la columna"
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
