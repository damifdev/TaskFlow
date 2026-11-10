import type { TaskDto, TaskStatus } from "@/api/types";

/** What the user can do to a task from either view. */
export interface TaskActions {
  onStatusChange: (task: TaskDto, status: TaskStatus) => void;
  onEdit: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
}
