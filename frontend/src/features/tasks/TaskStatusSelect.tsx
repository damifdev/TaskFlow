import { isTaskStatus, TASK_STATUSES, type TaskDto, type TaskStatus } from "@/api/types";
import { STATUS_LABELS } from "@/components/taskLabels";

interface TaskStatusSelectProps {
  task: TaskDto;
  onChange: (status: TaskStatus) => void;
}

/** Quick status change without opening the edit dialog. */
export function TaskStatusSelect({ task, onChange }: TaskStatusSelectProps) {
  return (
    <select
      className="input input-sm"
      aria-label={`Status of ${task.title}`}
      value={task.status}
      onChange={(event) => {
        if (isTaskStatus(event.target.value)) onChange(event.target.value);
      }}
    >
      {TASK_STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
