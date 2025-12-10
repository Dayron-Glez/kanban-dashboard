import { useMemo, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { ColumnType } from "../types";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import ColumnContainer from "./ColumnContainer";
import { createPortal } from "react-dom";

export default function KanbanBoard() {
  {
    /**States */
  }
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);

  {
    /**Memories */
  }
  const columnsId = useMemo(
    () => columns.map((column) => column.id),
    [columns],
  );

  {
    /**Functions */
  }
  const createNewColumn = (): void => {
    const columnsToAdd: ColumnType = {
      id: generateId(),
      title: `Column ${columns.length + 1}`,
    };
    setColumns([...columns, columnsToAdd]);
  };

  const deleteColumn = (id: number | string) => {
    setColumns(columns.filter((column) => column.id !== id));
  };

  const generateId = (): number => {
    return Math.floor(Math.random() * 10001);
  };

  const onDragStart = (event: DragStartEvent) => {
    console.log("Drag start", event);
    if (event.active.data.current?.type === "column") {
      setActiveColumn(event.active.data.current.column);
      return;
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeColumnId = active.id;
    const overColumnId = over.id;

    if (activeColumnId === overColumnId) return;

    setColumns((columns) => {
      const activeColumnIndex = columns.findIndex(
        (column) => column.id === activeColumnId,
      );
      const overColumnIndex = columns.findIndex(
        (column) => column.id === overColumnId,
      );

      return arrayMove(columns, activeColumnIndex, overColumnIndex);
    });
  };

  return (
    <div className="m-auto flex min-h-screen w-full items-center overflow-x-auto overflow-y-hidden px-10">
      <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="m-auto flex gap-4">
          <div className="flex gap-4">
            <SortableContext items={columnsId}>
              {columns.map((column) => (
                <ColumnContainer
                  key={column.id}
                  column={column}
                  deleteColumn={deleteColumn}
                />
              ))}
            </SortableContext>
          </div>
          <Button
            onClick={() => createNewColumn()}
            className="group bg-mainBg border border-columnBg ring-2 hover:bg-mainBg hover:ring-rose-500 hover:text-white cursor-pointer"
            variant="outline"
            size="lg"
          >
            <IconPlus className="transition-transform duration-300 group-hover:rotate-45" />
            Add column
          </Button>
        </div>

        {createPortal(
          <DragOverlay>
            {activeColumn && (
              <ColumnContainer
                column={activeColumn}
                deleteColumn={deleteColumn}
              />
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </div>
  );
}
