import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/index"
import { type Task } from "@/features/board/index"
import { TaskForm } from "./TaskForm/TaskForm"
import { FormProvider, useForm } from "react-hook-form"

interface DetailsTaskSheetProps {
  task: Task
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DetailsTaskSheet({ task, open, onOpenChange }: DetailsTaskSheetProps) {
  const form = useForm({
    defaultValues: {
      content: task.content,
      priority: task.priority,
      size: task.size,
      assignee_id: task.assignee_id,
    },
  })

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
