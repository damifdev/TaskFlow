import type { TaskStatus } from "@/api/types";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  Todo: "Todo",
  InProgress: "In progress",
  Done: "Done",
};
