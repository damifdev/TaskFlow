import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { loginSchema, registerSchema } from "./auth/schemas";
import { projectSchema } from "./projects/schemas";
import { taskSchema } from "./tasks/schemas";

/** The first validation message, or null when the value is valid. */
function firstError(schema: z.ZodType, value: unknown): string | null {
  const result = schema.safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

describe("registerSchema", () => {
  const valid = { displayName: "Alice", email: "alice@example.com", password: "Password1" };

  it("accepts a valid account and trims text fields", () => {
    const result = registerSchema.parse({ ...valid, displayName: "  Alice  ", email: " alice@example.com " });

    expect(result.displayName).toBe("Alice");
    expect(result.email).toBe("alice@example.com");
  });

  it.each([
    ["short1", "Password must be at least 8 characters"],
    ["onlyletters", "Password must contain at least one number"],
    ["12345678", "Password must contain at least one letter"],
    ["a1".repeat(51), "Password must be at most 100 characters"],
  ])("rejects the password %#", (password, message) => {
    expect(firstError(registerSchema, { ...valid, password })).toBe(message);
  });

  it("rejects bad emails and short names", () => {
    expect(firstError(registerSchema, { ...valid, email: "not-an-email" })).toBe("Enter a valid email address");
    expect(firstError(registerSchema, { ...valid, email: "   " })).toBe("Email is required");
    expect(firstError(registerSchema, { ...valid, displayName: "A" })).toBe("Display name must be at least 2 characters");
  });
});

describe("loginSchema", () => {
  it("requires both fields", () => {
    expect(firstError(loginSchema, { email: "", password: "x" })).toBe("Email is required");
    expect(firstError(loginSchema, { email: "alice@example.com", password: "" })).toBe("Password is required");
  });

  it("does not enforce password strength on sign-in", () => {
    expect(loginSchema.safeParse({ email: "alice@example.com", password: "x" }).success).toBe(true);
  });
});

describe("projectSchema", () => {
  it("accepts a name at the length limit", () => {
    expect(projectSchema.safeParse({ name: "x".repeat(120), description: "" }).success).toBe(true);
  });

  it("rejects blank and overlong names", () => {
    expect(firstError(projectSchema, { name: "   ", description: "" })).toBe("Project name is required");
    expect(firstError(projectSchema, { name: "x".repeat(121), description: "" })).toBe(
      "Name must be at most 120 characters",
    );
  });

  it("rejects overlong descriptions", () => {
    expect(firstError(projectSchema, { name: "Roadmap", description: "x".repeat(1001) })).toBe(
      "Description must be at most 1000 characters",
    );
  });
});

describe("taskSchema", () => {
  const valid = { title: "Write docs", description: "", priority: "Medium", status: "Todo", dueDate: "" };

  it("accepts a task without a due date", () => {
    expect(taskSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a calendar date", () => {
    expect(taskSchema.safeParse({ ...valid, dueDate: "2030-01-31" }).success).toBe(true);
  });

  it.each(["not-a-date", "2030-13-45", "31/01/2030"])("rejects the due date %s", (dueDate) => {
    expect(firstError(taskSchema, { ...valid, dueDate })).toBe("Enter a valid date");
  });

  it("requires a title and caps its length", () => {
    expect(firstError(taskSchema, { ...valid, title: "  " })).toBe("Title is required");
    expect(firstError(taskSchema, { ...valid, title: "x".repeat(201) })).toBe("Title must be at most 200 characters");
  });

  it("only allows known priorities and statuses", () => {
    expect(taskSchema.safeParse({ ...valid, priority: "Urgent" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...valid, status: "Archived" }).success).toBe(false);
  });
});
