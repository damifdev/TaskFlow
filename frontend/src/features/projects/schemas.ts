import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120, "Name must be at most 120 characters"),
  description: z.string().max(1000, "Description must be at most 1000 characters"),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
