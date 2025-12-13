import { useSortable } from "@dnd-kit/sortable";
import type { ColumnType, Task } from "../types";
import { IconTrash } from "@tabler/icons-react";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { IconPlus } from "@tabler/icons-react";
import { ScrollArea } from "./ui/scroll-area";

import TaskCard from "./TaskCard";

interface Props {
  column: ColumnType;
  updateColumn: (id: number | string, title: string) => void;
  deleteColumn: (id: number | string) => void;
  createNewTask: (columnId: number | string) => void;
  deleteTask:(id: number | string) => void;
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
        onClick={() => setEditMode(true)}
        {...attributes}
        {...listeners}
        className="flex gap-2 items-center justify-between bg-mainBg text-md h-16 cursor-grab rounded-md rounded-b-none font-bold border-columnBg border-4 p-2"
      >
        <div>{tasks.length}</div>
        {!editMode && column.title}
        {editMode && (
          <Input
            className=" focus:border-rose-500 outline-none"
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
        <Button
          variant="ghost"
          type="button"
          className="group hover:bg-transparent"
          onClick={() => deleteColumn(column.id)}
        >
          <IconTrash className="group-hover:stroke-rose-500" />
        </Button>
      </div>
      <ScrollArea className="flex flex-col grow pt-2 pb-4 pr-2 h-80">
        {tasks.map((task) => <TaskCard key={task.id} task={task} updateTask={updateTask} deleteTask={deleteTask}/>)}
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
