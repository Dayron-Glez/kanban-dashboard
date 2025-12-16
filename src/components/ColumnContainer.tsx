import { SortableContext, useSortable } from "@dnd-kit/sortable";
import type { ColumnType, Task } from "../types";
import { IconTrash } from "@tabler/icons-react";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { IconPlus } from "@tabler/icons-react";
import { ScrollArea } from "./ui/scroll-area";

import TaskCard from "./TaskCard";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface Props {
  column: ColumnType;
  updateColumn: (id: number | string, title: string) => void;
  deleteColumn: (id: number | string) => void;
  createNewTask: (columnId: number | string) => void;
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

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex flex-col bg-columnBg rounded-lg w-[360px] h-[550px] max-h-[500px] p-4 opacity-40 border-2 border-rose-500"
      ></div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col bg-columnBg rounded-lg w-[360px] h-[550px] max-h-[550px] p-4"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex gap-2 items-center justify-between bg-mainBg text-md h-16 cursor-grab rounded-md rounded-b-none font-bold border-columnBg border-4 p-2"
      >
        <div>{tasks.length}</div>

        {/* Solo el título activa editMode */}
        {!editMode && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setEditMode(true);
            }}
            className="truncate"
          >
            {column.title}
          </span>
        )}

        {editMode && (
          <Input
            className="focus:border-rose-500 outline-none"
            value={column.title}
            onChange={(e) => updateColumn(column.id, e.target.value)}
            type="text"
            placeholder="Column name"
            autoFocus
            onBlur={() => setEditMode(false)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              setEditMode(false);
            }}
          />
        )}

        <AlertDialog>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    onClick={(e) => e.stopPropagation()}
                    variant="ghost"
                    size="icon-sm"
                    className="group hover:bg-transparent"
                  >
                    <IconTrash className="group-hover:stroke-rose-500" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>

              <TooltipContent>Delete Column</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <AlertDialogContent className="bg-columnBg border-transparent">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                Delete column?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white">
                This action cannot be undone. The column will be permanently
                removed.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel className="bg-rose-500 border-none hover:bg-transparent hover:ring-2 hover:ring-inset hover:ring-rose-500 hover:text-white">
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                className="bg-rose-500 hover:bg-transparent hover:ring-2 hover:ring-inset hover:ring-rose-500"
                onClick={() => deleteColumn(column.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ScrollArea className="flex flex-col grow pt-2 pb-4 pr-2 h-80">
        <SortableContext items={tasksIds}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              updateTask={updateTask}
              deleteTask={deleteTask}
            />
          ))}
        </SortableContext>
      </ScrollArea>

      <Button
        onClick={() => createNewTask(column.id)}
        variant="ghost"
        type="button"
        className="group hover:text-white hover:ring-2 hover:ring-inset hover:ring-rose-500 bg-mainBg hover:bg-mainBg"
      >
        <IconPlus className="group-hover:stroke-rose-500 transition-transform duration-300 group-hover:rotate-90" />
        Add Task
      </Button>
    </div>
  );
}
