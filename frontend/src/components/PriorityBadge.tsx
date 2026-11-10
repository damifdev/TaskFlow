import type { TaskPriority } from "@/api/types";

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`chip chip-priority-${priority.toLowerCase()}`}>{priority}</span>;
}
