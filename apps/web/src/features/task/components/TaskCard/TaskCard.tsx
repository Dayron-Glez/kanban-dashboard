import { useState } from "react"
import { type BoardTask } from "@/features/board/index"
import { useTaskDrag } from "../../hooks/useTaskDrag"
import { type TaskFormValues } from "../../schemas/task.schema"
import { DetailsTaskSheet } from "../DetailsTaskSheet"
import { DueDateChip } from "../DueDateChip"
import { EditTaskSheet } from "../EditTaskSheet"
import { PRIORITY_CONFIG, SIZE_CONFIG } from "../taskChips"
import { DeleteTaskDialog } from "./DeleteTaskDialog"
import { TaskActionsMenu } from "./TaskActionsMenu"
import { TaskAssigneeAvatar } from "./TaskAssigneeAvatar"
import { TaskDropIndicator } from "./TaskDropIndicator"

interface TaskCardProps {
  task: BoardTask
  deleteTask: (id: string) => void
  updateTask: (id: string, taskData: TaskFormValues) => void
}

export function TaskCard({ task, deleteTask, updateTask }: Readonly<TaskCardProps>) {
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false)
  const [editOpen, setEditOpen] = useState<boolean>(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false)
  const { dragRef, isDragging, dropEdge } = useTaskDrag(task.id, task.columnId)

  const priority = PRIORITY_CONFIG[task.priority]
  const size = SIZE_CONFIG[task.size]

  return (
    <>
      <div ref={dragRef} className="relative py-[3.5px]">
        {dropEdge && <TaskDropIndicator edge={dropEdge} />}
        <div
          className={`border border-l-4 ${priority.borderClassName} ${priority.bgClassName} flex cursor-grab flex-col gap-2 rounded-[10px] px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md ${
            isDragging ? "opacity-40" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-foreground line-clamp-2 flex-1 text-[13px] leading-snug font-medium">
              {task.content}
            </span>
            <TaskActionsMenu
              onViewDetails={() => setDetailsOpen(true)}
              onEdit={() => setEditOpen(true)}
              onDelete={() => setDeleteDialogOpen(true)}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority.className}`}
              >
                {priority.label}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${size.className}`}
              >
                {size.label}
              </span>
              <DueDateChip dueDate={task.dueDate} />
            </div>

            {task.assignee && <TaskAssigneeAvatar profile={task.assignee} />}
          </div>
        </div>
      </div>

      <DetailsTaskSheet task={task} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <EditTaskSheet task={task} onSave={updateTask} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteTaskDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deleteTask(task.id)}
      />
    </>
  )
}
