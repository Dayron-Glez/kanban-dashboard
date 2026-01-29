export const TASK_PRIORITIES = ["P0", "P1", "P2"] as const;
export const TASK_SIZES = ["XS", "S", "M", "L", "XL"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskSize = (typeof TASK_SIZES)[number];

export interface Task {
  id: string | number;
  content: string;
  priority: TaskPriority;
  size: TaskSize;
  columnId: string | number;
}

export interface ColumnType {
  id: string | number;
  title: string;
}
