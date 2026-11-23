import { describe, expect, test, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("../services/api", () => ({ getMe: vi.fn() }));
vi.mock("../services/socket", () => ({ connectSocket: vi.fn(), disconnectSocket: vi.fn() }));

import { getMe } from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import { AuthProvider, useAuth } from "./AuthContext";
import { ThemeProvider, useTheme } from "./ThemeContext";

const renderAuth = () => renderHook(() => useAuth(), { wrapper: AuthProvider });
const renderTheme = () => renderHook(() => useTheme(), { wrapper: ThemeProvider });

beforeEach(() => vi.clearAllMocks());

describe("useAuth", () => {
  test("no stored token → signed out, no API call", async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(getMe).not.toHaveBeenCalled();
  });

  test("valid stored token → loads the user and connects the socket", async () => {
    localStorage.setItem("token", "good");
    getMe.mockResolvedValue({ data: { user: { name: "Asha", funds: 100 } } });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.user?.name).toBe("Asha"));
    expect(connectSocket).toHaveBeenCalledWith("good");
  });

  test("expired stored token → removed and signed out", async () => {
    localStorage.setItem("token", "stale");
    getMe.mockRejectedValue(new Error("401"));
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });

  test("login stores the token; updateFunds; logout clears everything", async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.loginUser({ name: "Ravi", funds: 100000 }, "tok"));
    expect(localStorage.getItem("token")).toBe("tok");
    act(() => result.current.updateFunds(5));
    expect(result.current.user.funds).toBe(5);
    act(() => result.current.logoutUser());
    expect(result.current.user).toBeNull();
    expect(disconnectSocket).toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("useTheme", () => {
  test("defaults to light and remembers the choice", () => {
    const { result } = renderTheme();
    expect(result.current.darkMode).toBe(false);
    act(() => result.current.toggleTheme());
    expect(result.current.darkMode).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  test("restores a saved dark theme", () => {
    localStorage.setItem("theme", "dark");
    expect(renderTheme().result.current.darkMode).toBe(true);
  });
});

describe("notifications", () => {
  test("two notifications in the same millisecond get different ids", async () => {
    const { NotificationProvider, useNotification } = await import("./NotificationContext");
    const { result } = renderHook(() => useNotification(), {
      wrapper: ({ children }) => <AuthProvider><NotificationProvider>{children}</NotificationProvider></AuthProvider>,
    });
    const now = vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    act(() => {
      result.current.notify("first");
      result.current.notify("second");
    });
    now.mockRestore();
    const ids = result.current.notifications.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
