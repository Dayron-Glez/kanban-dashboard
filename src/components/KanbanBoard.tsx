// KanbanBoard.tsx
import { useState } from "react";
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

export default function KanbanBoard() {
  const {
    columns,
    tasks,
    columnsId,
    updateColumn,
    deleteColumn,
    createNewTask,
    updateTask,
    deleteTask,
    setColumns,
    setTasks,
  } = useKanban();

  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    })
  );

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
            {columns.map((column) => (
              <ColumnContainer
                key={column.id}
                column={column}
                updateColumn={updateColumn}
                deleteColumn={deleteColumn}
                createNewTask={createNewTask}
                deleteTask={deleteTask}
                updateTask={updateTask}
                tasks={tasks.filter((task) => task.columnId === column.id)}
              />
            ))}
          </SortableContext>
        </div>

        {createPortal(
          <DragOverlay>
            {activeColumn && (
              <ColumnContainer
                column={activeColumn}
                updateColumn={updateColumn}
                deleteColumn={deleteColumn}
                createNewTask={createNewTask}
                deleteTask={deleteTask}
                updateTask={updateTask}
                tasks={tasks.filter(
                  (task) => task.columnId === activeColumn.id
                )}
              />
            )}
            {activeTask && (
              <TaskCard
                task={activeTask}
                deleteTask={deleteTask}
                updateTask={updateTask}
              />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
}
