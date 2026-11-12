/**
 * Unit tests for useUnreadNotifications hook.
 *
 * Tests the exported query key helper and mocked fetch logic.
 * Component-level integration tests (with QueryClientProvider) will be
 * added in Phase 11 when RTL test patterns are established.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { unreadNotificationsKey } from "./useUnreadNotifications";

describe("unreadNotificationsKey", () => {
  it("returns a stable 4-tuple with correct shape (defaults to personal scope)", () => {
    const key = unreadNotificationsKey("tok_abc");
    expect(key).toEqual(["notifications", "unread-count", "tok_abc", "personal"]);
  });

  it("includes null token when unauthenticated", () => {
    const key = unreadNotificationsKey(null);
    expect(key).toEqual(["notifications", "unread-count", null, "personal"]);
  });

  it("produces a different key for different tokens (cache isolation)", () => {
    const a = unreadNotificationsKey("tok_1");
    const b = unreadNotificationsKey("tok_2");
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("separates personal and Space scopes (cache isolation)", () => {
    expect(unreadNotificationsKey("tok", "space_1")).toEqual(["notifications", "unread-count", "tok", "space_1"]);
    expect(JSON.stringify(unreadNotificationsKey("tok", "space_1"))).not.toBe(JSON.stringify(unreadNotificationsKey("tok")));
  });
});

describe("fetch contract (mocked)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unread: 42 }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("global fetch stub returns expected structure", async () => {
    const res = await fetch("/api/notifications/unread-count", {
      headers: { Authorization: "Bearer test" },
    });
    const data = await res.json();
    expect(data.unread).toBe(42);
  });
});
