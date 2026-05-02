import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconChevronDown, IconPlus, IconTrash, IconTrashOff } from "@tabler/icons-react";
import { useContext, useMemo, useState } from "react";
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
} from "@/shared/index";
import { useKanban, type ColumnType, type Task } from "@/features/board/index";
import { EditableColumnTitle } from "./EditableColumnTitle/EditableColumnTitle";
import { CreateTaskSheet, TaskCard } from "@/features/task/index";

const COLUMN_ACCENTS = ["#6366f1", "#f97316", "#0ea5e9", "#10b981", "#ec4899", "#8b5cf6"];
const getAccent = (position: number) => COLUMN_ACCENTS[position % COLUMN_ACCENTS.length];

interface Props {
  column: ColumnType;
  tasks: Task[];
  hasFilteredTasks?: boolean;
}

function EmptyZone({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="group w-full py-5 rounded-[10px] border-[1.5px] border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-primary/5 bg-transparent cursor-pointer"
    >
      <div className="w-7 h-7 rounded-full bg-muted group-hover:bg-primary flex items-center justify-center transition-all text-muted-foreground group-hover:text-primary-foreground">
        <IconPlus size={12} />
      </div>
      <span className="text-xs font-medium">Agregar primera tarea</span>
    </button>
  );
}

export function ColumnContainer({ column, tasks, hasFilteredTasks = false }: Props) {
  const { updateColumn, deleteColumn, createNewTask, updateTask, deleteTask, userRole } =
    useKanban();

  const isOwner = userRole === "owner";

  const searchContext = useContext(SearchContext);
  const searchValue = searchContext?.searchValue ?? "";

  const [editMode, setEditMode] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);

  const tasksIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  const accent = getAccent(column.position);
  const p0Count = tasks.filter((t) => t.priority === "p0").length;
  const progressWidth = Math.min((tasks.length / 5) * 100, 100);

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column", column },
    disabled: editMode,
  });

  const style = { transition, transform: CSS.Transform.toString(transform) };

  // ── Ghost while dragging ───────────────────────────────────────────────────
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex-1 min-h-[200px] max-h-[calc(100vh-96px)] opacity-40 border-2 border-primary rounded-[14px] shrink-0"
      />
    );
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
          className={`w-10 shrink-0 max-h-[calc(100vh-68px)] flex flex-col items-center bg-card rounded-[14px] border border-border shadow-sm cursor-pointer overflow-hidden pt-3.5 pb-3.5 gap-2.5 ${
            searchValue.trim().length > 0 && !hasFilteredTasks ? "opacity-35" : ""
          }`}
        >
          {/* Accent dot */}
          <div
            className="w-1 h-1 rounded-full shrink-0"
            style={{ background: accent }}
          />

          {/* Rotated title */}
          <span
            className="text-[11.5px] font-bold text-muted-foreground flex-1 overflow-hidden whitespace-nowrap"
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
            className="w-[22px] h-[22px] rounded-full text-white text-[10px] font-extrabold flex items-center justify-center shrink-0"
            style={{ background: accent }}
          >
            {tasks.length}
          </div>

          {/* P0 urgent dot */}
          {p0Count > 0 && (
            <div
              className="w-2 h-2 rounded-full shrink-0"
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
    );
  }

  // ── Expanded: full column ──────────────────────────────────────────────────
  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex-1 max-h-[calc(100vh-96px)] flex flex-col bg-card rounded-[14px] border border-border shadow-sm shrink-0 overflow-hidden ${
          hasFilteredTasks ? "ring-2 ring-primary" : ""
        } ${searchValue.trim().length > 0 && !hasFilteredTasks ? "opacity-35" : ""}`}
      >
        {/* Column Header */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center gap-2 px-3.5 py-3 bg-card border-b border-border cursor-grab active:cursor-grabbing shrink-0"
        >
          {/* Color dot */}
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent }} />

          {/* Title */}
          {!editMode && (
            <span
              onClick={(e) => {
                if (!isOwner) return;
                e.stopPropagation();
                setEditMode(true);
              }}
              className={`flex-1 text-[13px] font-bold text-foreground truncate ${
                isOwner ? "cursor-pointer hover:text-primary" : "cursor-default"
              }`}
            >
              {column.title}
            </span>
          )}

          {editMode && isOwner && (
            <EditableColumnTitle
              title={column.title}
              onSave={(newTitle) => {
                updateColumn(column.id, newTitle);
                setEditMode(false);
              }}
              onCancel={() => setEditMode(false)}
            />
          )}

          {/* P0 urgency dot */}
          {p0Count > 0 && (
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: "#ef4444", boxShadow: "0 0 0 2px rgba(239,68,68,0.2)" }}
              title={`${p0Count} tarea${p0Count > 1 ? "s" : ""} urgente${p0Count > 1 ? "s" : ""}`}
            />
          )}

          {/* Task count pill */}
          <div className="flex items-center justify-center bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded-full min-w-6 text-center shrink-0">
            {tasks.length}
          </div>

          {/* Collapse button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(true);
            }}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
                        className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div className="h-[3px] bg-border shrink-0">
            <div
              className="h-full transition-[width] duration-300 ease-out"
              style={{ width: `${progressWidth}%`, background: accent, opacity: 0.6 }}
            />
          </div>
        )}

        {/* Task list */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2.5 flex flex-col gap-[7px]">
              <SortableContext items={tasksIds}>
                {tasks.length === 0 ? (
                  <EmptyZone onAdd={() => setCreateTaskDialogOpen(true)} />
                ) : (
                  tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      updateTask={updateTask}
                      deleteTask={deleteTask}
                    />
                  ))
                )}
              </SortableContext>
            </div>
          </ScrollArea>
        </div>

        {/* Add task footer (visible when tasks exist) */}
        {tasks.length > 0 && (
          <div className="px-2.5 pb-2.5 shrink-0">
            {searchValue.trim().length > 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full cursor-not-allowed">
                      <button
                        disabled
                        className="w-full py-2 rounded-[9px] border-[1.5px] border-dashed border-border text-[12.5px] font-medium text-muted-foreground flex items-center justify-center gap-1.5 opacity-40 cursor-not-allowed bg-transparent"
                      >
                        <IconPlus size={12} />
                        Agregar Tarea
                      </button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="z-50">Limpia el filtro para crear una tarea</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <button
                onClick={() => setCreateTaskDialogOpen(true)}
                className="w-full py-2 rounded-[9px] border-[1.5px] border-dashed border-border hover:border-primary text-[12.5px] font-medium text-muted-foreground hover:text-primary flex items-center justify-center gap-1.5 transition-all bg-transparent hover:bg-primary/5 cursor-pointer"
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
  );
}
