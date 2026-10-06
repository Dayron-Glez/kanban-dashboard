import type { Task } from "@/features/board/index"

const VISIBLE_TASKS = 3

interface ColumnDragPreviewProps {
  title: string
  accent: string
  tasks: Task[]
}

export function ColumnDragPreview({ title, accent, tasks }: Readonly<ColumnDragPreviewProps>) {
  const visible = tasks.slice(0, VISIBLE_TASKS)
  const hidden = tasks.length - visible.length

  return (
    <div className="p-3">
      <div className="bg-card border-border w-65 rotate-2 overflow-hidden rounded-[14px] border shadow-xl">
        <div className="border-border flex items-center gap-2 border-b px-3.5 py-3">
          <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} />
          <span className="text-foreground flex-1 truncate text-[13px] font-bold">{title}</span>
          <div className="bg-primary text-primary-foreground flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold">
            {tasks.length}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 p-2.5">
          {visible.length === 0 ? (
            <span className="text-muted-foreground px-1 py-1 text-xs">Sin tareas</span>
          ) : (
            visible.map((task) => (
              <span
                key={task.id}
                className="bg-muted/60 text-foreground truncate rounded-md px-2 py-1.5 text-xs"
              >
                {task.content}
              </span>
            ))
          )}
          {hidden > 0 && (
            <span className="text-muted-foreground px-1 text-[11px]">
              +{hidden} tarea{hidden > 1 ? "s" : ""} más
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
