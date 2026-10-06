import { useEffect } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/index"
import { type Task } from "@/features/board/index"
import { TaskForm } from "./TaskForm/TaskForm"

interface DetailsTaskSheetProps {
  task: Task
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Los valores del formulario a partir de la tarea, en un solo sitio. */
const valuesOf = (task: Task) => ({
  content: task.content,
  priority: task.priority,
  size: task.size,
  assignee_id: task.assignee_id,
  due_date: task.due_date,
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
