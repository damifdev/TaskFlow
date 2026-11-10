import type { TaskListParams } from "@/api/types";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/Pagination";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Skeleton } from "@/components/Skeleton";
import { cx } from "@/lib/cx";
import { DueDate } from "./DueDate";
import { useTasks } from "./hooks";
import type { TaskActions } from "./taskActions";
import { TaskStatusSelect } from "./TaskStatusSelect";

interface TaskListProps {
  projectId: string;
  params: TaskListParams;
  actions: TaskActions;
  isFiltered: boolean;
  onPageChange: (page: number) => void;
  onCreate: () => void;
  onReset: () => void;
}

export function TaskList({ projectId, params, actions, isFiltered, onPageChange, onCreate, onReset }: TaskListProps) {
  const tasks = useTasks(projectId, params);

  if (tasks.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading tasks" className="stack">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="skeleton-row" />
        ))}
      </div>
    );
  }

  if (tasks.isError) {
    return <ErrorState error={tasks.error} title="Could not load tasks" onRetry={() => void tasks.refetch()} />;
  }

  const { items, page, totalPages, totalCount } = tasks.data;

  if (items.length === 0) {
    return isFiltered ? (
      <EmptyState
        title="No tasks match your filters"
        description="Try a different search or clear the filters."
        action={<Button onClick={onReset}>Clear filters</Button>}
      />
    ) : (
      <EmptyState
        title="No tasks yet"
        description="Add the first task to get this project moving."
        action={
          <Button variant="primary" onClick={onCreate}>
            New task
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className={cx("table-wrap", tasks.isPlaceholderData && "is-refreshing")} aria-busy={tasks.isPlaceholderData}>
        <table className="task-table">
          <caption className="visually-hidden">Tasks in this project</caption>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Status</th>
              <th scope="col">Priority</th>
              <th scope="col">Due</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((task) => (
              <tr key={task.id}>
                <td>
                  <p className="task-title">{task.title}</p>
                  {task.description && <p className="task-description muted">{task.description}</p>}
                </td>
                <td>
                  <TaskStatusSelect task={task} onChange={(status) => actions.onStatusChange(task, status)} />
                </td>
                <td>
                  <PriorityBadge priority={task.priority} />
                </td>
                <td>
                  <DueDate task={task} />
                </td>
                <td className="task-actions">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} noun="task" onPageChange={onPageChange} />
    </>
  );
}
