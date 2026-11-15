import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: mocks.request }) }) }) },
}));
vi.mock("@/offline/offlineContent", () => ({ useOfflineRows: () => null }));
vi.mock("@/offline/mediaMap", () => ({ offlineMedia: (v: string) => v, offlineMediaHtml: (v: string) => v }));
import { useDbPostsState } from "./useDbPosts";

describe("blog request lifecycle", () => {
  it("keeps loading separate from an empty array until current posts arrive", async () => {
    let finish: ((value: unknown) => void) | undefined;
    mocks.request.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useDbPostsState());
    expect(result.current.loading).toBe(true);
    expect(result.current.posts).toEqual([]);
    await act(async () => { finish?.({ data: [{ id: "1", slug: "toldot-rivka", title: "Rivka", created_at: "2026-11-15", category_slug: "posts-ishiyim" }], error: null }); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts[0]?.slug).toBe("toldot-rivka");
  });
  it("finishes loading after a failed request so existing posts remain accessible", async () => {
    mocks.request.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    const { result } = renderHook(() => useDbPostsState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toEqual([]);
  });
});