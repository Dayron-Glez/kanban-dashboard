import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import type { ColumnType, Task } from "../types";

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
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

import TaskCard from "./TaskCard";
import CreateTaskSheet from "./Sheet/CreateTaskSheet";

interface Props {
  column: ColumnType;
  updateColumn: (id: number | string, title: string) => void;
  deleteColumn: (id: number | string) => void;
  createNewTask: (columnId: number | string, content: string) => void;
  deleteTask: (id: number | string) => void;
  updateTask: (id: number | string, content: string) => void;
  tasks: Task[];
}

export default function ColumnContainer({
  column,
  updateColumn,
  deleteColumn,
  createNewTask,
  deleteTask,
  updateTask,
  tasks,
}: Props) {
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
        className="w-[350px] h-[620px] max-h-[620px] flex flex-col shadow-sm py-0 rounded-lg gap-y-2"
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
              onClick={(e) => {
                e.stopPropagation();
                setEditMode(true);
              }}
              className="truncate font-bold text-foreground flex-1 cursor-pointer hover:text-primary transition-colors px-2"
            >
              {column.title}
            </span>
          )}

          {editMode && (
            <Input
              className="flex-1 h-9 focus-visible:ring-primary focus-visible:ring-1"
              value={column.title}
              onChange={(e) => updateColumn(column.id, e.target.value)}
              type="text"
              placeholder="Column name"
              autoFocus
              onBlur={() => setEditMode(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditMode(false);
              }}
            />
          )}

          {/* Botón eliminar columna */}
          <AlertDialog>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      onClick={(e) => e.stopPropagation()}
                      variant="ghost"
                      size="icon-lg"
                      className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <IconTrash />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Column</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete column?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The column and all its tasks
                  will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/60"
                  onClick={() => deleteColumn(column.id)}
                >
                  Delete
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
          <Button
            // onClick={() => createNewTask(column.id)}
            onClick={() => setCreateTaskDialogOpen(true)}
            variant="outline"
            type="button"
            className="w-full group border-dashed border-2 hover:text-primary transition-all"
          >
            <IconPlus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
            Add Task
          </Button>
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
