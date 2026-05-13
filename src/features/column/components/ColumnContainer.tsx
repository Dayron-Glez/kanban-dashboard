import { SortableContext, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { IconChevronDown, IconPlus, IconTrash, IconTrashOff } from "@tabler/icons-react"
import { useContext, useEffect, useMemo, useState } from "react"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  SearchContext,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/index"
import { useKanban, type ColumnType, type Task } from "@/features/board/index"
import { EditableColumnTitle } from "./EditableColumnTitle/EditableColumnTitle"
import { CreateTaskSheet, TaskCard } from "@/features/task/index"

const COLUMN_ACCENTS = ["#6366f1", "#f97316", "#0ea5e9", "#10b981", "#ec4899", "#8b5cf6"]
const getAccent = (position: number) => COLUMN_ACCENTS[position % COLUMN_ACCENTS.length]

interface Props {
  column: ColumnType
  tasks: Task[]
  hasFilteredTasks?: boolean
  collapsed?: boolean
  onCollapsedChange?: (val: boolean) => void
  isDragging?: boolean
}

function EmptyZone({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="group border-border hover:border-primary text-muted-foreground hover:text-accent-foreground hover:bg-accent flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed bg-transparent py-5 transition-all"
    >
      <div className="bg-muted group-hover:bg-primary text-muted-foreground group-hover:text-primary-foreground flex h-7 w-7 items-center justify-center rounded-full transition-all">
        <IconPlus size={12} />
      </div>
      <span className="text-xs font-medium">Agregar primera tarea</span>
    </button>
  )
}

export function ColumnContainer({
  column,
  tasks,
  hasFilteredTasks = false,
  collapsed = false,
  onCollapsedChange,
  isDragging: boardDragging = false,
}: Props) {
  const { updateColumn, deleteColumn, createNewTask, updateTask, deleteTask, userRole } =
    useKanban()

  const isOwner = userRole === "owner"

  const searchContext = useContext(SearchContext)
  const searchValue = searchContext?.searchValue ?? ""

  const [editMode, setEditMode] = useState(false)
  const [tasksRef, enableTasksAnim] = useAutoAnimate()
  useEffect(() => {
    enableTasksAnim(!boardDragging)
  }, [boardDragging, enableTasksAnim])
  const setCollapsed = (val: boolean) => onCollapsedChange?.(val)
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false)

  const tasksIds = useMemo(() => tasks.map((task) => task.id), [tasks])

  const accent = getAccent(column.position)
  const p0Count = tasks.filter((t) => t.priority === "p0").length
  const progressWidth = Math.min((tasks.length / 5) * 100, 100)

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column", column },
    disabled: editMode,
  })

  const style = { transition, transform: CSS.Transform.toString(transform) }

  // ── Ghost while dragging ───────────────────────────────────────────────────
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="border-primary max-h-[calc(100vh-80px)] min-h-[200px] max-w-[380px] min-w-[220px] flex-[1_1_0] shrink-0 rounded-[14px] border-2 opacity-40"
      />
    )
  }

  // ── Collapsed: slim vertical pill ─────────────────────────────────────────
  if (collapsed) {
    return (
      <>
        <div
          ref={setNodeRef}
          style={style}
          onClick={() => setCollapsed(false)}
          title={`${column.title} (${tasks.length} tareas)`}
          className={`bg-card border-border flex max-h-[calc(100vh-80px)] w-10 shrink-0 cursor-pointer flex-col items-center gap-2.5 overflow-hidden rounded-[14px] border pt-3.5 pb-3.5 shadow-sm ${
            searchValue.trim().length > 0 && !hasFilteredTasks ? "opacity-35" : ""
          }`}
        >
          {/* Accent dot */}
          <div className="h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} />

          {/* Rotated title */}
          <span
            className="text-muted-foreground flex-1 overflow-hidden text-[11.5px] font-bold whitespace-nowrap"
            style={{
              writingMode: "vertical-lr",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
              letterSpacing: "0.04em",
              textOverflow: "ellipsis",
              maxHeight: 120,
            }}
          >
            {column.title}
          </span>

          {/* Task count badge */}
          <div
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
            style={{ background: accent }}
          >
            {tasks.length}
          </div>

          {/* P0 urgent dot */}
          {p0Count > 0 && (
            <div
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                background: "#ef4444",
                boxShadow: "0 0 0 2px rgba(239,68,68,0.2)",
              }}
            />
          )}
        </div>

        <CreateTaskSheet
          columnId={column.id}
          open={createTaskDialogOpen}
          onOpenChange={setCreateTaskDialogOpen}
          onSave={createNewTask}
        />
      </>
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-card border-border grid max-h-[calc(100vh-80px)] max-w-[380px] min-w-[220px] flex-[1_1_0] shrink-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-[14px] border shadow-sm ${
          hasFilteredTasks ? "ring-primary ring-2" : ""
        } ${searchValue.trim().length > 0 && !hasFilteredTasks ? "opacity-35" : ""}`}
      >
        <div>
          <div
            {...attributes}
            {...listeners}
            className="bg-card border-border flex cursor-grab items-center gap-2 border-b px-3.5 py-3 active:cursor-grabbing"
          >
            {/* Color dot */}
            <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} />

            {!editMode && (
              <span
                onClick={(e) => {
                  if (!isOwner) return
                  e.stopPropagation()
                  setEditMode(true)
                }}
                className={`text-foreground flex-1 truncate text-[13px] font-bold ${
                  isOwner ? "hover:text-primary cursor-pointer" : "cursor-default"
                }`}
              >
                {column.title}
              </span>
            )}

            {editMode && isOwner && (
              <EditableColumnTitle
                title={column.title}
                onSave={(newTitle) => {
                  updateColumn(column.id, newTitle)
                  setEditMode(false)
                }}
                onCancel={() => setEditMode(false)}
              />
            )}

            {/* P0 urgency dot */}
            {p0Count > 0 && (
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: "#ef4444",
                  boxShadow: "0 0 0 2px rgba(239,68,68,0.2)",
                }}
                title={`${p0Count} tarea${p0Count > 1 ? "s" : ""} urgente${p0Count > 1 ? "s" : ""}`}
              />
            )}

            {/* Task count pill */}
            <div className="bg-primary text-primary-foreground flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-center text-[11px] font-bold">
              {tasks.length}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setCollapsed(true)
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 rounded-md p-1 transition-colors"
              title="Colapsar columna"
            >
              <IconChevronDown size={14} className="rotate-90" />
            </button>

            {/* Delete column button (owner only) */}
            {isOwner && (
              <AlertDialog>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          disabled={tasks.length > 0 || searchValue.trim().length > 0}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-md p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {tasks.length > 0 || searchValue.trim().length > 0 ? (
                            <IconTrashOff size={14} />
                          ) : (
                            <IconTrash size={14} />
                          )}
                        </button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eliminar Columna</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <AlertDialogContent>
                  <AlertDialogTitle>¿ Eliminar Columna ?</AlertDialogTitle>
                  <AlertDialogHeader>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. La columna y todas sus tareas serán
                      eliminadas permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/60"
                      onClick={() => deleteColumn(column.id)}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div className="bg-border h-[2.5px]">
            <div
              className="h-full transition-[width] duration-300 ease-out"
              style={{ width: `${progressWidth}%`, background: accent, opacity: 0.55 }}
            />
          </div>
        </div>

        <ScrollArea className="h-full min-h-0">
          <SortableContext items={tasksIds}>
            <div ref={tasksRef} className="flex flex-col gap-[7px] p-2.5">
              {tasks.map((task) => (
                <div key={task.id}>
                  <TaskCard task={task} updateTask={updateTask} deleteTask={deleteTask} />
                </div>
              ))}
              {tasks.length === 0 && <EmptyZone onAdd={() => setCreateTaskDialogOpen(true)} />}
            </div>
          </SortableContext>
        </ScrollArea>

        {tasks.length > 0 && (
          <div className="px-2.5 pb-2.5">
            {searchValue.trim().length > 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full cursor-not-allowed">
                      <button
                        disabled
                        className="border-border text-muted-foreground flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-dashed bg-transparent py-2 text-[12.5px] font-medium opacity-40"
                      >
                        <IconPlus size={12} />
                        Agregar Tarea
                      </button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="z-50">
                    Limpia el filtro para crear una tarea
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <button
                onClick={() => setCreateTaskDialogOpen(true)}
                className="border-border hover:border-primary text-muted-foreground hover:text-accent-foreground hover:bg-accent flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-dashed bg-transparent py-2 text-[12.5px] font-medium transition-all"
              >
                <IconPlus size={12} />
                Agregar Tarea
              </button>
            )}
          </div>
        )}
      </div>

      <CreateTaskSheet
        columnId={column.id}
        open={createTaskDialogOpen}
        onOpenChange={setCreateTaskDialogOpen}
        onSave={createNewTask}
      />
    </>
  )
}
