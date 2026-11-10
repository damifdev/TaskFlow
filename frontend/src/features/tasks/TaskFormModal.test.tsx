import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as tasksApi from "@/api/tasks";
import { makeTask, renderWithProviders } from "@/test/utils";
import { TaskFormModal } from "./TaskFormModal";

vi.mock("@/api/tasks");
const api = vi.mocked(tasksApi);

beforeEach(() => vi.resetAllMocks());

describe("TaskFormModal", () => {
  it("creates a task with trimmed optional fields converted to null", async () => {
    api.createTask.mockResolvedValue(makeTask());
    const onClose = vi.fn();
    renderWithProviders(<TaskFormModal projectId="project-1" onClose={onClose} />);

    await userEvent.type(screen.getByLabelText("Title"), "Ship it");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() =>
      expect(api.createTask).toHaveBeenCalledWith("project-1", {
        title: "Ship it",
        description: null,
        priority: "Medium",
        dueDate: null,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("blocks submission without a title", async () => {
    renderWithProviders(<TaskFormModal projectId="project-1" onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(api.createTask).not.toHaveBeenCalled();
  });

  it("pre-fills an existing task and sends the status with the update", async () => {
    const task = makeTask({ title: "Old title", status: "InProgress", priority: "High", dueDate: "2030-05-01" });
    api.updateTask.mockResolvedValue(task);
    renderWithProviders(<TaskFormModal projectId="project-1" task={task} onClose={vi.fn()} />);

    const title = screen.getByLabelText("Title");
    expect(title).toHaveValue("Old title");
    await userEvent.clear(title);
    await userEvent.type(title, "New title");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(api.updateTask).toHaveBeenCalledWith("task-1", {
        title: "New title",
        description: null,
        priority: "High",
        dueDate: "2030-05-01",
        status: "InProgress",
      }),
    );
  });
});
