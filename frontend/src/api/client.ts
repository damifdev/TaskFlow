import { tokenStorage } from "@/auth/tokenStorage";
import { ApiError } from "./errors";
import type { AuthResponse } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Set to false for endpoints that must not carry (or refresh) a bearer token. */
  auth?: boolean;
}

let sessionExpiredHandler: (() => void) | null = null;

/** Registered by AuthProvider so a dead session can send the user back to /login. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const queryString = params.toString();
  return `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;
}

async function send<T>(path: string, options: RequestOptions, accessToken: string | null): Promise<T> {
  const { method = "GET", body, query } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

let refreshInFlight: Promise<AuthResponse> | null = null;

/**
 * Exchanges the stored refresh token for a new session. Refresh tokens rotate, so
 * concurrent callers must share one request: a second call with the old token would
 * be treated as reuse and revoke the whole session.
 */
export function refreshSession(): Promise<AuthResponse> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh(): Promise<AuthResponse> {
  try {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new ApiError({ status: 401, message: "You are not signed in." });
    const session = await send<AuthResponse>(
      "/api/auth/refresh",
      { method: "POST", body: { refreshToken }, auth: false },
      null,
    );
    tokenStorage.setSession(session);
    return session;
  } catch (error) {
    tokenStorage.clear();
    sessionExpiredHandler?.();
    throw error;
  }
}

async function recoverAccessToken(staleToken: string | null): Promise<string> {
  // Another request may already have refreshed while this one was in flight.
  const current = tokenStorage.getAccessToken();
  if (current && current !== staleToken) return current;
  return (await refreshSession()).accessToken;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (options.auth === false) return send<T>(path, options, null);

  const usedToken = tokenStorage.getAccessToken();
  try {
    return await send<T>(path, options, usedToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    // Retry exactly once; a second 401 is surfaced to the caller as-is.
    return send<T>(path, options, await recoverAccessToken(usedToken));
  }
}
