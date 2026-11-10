import { useCallback, useState } from "react";
import type { TaskPriority, TaskSortField, TaskStatus } from "@/api/types";

export interface TaskFilterState {
  search: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  sortBy: TaskSortField;
  descending: boolean;
  page: number;
}

const DEFAULT_FILTERS: TaskFilterState = {
  search: "",
  status: "",
  priority: "",
  sortBy: "createdAt",
  descending: true,
  page: 1,
};

export function useTaskFilters() {
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_FILTERS);

  // Any change to what is being shown sends the user back to the first page.
  const update = useCallback((patch: Partial<Omit<TaskFilterState, "page">>) => {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((current) => ({ ...current, page }));
  }, []);

  const reset = useCallback(() => {
    setFilters((current) => ({ ...DEFAULT_FILTERS, sortBy: current.sortBy, descending: current.descending }));
  }, []);

  const isFiltered = filters.search.trim() !== "" || filters.status !== "" || filters.priority !== "";

  return { filters, update, setPage, reset, isFiltered };
}
