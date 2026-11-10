import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/errors";
import { renderWithProviders } from "@/test/utils";
import { LoginPage } from "./LoginPage";

const anonymous = { status: "unauthenticated", user: null } as const;

describe("LoginPage", () => {
  it("shows validation messages and does not call the API for an empty form", async () => {
    const login = vi.fn();
    renderWithProviders(<LoginPage />, { auth: { ...anonymous, login } });

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("submits the entered credentials", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<LoginPage />, { auth: { ...anonymous, login } });

    await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: "alice@example.com", password: "Password1" }));
  });

  it("explains a rejected login without leaking which field was wrong", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError({ status: 401, message: "Invalid credentials" }));
    renderWithProviders(<LoginPage />, { auth: { ...anonymous, login } });

    await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });
});
