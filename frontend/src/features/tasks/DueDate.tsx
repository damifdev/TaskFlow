import type { TaskDto } from "@/api/types";
import { cx } from "@/lib/cx";
import { formatDueDate, isOverdue } from "@/lib/dates";

/** Overdue dates are flagged with text as well as colour, so the warning never relies on colour alone. */
export function DueDate({ task }: { task: Pick<TaskDto, "dueDate" | "status"> }) {
  if (!task.dueDate) return <span className="muted">No due date</span>;

  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <span className={cx("due-date", overdue && "due-date-overdue")}>
      <span className="numeric">{formatDueDate(task.dueDate)}</span>
      {overdue && <span className="chip chip-overdue">Overdue</span>}
    </span>
  );
}
