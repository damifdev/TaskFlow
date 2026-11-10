const REFRESH_TOKEN_KEY = "taskflow.refreshToken";

// Trade-off: the short-lived access token lives in memory only, so XSS cannot read
// it from storage and it disappears on reload. The refresh token must survive a
// reload to restore the session, so it sits in localStorage. That is readable by
// any script on the page (an httpOnly cookie would be safer), which is mitigated by
// the backend rotating refresh tokens and revoking the session on reuse.
let accessToken: string | null = null;

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return accessToken;
  },

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setSession(session: StoredSession): void {
    accessToken = session.accessToken;
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    } catch {
      // Storage unavailable (private mode, quota): the session just won't survive a reload.
    }
  },

  clear(): void {
    accessToken = null;
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  },
};
