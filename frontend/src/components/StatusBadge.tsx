import type { TaskStatus } from "@/api/types";
import { STATUS_LABELS } from "./taskLabels";

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`chip chip-status-${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>;
}
