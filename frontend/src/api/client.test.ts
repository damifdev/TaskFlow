import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStorage } from "@/auth/tokenStorage";
import { request, setSessionExpiredHandler } from "./client";
import { ApiError } from "./errors";
import type { AuthResponse } from "./types";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function problem(status: number, detail: string): Response {
  return jsonResponse({ title: "Problem", status, detail }, status);
}

function makeSession(accessToken: string, refreshToken: string): AuthResponse {
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: "2030-01-01T00:00:00Z",
    user: { id: "user-1", email: "alice@example.com", displayName: "Alice", role: "User" },
  };
}

function callAt(index: number) {
  const call = fetchMock.mock.calls[index];
  if (!call) throw new Error(`Expected fetch call #${index}, but it never happened`);
  const init = call[1] ?? {};
  return {
    url: String(call[0]),
    method: init.method,
    body: init.body,
    headers: (init.headers ?? {}) as Record<string, string>,
  };
}

function signIn(accessToken = "old-access", refreshToken = "old-refresh") {
  tokenStorage.setSession({ accessToken, refreshToken });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  tokenStorage.clear();
  setSessionExpiredHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("sends the access token as a bearer header", async () => {
    signIn("abc123");
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await request("/api/projects");

    expect(callAt(0).headers.Authorization).toBe("Bearer abc123");
  });

  it("omits the bearer header for endpoints that opt out of auth", async () => {
    signIn("abc123");
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await request("/api/auth/login", { method: "POST", body: { email: "a" }, auth: false });

    expect(callAt(0).headers.Authorization).toBeUndefined();
    expect(callAt(0).headers["Content-Type"]).toBe("application/json");
    expect(callAt(0).body).toBe(JSON.stringify({ email: "a" }));
  });

  it("drops empty query values and keeps meaningful ones, including false and 0", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await request("/api/tasks", { query: { search: "", status: undefined, priority: null, descending: false, page: 0 } });

    expect(callAt(0).url).toBe("/api/tasks?descending=false&page=0");
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(request<void>("/api/tasks/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("turns a problem response into an ApiError carrying the server's detail", async () => {
    fetchMock.mockResolvedValue(problem(409, "An account with this email already exists."));

    const error = await request("/api/auth/register", { method: "POST", auth: false }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: "An account with this email already exists." });
  });

  it("normalises validation errors into camelCase field errors", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          title: "One or more validation errors occurred.",
          status: 400,
          errors: { "$.Email": ["Email is invalid."], displayName: ["Too short.", "Needs a letter."] },
        },
        400,
      ),
    );

    const error = await request("/api/auth/register", { method: "POST", auth: false }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors).toEqual({
      email: ["Email is invalid."],
      displayName: ["Too short.", "Needs a letter."],
    });
    expect((error as ApiError).message).toBe("Please correct the highlighted fields.");
  });

  it("reports network failures as status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await request("/api/projects").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });
});

describe("automatic token refresh", () => {
  it("refreshes once on a 401, then retries the request with the new token", async () => {
    signIn("old-access", "old-refresh");
    fetchMock
      .mockResolvedValueOnce(problem(401, "Unauthorized"))
      .mockResolvedValueOnce(jsonResponse(makeSession("new-access", "new-refresh")))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(request("/api/projects")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(callAt(1).url).toBe("/api/auth/refresh");
    expect(callAt(1).body).toBe(JSON.stringify({ refreshToken: "old-refresh" }));
    expect(callAt(2).headers.Authorization).toBe("Bearer new-access");
    // The rotated refresh token replaces the old one.
    expect(tokenStorage.getRefreshToken()).toBe("new-refresh");
  });

  it("shares a single refresh between concurrent 401s", async () => {
    signIn("old-access", "old-refresh");
    fetchMock.mockImplementation((input, init) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      if (url === "/api/auth/refresh") return Promise.resolve(jsonResponse(makeSession("new-access", "new-refresh")));
      if (headers.Authorization === "Bearer old-access") return Promise.resolve(problem(401, "Unauthorized"));
      return Promise.resolve(jsonResponse({ url }));
    });

    const results = await Promise.all([request("/api/a"), request("/api/b"), request("/api/c")]);

    expect(results).toEqual([{ url: "/api/a" }, { url: "/api/b" }, { url: "/api/c" }]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url) === "/api/auth/refresh");
    expect(refreshCalls).toHaveLength(1);
  });

  it("clears the session and notifies the app when the refresh itself fails", async () => {
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    signIn();
    fetchMock.mockResolvedValueOnce(problem(401, "Unauthorized")).mockResolvedValueOnce(problem(401, "Refresh token expired"));

    const error = await request("/api/projects").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("does not retry forever: a 401 after a successful refresh is surfaced", async () => {
    signIn();
    fetchMock
      .mockResolvedValueOnce(problem(401, "Unauthorized"))
      .mockResolvedValueOnce(jsonResponse(makeSession("new-access", "new-refresh")))
      .mockResolvedValueOnce(problem(401, "Still unauthorized"));

    const error = await request("/api/projects").catch((e: unknown) => e);

    expect((error as ApiError).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not try to refresh on non-401 errors", async () => {
    signIn();
    fetchMock.mockResolvedValue(problem(500, "Boom"));

    await request("/api/projects").catch(() => undefined);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
