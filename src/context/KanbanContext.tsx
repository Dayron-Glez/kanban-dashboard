import {
  createContext,
  useContext,
  useState,
  useMemo,
  useRef,
  useCallback,
  type ReactNode,
  type RefObject,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type { ColumnType, Task } from "../types";

interface KanbanContextType {
  columns: ColumnType[];
  tasks: Task[];
  columnsId: (string | number)[];
  createNewColumn: () => void;
  updateColumn: (id: string | number, title: string) => void;
  deleteColumn: (id: string | number) => void;
  createNewTask: (columnId: string | number, content: string) => void;
  updateTask: (id: string | number, content: string) => void;
  deleteTask: (id: string | number) => void;
  setColumns: React.Dispatch<React.SetStateAction<ColumnType[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

const baseColumns: ColumnType[] = [
  { id: uuidv4(), title: "Backlog" },
  { id: uuidv4(), title: "Ready" },
  { id: uuidv4(), title: "In Progress" },
  { id: uuidv4(), title: "In Review" },
  { id: uuidv4(), title: "Done" },
];

const KanbanContext = createContext<KanbanContextType | null>(null);

export function KanbanProvider({ children }: { children: ReactNode }) {
  const [columns, setColumns] = useState<ColumnType[]>(baseColumns);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columnCounter, setColumnCounter] = useState<number>(0);

  const scrollContainerRef = useRef<HTMLElement | null>(null);

  const columnsId = useMemo(
    () => columns.map((column) => column.id),
    [columns]
  );

  const createNewColumn = useCallback((): void => {
    const newColumn: ColumnType = {
      id: uuidv4(),
      title: `Column ${columnCounter + 1}`,
    };
    setColumns((prev) => [...prev, newColumn]);
    setColumnCounter((prev) => prev + 1);

    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: "smooth",
        });
      }
    }, 50);
  }, [columnCounter]);

  const updateColumn = (id: string | number, title: string): void => {
    setColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, title } : col))
    );
  };

  const deleteColumn = (id: string | number): void => {
    setColumns((prev) => prev.filter((column) => column.id !== id));
    setTasks((prev) => prev.filter((task) => task.columnId !== id));
  };

  const createNewTask = (columnId: string | number, content: string): void => {
    const newTask: Task = {
      id: uuidv4(),
      columnId,
      content,
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const updateTask = (id: string | number, content: string): void => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, content } : task))
    );
  };

  const deleteTask = (id: string | number): void => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  return (
    <KanbanContext.Provider
      value={{
        columns,
        tasks,
        columnsId,
        createNewColumn,
        updateColumn,
        deleteColumn,
        createNewTask,
        updateTask,
        deleteTask,
        setColumns,
        setTasks,
        scrollContainerRef,
      }}
    >
      {children}
    </KanbanContext.Provider>
  );
}

export function useKanban() {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanban must be used within a KanbanProvider");
  }
  return context;
}
