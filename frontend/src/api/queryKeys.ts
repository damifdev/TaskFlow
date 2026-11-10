import type { TaskListParams, TaskStatus } from "./types";

/** Board columns and the list are cached under the same per-project prefix so one invalidation covers both. */
export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    list: () => ["projects", "list"] as const,
    detail: (id: string) => ["projects", "detail", id] as const,
  },
  tasks: {
    project: (projectId: string) => ["tasks", projectId] as const,
    list: (projectId: string, params: TaskListParams) => ["tasks", projectId, "list", params] as const,
    board: (projectId: string, status: TaskStatus, params: TaskListParams) =>
      ["tasks", projectId, "board", status, params] as const,
  },
  admin: {
    users: (page: number, pageSize: number) => ["admin", "users", page, pageSize] as const,
    stats: () => ["admin", "stats"] as const,
  },
};
