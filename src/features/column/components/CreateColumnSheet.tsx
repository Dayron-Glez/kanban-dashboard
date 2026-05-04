import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/index"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type z from "zod"
import { columnValidationSchema } from "../schemas/column.schema"
import { TitleTextArea } from "./EditableColumnTitle/TitleTextArea"

interface CreateColumnSheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSave: (content: string) => void
}

export function CreateColumnSheet({ open, onOpenChange, onSave }: CreateColumnSheetProps) {
  const form = useForm<z.infer<typeof columnValidationSchema>>({
    resolver: zodResolver(columnValidationSchema),
    defaultValues: {
      title: "",
    },
  })

  const handleSave = async (): Promise<void> => {
    const isValid = await form.trigger()

    if (isValid) {
      const { title } = form.getValues()
      onSave(title)
      form.reset()
      onOpenChange?.(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange?.(isOpen)
        if (!isOpen) form.reset()
      }}
    >
      <SheetContent className="flex flex-col justify-between border-transparent">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-primary font-semibold">Crear Columna</SheetTitle>
            <SheetDescription>
              Esciba el nombre de la columna y de click en Guardar Cambios
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 px-2">
            <FormProvider {...form}>
              <TitleTextArea />
            </FormProvider>
          </div>
        </div>
        <SheetFooter className="mt-6 grid grid-cols-2 gap-2">
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
  )
}
