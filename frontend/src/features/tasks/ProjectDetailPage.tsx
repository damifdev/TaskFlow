import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { TaskDto, TaskListParams } from "@/api/types";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { useProject } from "@/features/projects/hooks";
import { useDeleteTask, useUpdateTaskStatus, type BoardFilters } from "./hooks";
import type { TaskActions } from "./taskActions";
import { TaskBoard } from "./TaskBoard";
import { TaskFormModal } from "./TaskFormModal";
import { TaskList } from "./TaskList";
import { TaskToolbar } from "./TaskToolbar";
import { useTaskFilters } from "./useTaskFilters";
import { useTaskView } from "./useTaskView";

const LIST_PAGE_SIZE = 10;

type TaskFormState = { mode: "create" } | { mode: "edit"; task: TaskDto };

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const project = useProject(projectId);
  useDocumentTitle(project.data?.name ?? "Project");

  const [view, setView] = useTaskView();
  const { filters, update, setPage, reset, isFiltered } = useTaskFilters();
  const [taskForm, setTaskForm] = useState<TaskFormState | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskDto | null>(null);
  const [editingProject, setEditingProject] = useState(false);

  const updateStatus = useUpdateTaskStatus(projectId);
  const deleteTask = useDeleteTask(projectId);

  // Typing should not fire a request per keystroke.
  const search = useDebouncedValue(filters.search.trim(), 300);

  const listParams = useMemo<TaskListParams>(
    () => ({
      search: search || undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      sortBy: filters.sortBy,
      descending: filters.descending,
      page: filters.page,
      pageSize: LIST_PAGE_SIZE,
    }),
    [search, filters.status, filters.priority, filters.sortBy, filters.descending, filters.page],
  );

  const boardFilters = useMemo<BoardFilters>(
    () => ({
      search: listParams.search,
      priority: listParams.priority,
      sortBy: listParams.sortBy,
      descending: listParams.descending,
    }),
    [listParams.search, listParams.priority, listParams.sortBy, listParams.descending],
  );

  const actions: TaskActions = {
    onStatusChange: (task, status) => {
      if (task.status !== status) updateStatus.mutate({ id: task.id, status });
    },
    onEdit: (task) => setTaskForm({ mode: "edit", task }),
    onDelete: setTaskToDelete,
  };

  if (project.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading project" className="stack">
        <Skeleton className="skeleton-heading" />
        <Skeleton className="skeleton-row" />
      </div>
    );
  }

  if (project.isError) {
    return (
      <>
        <p>
          <Link to="/">← Back to projects</Link>
        </p>
        <ErrorState error={project.error} title="Could not load project" onRetry={() => void project.refetch()} />
      </>
    );
  }

  const { name, description, taskCount, doneCount } = project.data;

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">← Projects</Link>
      </p>

      <div className="page-header">
        <div>
          <h1>{name}</h1>
          {description && <p className="muted">{description}</p>}
          <p className="muted numeric">
            {doneCount} of {taskCount} tasks done
          </p>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setEditingProject(true)}>Edit project</Button>
          <Button variant="primary" onClick={() => setTaskForm({ mode: "create" })}>
            New task
          </Button>
        </div>
      </div>

      <TaskToolbar
        filters={filters}
        view={view}
        isFiltered={isFiltered}
        onChange={update}
        onViewChange={setView}
        onReset={reset}
      />

      {view === "list" ? (
        <TaskList
          projectId={projectId}
          params={listParams}
          actions={actions}
          isFiltered={isFiltered}
          onPageChange={setPage}
          onCreate={() => setTaskForm({ mode: "create" })}
          onReset={reset}
        />
      ) : (
        <TaskBoard projectId={projectId} filters={boardFilters} actions={actions} />
      )}

      {taskForm && (
        <TaskFormModal
          projectId={projectId}
          task={taskForm.mode === "edit" ? taskForm.task : undefined}
          onClose={() => setTaskForm(null)}
        />
      )}
      {editingProject && <ProjectFormModal project={project.data} onClose={() => setEditingProject(false)} />}
      {taskToDelete && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${taskToDelete.title}"? This cannot be undone.`}
          pending={deleteTask.isPending}
          onCancel={() => setTaskToDelete(null)}
          onConfirm={() => deleteTask.mutate(taskToDelete.id, { onSuccess: () => setTaskToDelete(null) })}
        />
      )}
    </>
  );
}
