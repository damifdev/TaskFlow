import { describe, expect, it } from "vitest";
import { formatDueDate, isOverdue, toLocalIsoDate } from "./dates";

describe("toLocalIsoDate", () => {
  it("formats the local calendar date with zero padding", () => {
    expect(toLocalIsoDate(new Date(2030, 0, 5))).toBe("2030-01-05");
    expect(toLocalIsoDate(new Date(2030, 11, 31))).toBe("2030-12-31");
  });
});

describe("isOverdue", () => {
  const today = "2030-06-15";

  it("flags unfinished tasks whose due date has passed", () => {
    expect(isOverdue("2030-06-14", "Todo", today)).toBe(true);
    expect(isOverdue("2030-06-14", "InProgress", today)).toBe(true);
  });

  it("does not flag tasks due today or later", () => {
    expect(isOverdue("2030-06-15", "Todo", today)).toBe(false);
    expect(isOverdue("2030-06-16", "Todo", today)).toBe(false);
  });

  it("never flags finished tasks or tasks without a due date", () => {
    expect(isOverdue("2000-01-01", "Done", today)).toBe(false);
    expect(isOverdue(null, "Todo", today)).toBe(false);
  });
});

describe("formatDueDate", () => {
  it("keeps the calendar day instead of shifting it through UTC", () => {
    const formatted = formatDueDate("2030-03-01");

    expect(formatted).toContain("2030");
    expect(formatted).toMatch(/\b1\b/);
  });

  it("returns malformed input unchanged", () => {
    expect(formatDueDate("soon")).toBe("soon");
  });
});
