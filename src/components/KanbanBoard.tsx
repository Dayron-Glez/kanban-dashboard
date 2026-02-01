import { useContext, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { useKanban } from "@/context/KanbanContext";
import ColumnContainer from "./ColumnContainer";
import TaskCard from "./TaskCard";
import type { ColumnType, Task } from "../types";
import { SearchContext } from "@/layouts/MainLayout";

export default function KanbanBoard() {
  const searchContext = useContext<{
    searchValue: string;
    setSearchValue: (value: string) => void;
  } | null>(SearchContext);
  const searchValue: string = searchContext?.searchValue ?? "";

  const { columns, tasks, columnsId, setColumns, setTasks } = useKanban();

  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
  );

  const filteredTasks = tasks.filter((task: Task) => {
    const searchTerm = searchValue.trim().toLowerCase();

    if (!task.content || !searchTerm) return true;

    return task.content.toLowerCase().includes(searchTerm);
  });

  const onDragStart = (event: DragStartEvent): void => {
    if (event.active.data.current?.type === "column") {
      setActiveColumn(event.active.data.current.column);
    }
    if (event.active.data.current?.type === "task") {
      setActiveTask(event.active.data.current.task);
    }
  };

  const onDragEnd = (event: DragEndEvent): void => {
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setColumns((prev) => {
      const activeIndex = prev.findIndex((c) => c.id === active.id);
      const overIndex = prev.findIndex((c) => c.id === over.id);
      if (activeIndex === -1 || overIndex === -1) return prev;
      return arrayMove(prev, activeIndex, overIndex);
    });
  };

  const onDragOver = (event: DragOverEvent): void => {
    const { active, over } = event;
    if (!over) return;

    const isActiveTask = active.data.current?.type === "task";
    const isOverTask = over.data.current?.type === "task";
    const isOverColumn = over.data.current?.type === "column";

    if (!isActiveTask) return;

    setTasks((prev) => {
      const activeIndex = prev.findIndex((t) => t.id === active.id);

      if (isOverTask) {
        const overIndex = prev.findIndex((t) => t.id === over.id);
        prev[activeIndex].columnId = prev[overIndex].columnId;
        return arrayMove(prev, activeIndex, overIndex);
      }

      if (isOverColumn) {
        prev[activeIndex].columnId = over.id;
        return [...prev];
      }

      return prev;
    });
  };

  return (
    <div className="min-w-max p-4">
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
      >
        <div className="m-auto flex gap-2">
          <SortableContext items={columnsId}>
            {columns.map((column) => {
              const columnFilteredTasks = filteredTasks.filter(
                (task) => task.columnId === column.id,
              );

              return (
                <ColumnContainer
                  key={column.id}
                  column={column}
                  tasks={columnFilteredTasks}
                  hasFilteredTasks={
                    searchValue.trim().length > 0 &&
                    columnFilteredTasks.length > 0
                  }
                />
              );
            })}
          </SortableContext>
        </div>

        {createPortal(
          <DragOverlay>
            {activeColumn && (
              <ColumnContainer
                column={activeColumn}
                tasks={filteredTasks.filter(
                  (task) => task.columnId === activeColumn.id,
                )}
                hasFilteredTasks={
                  searchValue.trim().length > 0 &&
                  filteredTasks.filter(
                    (task) => task.columnId === activeColumn.id,
                  ).length > 0
                }
              />
            )}
            {activeTask && (
              <TaskCard
                task={activeTask}
                deleteTask={() => {}}
                updateTask={() => {}}
              />
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </div>
  );
}
