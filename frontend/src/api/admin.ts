import { request } from "./client";
import type { AdminStatsDto, AdminUserDto, PagedResult } from "./types";

export function listUsers(page: number, pageSize: number): Promise<PagedResult<AdminUserDto>> {
  return request<PagedResult<AdminUserDto>>("/api/admin/users", { query: { page, pageSize } });
}

export function getStats(): Promise<AdminStatsDto> {
  return request<AdminStatsDto>("/api/admin/stats");
}
