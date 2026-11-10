import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStorage } from "./tokenStorage";

beforeEach(() => tokenStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("tokenStorage", () => {
  it("keeps the access token in memory only and persists the refresh token", () => {
    tokenStorage.setSession({ accessToken: "access", refreshToken: "refresh" });

    expect(tokenStorage.getAccessToken()).toBe("access");
    expect(tokenStorage.getRefreshToken()).toBe("refresh");
    expect(JSON.stringify({ ...localStorage })).not.toContain("access\"");
  });

  it("clears both tokens", () => {
    tokenStorage.setSession({ accessToken: "access", refreshToken: "refresh" });

    tokenStorage.clear();

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it("keeps working when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(() => tokenStorage.setSession({ accessToken: "access", refreshToken: "refresh" })).not.toThrow();
    expect(tokenStorage.getAccessToken()).toBe("access");
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });
});
