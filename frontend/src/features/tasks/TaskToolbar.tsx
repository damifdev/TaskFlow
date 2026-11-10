import {
  isTaskPriority,
  isTaskSortField,
  isTaskStatus,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskSortField,
} from "@/api/types";
import { Button } from "@/components/Button";
import { STATUS_LABELS } from "@/components/taskLabels";
import type { TaskFilterState } from "./useTaskFilters";
import type { TaskView } from "./useTaskView";

const SORT_LABELS: Record<TaskSortField, string> = {
  createdAt: "Date created",
  dueDate: "Due date",
  priority: "Priority",
  title: "Title",
};

interface TaskToolbarProps {
  filters: TaskFilterState;
  view: TaskView;
  isFiltered: boolean;
  onChange: (patch: Partial<Omit<TaskFilterState, "page">>) => void;
  onViewChange: (view: TaskView) => void;
  onReset: () => void;
}

export function TaskToolbar({ filters, view, isFiltered, onChange, onViewChange, onReset }: TaskToolbarProps) {
  return (
    <form className="toolbar" role="search" onSubmit={(event) => event.preventDefault()}>
      <input
        type="search"
        className="input toolbar-search"
        aria-label="Search tasks"
        placeholder="Search tasks…"
        value={filters.search}
        onChange={(event) => onChange({ search: event.target.value })}
      />

      {/* The board's columns already are the statuses, so the status filter only applies to the list. */}
      {view === "list" && (
        <select
          className="input"
          aria-label="Filter by status"
          value={filters.status}
          onChange={(event) => onChange({ status: isTaskStatus(event.target.value) ? event.target.value : "" })}
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      )}

      <select
        className="input"
        aria-label="Filter by priority"
        value={filters.priority}
        onChange={(event) => onChange({ priority: isTaskPriority(event.target.value) ? event.target.value : "" })}
      >
        <option value="">All priorities</option>
        {TASK_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>

      <select
        className="input"
        aria-label="Sort by"
        value={filters.sortBy}
        onChange={(event) => {
          if (isTaskSortField(event.target.value)) onChange({ sortBy: event.target.value });
        }}
      >
        {Object.entries(SORT_LABELS).map(([field, label]) => (
          <option key={field} value={field}>
            Sort: {label}
          </option>
        ))}
      </select>

      <Button
        aria-label={`Sort ${filters.descending ? "descending" : "ascending"}, activate to reverse`}
        onClick={() => onChange({ descending: !filters.descending })}
      >
        <span aria-hidden="true">{filters.descending ? "↓ Desc" : "↑ Asc"}</span>
      </Button>

      {isFiltered && (
        <Button variant="ghost" onClick={onReset}>
          Clear filters
        </Button>
      )}

      <div className="segmented" role="group" aria-label="Task view">
        <Button
          variant={view === "list" ? "primary" : "secondary"}
          aria-pressed={view === "list"}
          onClick={() => onViewChange("list")}
        >
          List
        </Button>
        <Button
          variant={view === "board" ? "primary" : "secondary"}
          aria-pressed={view === "board"}
          onClick={() => onViewChange("board")}
        >
          Board
        </Button>
      </div>
    </form>
  );
}
