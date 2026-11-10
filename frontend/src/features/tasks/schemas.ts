import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/api/types";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  description: z.string().max(4000, "Description must be at most 4000 characters"),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  /** Empty string means "no due date"; otherwise a calendar date from <input type="date">. */
  dueDate: z.union([z.literal(""), z.iso.date("Enter a valid date")]),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
