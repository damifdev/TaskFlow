import { request } from "./client";
import type { ProjectDto, ProjectInput } from "./types";

export function listProjects(): Promise<ProjectDto[]> {
  return request<ProjectDto[]>("/api/projects");
}

export function getProject(id: string): Promise<ProjectDto> {
  return request<ProjectDto>(`/api/projects/${id}`);
}

export function createProject(input: ProjectInput): Promise<ProjectDto> {
  return request<ProjectDto>("/api/projects", { method: "POST", body: input });
}

export function updateProject(id: string, input: ProjectInput): Promise<ProjectDto> {
  return request<ProjectDto>(`/api/projects/${id}`, { method: "PUT", body: input });
}

export function deleteProject(id: string): Promise<void> {
  return request<void>(`/api/projects/${id}`, { method: "DELETE" });
}
