import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "@/api/auth";
import { refreshSession, setSessionExpiredHandler } from "@/api/client";
import type { AuthResponse, LoginRequest, RegisterRequest, UserDto } from "@/api/types";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./AuthContext";
import { tokenStorage } from "./tokenStorage";

interface AuthState {
  status: AuthStatus;
  user: UserDto | null;
}

const SIGNED_OUT: AuthState = { status: "unauthenticated", user: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(() =>
    tokenStorage.getRefreshToken() ? { status: "loading", user: null } : SIGNED_OUT,
  );

  // The API client calls this when a refresh fails; ProtectedRoute then redirects to /login.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setState(SIGNED_OUT);
      queryClient.clear();
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient]);

  // Restore the session on load. refreshSession() is single-flight, so React
  // StrictMode's double effect run cannot spend the rotating refresh token twice.
  useEffect(() => {
    if (!tokenStorage.getRefreshToken()) return;
    let active = true;
    refreshSession().then(
      (session) => {
        if (active) setState({ status: "authenticated", user: session.user });
      },
      () => {
        if (active) setState(SIGNED_OUT);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const startSession = useCallback(
    (session: AuthResponse) => {
      queryClient.clear();
      tokenStorage.setSession(session);
      setState({ status: "authenticated", user: session.user });
    },
    [queryClient],
  );

  const login = useCallback(
    async (input: LoginRequest) => startSession(await authApi.login(input)),
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterRequest) => startSession(await authApi.register(input)),
    [startSession],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Signing out locally must work even if the server is unreachable or the token is already dead.
    }
    tokenStorage.clear();
    setState(SIGNED_OUT);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
