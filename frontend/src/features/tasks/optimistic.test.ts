import { describe, expect, it } from "vitest";
import type { PagedResult, TaskDto } from "@/api/types";
import { makeTask } from "@/test/utils";
import { applyStatusChange } from "./optimistic";

function page(items: TaskDto[], totalCount = items.length): PagedResult<TaskDto> {
  return { items, page: 1, pageSize: 10, totalCount, totalPages: 1 };
}

const moved = makeTask({ id: "moved", title: "Moving task", status: "Todo" });
const other = makeTask({ id: "other", title: "Bystander", status: "Todo" });

describe("applyStatusChange", () => {
  it("updates the task in place in the list view", () => {
    const key = ["tasks", "project-1", "list", {}];

    const result = applyStatusChange(key, page([moved, other]), moved, "moved", "Done");

    expect(result.items.map((task) => [task.id, task.status])).toEqual([
      ["moved", "Done"],
      ["other", "Todo"],
    ]);
    expect(result.totalCount).toBe(2);
  });

  it("removes the task from the column it is leaving on the board", () => {
    const key = ["tasks", "project-1", "board", "Todo", {}];

    const result = applyStatusChange(key, page([moved, other]), moved, "moved", "Done");

    expect(result.items.map((task) => task.id)).toEqual(["other"]);
    expect(result.totalCount).toBe(1);
  });

  it("adds the task to the top of the column it is entering", () => {
    const key = ["tasks", "project-1", "board", "Done", {}];
    const existing = makeTask({ id: "existing", status: "Done" });

    const result = applyStatusChange(key, page([existing]), moved, "moved", "Done");

    expect(result.items.map((task) => [task.id, task.status])).toEqual([
      ["moved", "Done"],
      ["existing", "Done"],
    ]);
    expect(result.totalCount).toBe(2);
  });

  it("does not duplicate a task that is already in the target column", () => {
    const key = ["tasks", "project-1", "board", "Done", {}];
    const data = page([makeTask({ id: "moved", status: "Done" })]);

    expect(applyStatusChange(key, data, moved, "moved", "Done")).toBe(data);
  });

  it("leaves unrelated board columns untouched", () => {
    const key = ["tasks", "project-1", "board", "InProgress", {}];
    const data = page([makeTask({ id: "x", status: "InProgress" })]);

    expect(applyStatusChange(key, data, moved, "moved", "Done")).toBe(data);
  });

  it("cannot add a task it has never seen to a column", () => {
    const key = ["tasks", "project-1", "board", "Done", {}];
    const data = page([]);

    expect(applyStatusChange(key, data, undefined, "unknown", "Done")).toBe(data);
  });
});
