import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/utils";
import { AdminRoute } from "./AdminRoute";
import { ProtectedRoute } from "./ProtectedRoute";

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
  return <p>login page, came from {from ?? "nowhere"}</p>;
}

function Tree() {
  return (
    <Routes>
      <Route path="/login" element={<LoginProbe />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<p>home</p>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<p>admin area</p>} />
        </Route>
      </Route>
    </Routes>
  );
}

describe("route guards", () => {
  it("sends anonymous visitors to /login and remembers where they were going", () => {
    renderWithProviders(<Tree />, { route: "/admin", auth: { status: "unauthenticated", user: null } });

    expect(screen.getByText("login page, came from /admin")).toBeInTheDocument();
  });

  it("shows a spinner instead of redirecting while the session is being restored", () => {
    renderWithProviders(<Tree />, { route: "/", auth: { status: "loading", user: null } });

    expect(screen.queryByText("home")).not.toBeInTheDocument();
    expect(screen.queryByText(/login page/)).not.toBeInTheDocument();
  });

  it("lets signed-in users through", () => {
    renderWithProviders(<Tree />, { route: "/" });

    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("keeps non-admins out of the admin area", () => {
    renderWithProviders(<Tree />, { route: "/admin" });

    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.queryByText("admin area")).not.toBeInTheDocument();
  });

  it("admits admins", () => {
    renderWithProviders(<Tree />, {
      route: "/admin",
      auth: { user: { id: "a", email: "admin@x.dev", displayName: "Admin", role: "Admin" } },
    });

    expect(screen.getByText("admin area")).toBeInTheDocument();
  });
});
