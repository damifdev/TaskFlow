import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as projectsApi from "@/api/projects";
import type { ProjectDto } from "@/api/types";
import { renderWithProviders } from "@/test/utils";
import { ProjectsPage } from "./ProjectsPage";

vi.mock("@/api/projects");
const api = vi.mocked(projectsApi);

const project = (overrides: Partial<ProjectDto>): ProjectDto => ({
  id: "p1",
  name: "Website relaunch",
  description: "Ship the new site",
  createdAt: "2030-01-01T00:00:00Z",
  taskCount: 4,
  doneCount: 1,
  ...overrides,
});

beforeEach(() => vi.resetAllMocks());

describe("ProjectsPage", () => {
  it("lists projects with their progress", async () => {
    api.listProjects.mockResolvedValue([project({}), project({ id: "p2", name: "Mobile app", taskCount: 0, doneCount: 0 })]);
    renderWithProviders(<ProjectsPage />);

    expect(await screen.findByRole("link", { name: "Website relaunch" })).toHaveAttribute("href", "/projects/p1");
    expect(screen.getByText("1 of 4 tasks done")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Website relaunch progress" })).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByRole("progressbar", { name: "Mobile app progress" })).toHaveAttribute("aria-valuenow", "0");
  });

  it("shows an empty state that invites the first project", async () => {
    api.listProjects.mockResolvedValue([]);
    renderWithProviders(<ProjectsPage />);

    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "New project" }).length).toBeGreaterThan(0);
  });

  it("shows an error state when loading fails", async () => {
    api.listProjects.mockRejectedValue(new Error("boom"));
    renderWithProviders(<ProjectsPage />);

    expect(await screen.findByText("Could not load projects")).toBeInTheDocument();
  });
});
