import { request } from "./client";
import type {
  CreateTaskInput,
  PagedResult,
  TaskDto,
  TaskListParams,
  TaskStatus,
  UpdateTaskInput,
} from "./types";

export function listTasks(projectId: string, params: TaskListParams = {}): Promise<PagedResult<TaskDto>> {
  return request<PagedResult<TaskDto>>(`/api/projects/${projectId}/tasks`, {
    query: { ...params },
  });
}

export function createTask(projectId: string, input: CreateTaskInput): Promise<TaskDto> {
  return request<TaskDto>(`/api/projects/${projectId}/tasks`, { method: "POST", body: input });
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<TaskDto> {
  return request<TaskDto>(`/api/tasks/${id}`, { method: "PUT", body: input });
}

export function updateTaskStatus(id: string, status: TaskStatus): Promise<TaskDto> {
  return request<TaskDto>(`/api/tasks/${id}/status`, { method: "PATCH", body: { status } });
}

export function deleteTask(id: string): Promise<void> {
  return request<void>(`/api/tasks/${id}`, { method: "DELETE" });
}
