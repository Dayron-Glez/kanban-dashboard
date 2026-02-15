import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconPlus, IconTrash, IconTrashOff } from "@tabler/icons-react";
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
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
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

interface Props {
  column: ColumnType;
  tasks: Task[];
  hasFilteredTasks?: boolean;
}

export function ColumnContainer({
  column,
  tasks,
  hasFilteredTasks = false,
}: Props) {
  const { updateColumn, deleteColumn, createNewTask, updateTask, deleteTask } =
    useKanban();

  const searchContext = useContext(SearchContext);
  const searchValue = searchContext?.searchValue ?? "";

  const [editMode, setEditMode] = useState<boolean>(false);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] =
    useState<boolean>(false);

  const tasksIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
    disabled: editMode,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  // Vista mientras se arrastra
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-[350px] h-[620px] opacity-40 border-2 border-primary rounded-lg "
      />
    );
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={`w-[350px] h-[620px] max-h-[620px] flex flex-col shadow-sm py-0 rounded-lg gap-y-2 ${
          hasFilteredTasks ? "border-2 border-primary" : ""
        } ${
          searchValue.trim().length > 0 && !hasFilteredTasks ? "opacity-40" : ""
        }`}
      >
        {/* Header de la columna - Área draggable */}
        <CardHeader
          {...attributes}
          {...listeners}
          className="flex flex-row gap-2 items-center justify-between cursor-grab active:cursor-grabbing rounded-t-lg border-b border-border p-4 space-y-0"
        >
          {/* Contador de tareas */}
          <Button
            type="button"
            variant="default"
            className="flex items-center justify-center bg-primary text-white font-semibold text-sm rounded-md px-2.5 py-1 min-w-8 shadow-sm"
          >
            {tasks.length}
          </Button>

          {/* Título editable */}
          {!editMode && (
            <span
              onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                e.stopPropagation();
                setEditMode(true);
              }}
              className="truncate font-bold text-foreground flex-1 cursor-pointer hover:text-primary transition-colors px-2"
            >
              {column.title}
            </span>
          )}

          {editMode && (
            <EditableColumnTitle
              title={column.title}
              onSave={(newTitle) => {
                updateColumn(column.id, newTitle);
                setEditMode(false);
              }}
              onCancel={() => setEditMode(false)}
            />
          )}

          {/* Botón eliminar columna */}
          <AlertDialog>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                        e.stopPropagation()
                      }
                      variant="ghost"
                      size="icon-lg"
                      className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                      disabled={
                        tasks.length > 0 || searchValue.trim().length > 0
                      }
                    >
                      {tasks.length > 0 || searchValue.trim().length > 0 ? (
                        <IconTrashOff />
                      ) : (
                        <IconTrash />
                      )}
                    </Button>
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
                  Esta acción no se puede deshacer. La columna y todas sus
                  tareas serán eliminadas permanentemente.
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
        </CardHeader>

        {/* Área de tareas con scroll */}
        <CardContent className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full pr-2">
            <SortableContext items={tasksIds}>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    updateTask={updateTask}
                    deleteTask={deleteTask}
                  />
                ))}
              </div>
            </SortableContext>
          </ScrollArea>
        </CardContent>

        {/* Footer con botón añadir tarea */}
        <CardFooter className="p-4 pt-0">
          {searchValue.trim().length > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full cursor-not-allowed">
                    <Button
                      onClick={() => {}}
                      variant="outline"
                      type="button"
                      className="w-full group border-dashed border-2 transition-all hover:text-foreground"
                      disabled={true}
                    >
                      <IconPlus className="h-4 w-4 mr-2" />
                      Agregar Tarea
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="z-50">
                  Limpia el filtro para crear una tarea
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              onClick={() => setCreateTaskDialogOpen(true)}
              variant="outline"
              type="button"
              className="w-full group border-dashed border-2 transition-all hover:text-primary"
            >
              <IconPlus className="h-4 w-4 mr-2" />
              Agregar Tarea
            </Button>
          )}
        </CardFooter>
      </Card>
      <CreateTaskSheet
        columnId={column.id}
        open={createTaskDialogOpen}
        onOpenChange={setCreateTaskDialogOpen}
        onSave={createNewTask}
      />
    </>
  );
}
