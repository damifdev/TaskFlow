import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, deleteTask, listTasks, updateTask, updateTaskStatus } from "@/api/tasks";
import { queryKeys } from "@/api/queryKeys";
import type {
  CreateTaskInput,
  PagedResult,
  TaskDto,
  TaskListParams,
  TaskStatus,
  UpdateTaskInput,
} from "@/api/types";
import { useMutationErrorToast, useToast } from "@/components/useToast";
import { applyStatusChange } from "./optimistic";

export const BOARD_PAGE_SIZE = 50;

export type BoardFilters = Pick<TaskListParams, "search" | "priority" | "sortBy" | "descending">;

export function useTasks(projectId: string, params: TaskListParams) {
  return useQuery({
    queryKey: queryKeys.tasks.list(projectId, params),
    queryFn: () => listTasks(projectId, params),
    // Keep showing the previous page while the next one loads, so paging and filtering do not flash.
    placeholderData: keepPreviousData,
  });
}

/** One board column: the project's tasks in a single status, under the shared search and sort. */
export function useBoardTasks(projectId: string, status: TaskStatus, filters: BoardFilters) {
  const params: TaskListParams = { ...filters, status, pageSize: BOARD_PAGE_SIZE };
  return useQuery({
    queryKey: queryKeys.tasks.board(projectId, status, params),
    queryFn: () => listTasks(projectId, params),
    placeholderData: keepPreviousData,
  });
}

/** Lists, boards and the project's progress counts all depend on the same tasks, so refresh them together. */
function useRefreshTaskData(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.project(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    ]);
}

export function useCreateTask(projectId: string) {
  const toast = useToast();
  const onError = useMutationErrorToast();
  const refresh = useRefreshTaskData(projectId);
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(projectId, input),
    onSuccess: (task) => toast.success(`Task "${task.title}" created`),
    onError,
    onSettled: refresh,
  });
}

export function useUpdateTask(projectId: string) {
  const toast = useToast();
  const onError = useMutationErrorToast();
  const refresh = useRefreshTaskData(projectId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => updateTask(id, input),
    onSuccess: () => toast.success("Task updated"),
    onError,
    onSettled: refresh,
  });
}

export function useDeleteTask(projectId: string) {
  const toast = useToast();
  const onError = useMutationErrorToast();
  const refresh = useRefreshTaskData(projectId);
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => toast.success("Task deleted"),
    onError,
    onSettled: refresh,
  });
}

/** Optimistic: the task moves immediately and rolls back if the server rejects the change. */
export function useUpdateTaskStatus(projectId: string) {
  const queryClient = useQueryClient();
  const onError = useMutationErrorToast();
  const refresh = useRefreshTaskData(projectId);
  const scope = queryKeys.tasks.project(projectId);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Stop in-flight fetches from overwriting the optimistic value when they land.
      await queryClient.cancelQueries({ queryKey: scope });
      const snapshots = queryClient.getQueriesData<PagedResult<TaskDto>>({ queryKey: scope });
      const task = snapshots.flatMap(([, data]) => data?.items ?? []).find((item) => item.id === id);

      for (const [key, data] of snapshots) {
        if (data) queryClient.setQueryData(key, applyStatusChange(key, data, task, id, status));
      }
      return { snapshots };
    },
    onError: (error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) queryClient.setQueryData(key, data);
      onError(error);
    },
    onSettled: refresh,
  });
}
