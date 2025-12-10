import { useSortable } from "@dnd-kit/sortable";
import type { ColumnType } from "../types";
import { IconTrash } from "@tabler/icons-react";
import { CSS } from "@dnd-kit/utilities";
interface Props {
  column: ColumnType;
  deleteColumn: (id: number | string) => void;
}
export default function ColumnContainer({ column, deleteColumn }: Props) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({
      id: column.id,
      data: {
        type: "column",
        column,
      },
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    }
    
    if(isDragging) {
        return <div ref={setNodeRef} style={style} className="flex flex-col bg-columnBg rounded-lg w-80 h-[500px] max-h-[500px] p-4 opacity-40 border-2 border-rose-500"></div>
    }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col bg-columnBg rounded-lg w-80 h-[500px] max-h-[500px] p-4">
      <div {...attributes} {...listeners} className="flex items-center justify-between bg-mainBg text-md h-16 cursor-grab rounded-md rounded-b-none font-bold border-columnBg border-4 p-2">
        <div>0</div>
        {column.title}
        <button onClick={() => deleteColumn(column.id)}>
          <IconTrash className="hover:stroke-red-500 cursor-pointer" />
        </button>
      </div>
      <div className="flex grow">Content</div>
      <div>Footer</div>
    </div>
  );
}
