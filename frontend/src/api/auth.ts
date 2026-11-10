import { request } from "./client";
import type { AuthResponse, LoginRequest, RegisterRequest } from "./types";

export function register(input: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", { method: "POST", body: input, auth: false });
}

export function login(input: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", { method: "POST", body: input, auth: false });
}

export function logout(refreshToken: string): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST", body: { refreshToken } });
}
