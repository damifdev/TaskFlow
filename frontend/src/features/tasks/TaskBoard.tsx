import { useId } from "react";
import { TASK_STATUSES, type TaskStatus } from "@/api/types";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Skeleton } from "@/components/Skeleton";
import { STATUS_LABELS } from "@/components/taskLabels";
import { DueDate } from "./DueDate";
import { BOARD_PAGE_SIZE, useBoardTasks, type BoardFilters } from "./hooks";
import type { TaskActions } from "./taskActions";
import { TaskStatusSelect } from "./TaskStatusSelect";

interface TaskBoardProps {
  projectId: string;
  filters: BoardFilters;
  actions: TaskActions;
}

export function TaskBoard({ projectId, filters, actions }: TaskBoardProps) {
  return (
    <div className="board">
      {TASK_STATUSES.map((status) => (
        <BoardColumn key={status} projectId={projectId} status={status} filters={filters} actions={actions} />
      ))}
    </div>
  );
}

interface BoardColumnProps extends TaskBoardProps {
  status: TaskStatus;
}

function BoardColumn({ projectId, status, filters, actions }: BoardColumnProps) {
  const headingId = useId();
  const tasks = useBoardTasks(projectId, status, filters);

  function renderCards() {
    if (tasks.isPending) {
      return (
        <div className="stack" aria-busy="true" aria-label={`Loading ${STATUS_LABELS[status]} tasks`}>
          <Skeleton className="skeleton-row" />
          <Skeleton className="skeleton-row" />
        </div>
      );
    }
    if (tasks.isError) {
      return <ErrorState error={tasks.error} title="Could not load" onRetry={() => void tasks.refetch()} />;
    }
    if (tasks.data.items.length === 0) return <p className="board-empty muted">Nothing here.</p>;

    return (
      <>
        <ul className="board-cards">
          {tasks.data.items.map((task) => (
            <li key={task.id} className="card task-card">
              <p className="task-title">{task.title}</p>
              {task.description && <p className="task-description muted">{task.description}</p>}
              <div className="task-card-meta">
                <PriorityBadge priority={task.priority} />
                <DueDate task={task} />
              </div>
              <TaskStatusSelect task={task} onChange={(next) => actions.onStatusChange(task, next)} />
              <div className="card-actions">
                <Button size="sm" variant="ghost" onClick={() => actions.onEdit(task)} aria-label={`Edit task ${task.title}`}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => actions.onDelete(task)}
                  aria-label={`Delete task ${task.title}`}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {tasks.data.totalCount > BOARD_PAGE_SIZE && (
          <p className="muted board-note numeric">
            Showing {tasks.data.items.length} of {tasks.data.totalCount}. Use the list view to see them all.
          </p>
        )}
      </>
    );
  }

  return (
    <section className="board-column" aria-labelledby={headingId}>
      <header className="board-column-header">
        <h2 id={headingId} className="board-column-title">
          {STATUS_LABELS[status]}
        </h2>
        <span className="chip numeric" aria-label={`${tasks.data?.totalCount ?? 0} tasks`}>
          {tasks.data?.totalCount ?? "–"}
        </span>
      </header>
      {renderCards()}
    </section>
  );
}
