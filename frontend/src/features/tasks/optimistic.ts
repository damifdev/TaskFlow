import type { PagedResult, TaskDto, TaskStatus } from "@/api/types";

/**
 * Applies a status change to one cached task page, so the UI can update before the server answers.
 *
 * Cache keys look like ["tasks", projectId, "list", params] or ["tasks", projectId, "board", column, params].
 * In the list the task changes in place. On the board the task has to leave its old column and appear in
 * the new one, so each column cache either drops it or gains it.
 */
export function applyStatusChange(
  key: readonly unknown[],
  data: PagedResult<TaskDto>,
  task: TaskDto | undefined,
  taskId: string,
  status: TaskStatus,
): PagedResult<TaskDto> {
  if (key[2] !== "board") {
    return { ...data, items: data.items.map((item) => (item.id === taskId ? { ...item, status } : item)) };
  }

  const isInColumn = data.items.some((item) => item.id === taskId);

  if (key[3] === status) {
    if (isInColumn || !task) return data;
    return { ...data, items: [{ ...task, status }, ...data.items], totalCount: data.totalCount + 1 };
  }

  if (isInColumn) {
    return { ...data, items: data.items.filter((item) => item.id !== taskId), totalCount: data.totalCount - 1 };
  }
  return data;
}
