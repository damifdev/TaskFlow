import type { TaskStatus } from "@/api/types";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Today (or the given moment) as a local-calendar "YYYY-MM-DD" string. */
export function toLocalIsoDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A task is overdue when its due date is before today and it is not finished. */
export function isOverdue(dueDate: string | null, status: TaskStatus, today: string = toLocalIsoDate()): boolean {
  return dueDate !== null && status !== "Done" && dueDate < today;
}

/** Formats a "YYYY-MM-DD" calendar date without shifting it through UTC. */
export function formatDueDate(dueDate: string): string {
  const [year, month, day] = dueDate.split("-").map(Number);
  if (!year || !month || !day) return dueDate;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
