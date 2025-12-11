import { useSortable } from "@dnd-kit/sortable";
import type { ColumnType } from "../types";
import { IconTrash } from "@tabler/icons-react";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Input } from "./ui/input";
interface Props {
  column: ColumnType;
  updateColumn:(id: number | string, title:string) => void;
  deleteColumn:(id: number | string) => void;
}
export default function ColumnContainer({ column, updateColumn ,deleteColumn }: Props) {
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
        className="flex flex-col bg-columnBg rounded-lg w-80 h-[500px] max-h-[500px] p-4 opacity-40 border-2 border-rose-500"
      ></div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col bg-columnBg rounded-lg w-80 h-[500px] max-h-[500px] p-4"
    >
      <div
        onClick={() => setEditMode(true)}
        {...attributes}
        {...listeners}
        className="flex gap-2 items-center justify-between bg-mainBg text-md h-16 cursor-grab rounded-md rounded-b-none font-bold border-columnBg border-4 p-2"
      >
        <div>0</div>
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
              if(e.key !== "Enter") return;
              setEditMode(false)
            }}
          />
        )}
        <button onClick={() => deleteColumn(column.id)}>
          <IconTrash className="hover:stroke-red-500 cursor-pointer" />
        </button>
      </div>
      <div className="flex grow">Content</div>
      <div>Footer</div>
    </div>
  );
}
