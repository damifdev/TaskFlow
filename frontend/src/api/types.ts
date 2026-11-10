// Mirrors the TaskFlow backend contract (JSON is camelCase, enums are strings).

export type Role = "User" | "Admin";

export const TASK_STATUSES = ["Todo", "InProgress", "Done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_SORT_FIELDS = ["createdAt", "dueDate", "priority", "title"] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

// Type guards for values that arrive as plain strings, such as <select> options.
export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function isTaskPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}

export function isTaskSortField(value: string): value is TaskSortField {
  return (TASK_SORT_FIELDS as readonly string[]).includes(value);
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: UserDto;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  displayName: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  taskCount: number;
  doneCount: number;
}

export interface ProjectInput {
  name: string;
  description: string | null;
}

export interface TaskDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** Calendar date, "YYYY-MM-DD". */
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string | null;
}

export interface UpdateTaskInput extends CreateTaskInput {
  status: TaskStatus;
}

export interface TaskListParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  sortBy?: TaskSortField;
  descending?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AdminUserDto {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
  projectCount: number;
}

export interface AdminStatsDto {
  userCount: number;
  projectCount: number;
  taskCount: number;
  tasksByStatus: Record<TaskStatus, number>;
}
