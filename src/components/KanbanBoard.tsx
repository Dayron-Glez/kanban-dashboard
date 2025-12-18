import { useMemo, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { ColumnType, Task } from "../types";
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
import ColumnContainer from "./ColumnContainer";
import TaskCard from "./TaskCard";
import { createPortal } from "react-dom";
import { v4 as uuidv4 } from "uuid";

// Helpers

const Id = () => uuidv4();

export default function KanbanBoard() {
  // State

  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [columnCounter, setColumnCounter] = useState<number>(0);
  const [taskCounter, setTaskCounter] = useState<number>(0);

  // Memo
  const columnsId = useMemo(
    () => columns.map((column) => column.id),
    [columns]
  );

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    })
  );

  // Columns CRUD
  const createNewColumn = (): void => {
    const newColumn: ColumnType = {
      id: Id(),
      title: `Column ${columnCounter + 1}`,
    };
    setColumns((prev) => [...prev, newColumn]);
    setColumnCounter((prev) => prev + 1);
  };

  const updateColumn = (id: string | number, title: string): void => {
    setColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, title } : col))
    );
  };

  const deleteColumn = (id: string | number): void => {
    setColumns((prev) => prev.filter((column) => column.id !== id));
    setTasks((prev) => prev.filter((task) => task.columnId !== id));
  };

  // Tasks CRUD
  const createNewTask = (columnId: string | number): void => {
    const newTask: Task = {
      id: Id(),
      columnId,
      content: `Task ${taskCounter + 1}`,
    };
    setTasks((prev) => [...prev, newTask]);
    setTaskCounter((prev) => prev + 1);
  };

  const updateTask = (id: string | number, content: string): void => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, content } : task))
    );
  };

  const deleteTask = (id: string | number): void => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  // Drag handlers
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
    if (!over) return;

    if (active.id === over.id) return;

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
    <div className="flex gap-4 min-w-max px-10 py-4">
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
      >
        <div className="m-auto flex gap-4">
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

          <Button
            onClick={() => createNewColumn()}
            className="text-black group border-dashed border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
            variant="outline"
            size="lg"
          >
            <IconPlus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
            Add column
          </Button>
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
