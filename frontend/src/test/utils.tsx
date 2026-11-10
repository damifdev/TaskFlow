import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import type { TaskDto, UserDto } from "@/api/types";
import { AuthContext, type AuthContextValue } from "@/auth/AuthContext";
import { ToastProvider } from "@/components/ToastProvider";

export const TEST_USER: UserDto = {
  id: "user-1",
  email: "alice@example.com",
  displayName: "Alice",
  role: "User",
};

export function makeTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: "task-1",
    projectId: "project-1",
    title: "Write documentation",
    description: null,
    status: "Todo",
    priority: "Medium",
    dueDate: null,
    createdAt: "2030-01-01T09:00:00Z",
    updatedAt: "2030-01-01T09:00:00Z",
    ...overrides,
  };
}

interface RenderOptions {
  /** Initial URL for the in-memory router. */
  route?: string;
  /** Overrides for the auth context (status, user, login, ...). */
  auth?: Partial<AuthContextValue>;
}

/** Renders with the same providers as the real app, minus the network: a fresh query cache, router, toasts and auth. */
export function renderWithProviders(ui: ReactElement, { route = "/", auth }: RenderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const authValue: AuthContextValue = {
    status: "authenticated",
    user: TEST_USER,
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    ...auth,
  };

  return {
    queryClient,
    authValue,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <ToastProvider>
            <AuthContext value={authValue}>{ui}</AuthContext>
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}
