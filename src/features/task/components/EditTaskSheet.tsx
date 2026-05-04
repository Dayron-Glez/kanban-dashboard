import { useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { type Task } from "@/features/board/index"
import { taskValidationSchema, type TaskFormValues } from "../schemas/task.schema"
import { TaskForm } from "./TaskForm/TaskForm"

interface EditTaskSheetProps {
  task: Task | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSave: (id: string, taskData: TaskFormValues) => void
}

export function EditTaskSheet({ task, open, onOpenChange, onSave }: EditTaskSheetProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskValidationSchema),
    defaultValues: {
      content: "",
      priority: "p1",
      size: "m",
      assignee_id: null,
    },
  })

  useEffect(() => {
    if (task && open) {
      form.reset({
        content: task.content,
        priority: task.priority,
        size: task.size,
        assignee_id: task.assignee_id,
      })
    }
  }, [task, open, form])

  const handleOpenChange = (isOpen: boolean): void => {
    onOpenChange?.(isOpen)
    if (!isOpen && task) {
      form.reset({
        content: task.content,
        priority: task.priority,
        size: task.size,
        assignee_id: task.assignee_id,
      })
    }
  }

  const handleSave = async (): Promise<void> => {
    const isValid = await form.trigger()
    if (isValid && task) {
      const data = form.getValues()
      onSave(task.id, data)
      onOpenChange?.(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col justify-between border-transparent">
        <div className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-primary font-semibold">Editar Tarea</SheetTitle>
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
