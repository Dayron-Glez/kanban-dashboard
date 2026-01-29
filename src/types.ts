export type TaskPriority = "P0" | "P1" | "P2";
export type TaskSize = "XS" | "S" | "M" | "L" | "XL";

export type ColumnType = {
  id: number | string;
  title: string;
};

export type Task = {
  id: number | string;
  columnId: number | string;
  content: string;
  priority: TaskPriority;
  size: TaskSize;
};

export const TASK_PRIORITIES: TaskPriority[] = ["P0", "P1", "P2"];
export const TASK_SIZES: TaskSize[] = ["XS", "S", "M", "L", "XL"];
