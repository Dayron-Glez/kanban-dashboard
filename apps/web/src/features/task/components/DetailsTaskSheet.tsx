import { useEffect } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/index"
import { type BoardTask } from "@/features/board/index"
import { TaskForm } from "./TaskForm/TaskForm"

interface DetailsTaskSheetProps {
  task: BoardTask
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Los valores del formulario a partir de la tarea, en un solo sitio. */
const valuesOf = (task: BoardTask) => ({
  content: task.content,
  priority: task.priority,
  size: task.size,
  assigneeId: task.assigneeId,
  dueDate: task.dueDate,
})

export function DetailsTaskSheet({ task, open, onOpenChange }: DetailsTaskSheetProps) {
  const form = useForm({ defaultValues: valuesOf(task) })

  // Este sheet está siempre montado dentro de la tarjeta, y useForm solo lee
  // defaultValues al montarse. Sin resincronizar, al editar una tarea el
  // detalle seguiría mostrando los valores de cuando se pintó la tarjeta.
  useEffect(() => {
    form.reset(valuesOf(task))
  }, [task, open, form])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card flex flex-col justify-between border-transparent">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-primary font-semibold">Detalles de la tarea</SheetTitle>
            <SheetDescription />
          </SheetHeader>
          <div className="mt-4 px-2 [&_[disabled]]:opacity-100">
            <FormProvider {...form}>
              <TaskForm disabled />
            </FormProvider>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
