// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import SeedbedTagReview from "./SeedbedTagReview";

const mocks = vi.hoisted(() => ({
  ai: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/auth/client", () => ({
  useSession: () => ({ data: { user: { id: "owner" } } }),
}));
vi.mock("@/lib/i18n/client", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@karakeep/shared-react/trpc", () => ({
  useTRPC: () => ({
    importSessions: { suggestBilibiliTags: { mutationOptions: () => ({}) } },
    tags: { list: { queryOptions: () => ({}) } },
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutateAsync: mocks.ai, isPending: false }),
  useQuery: () => ({ data: { tags: [{ id: "existing", name: "UI 设计" }] } }),
}));
vi.mock("@karakeep/shared-react/hooks/bookmarks", () => ({
  useUpdateBookmarkTags: () => ({ mutateAsync: mocks.save, isPending: false }),
  useDeleteBookmark: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));

const item = (id: string, userId = "owner") =>
  ({
    id,
    userId,
    title: `Title ${id}`,
    content: {
      type: "link",
      url: "https://www.bilibili.com/video/BV1u2Ke6hEZk",
    },
    note: "简介",
    tags: [],
  }) as unknown as ZBookmark;
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
beforeEach(() => {
  (globalThis as unknown as { React: typeof React }).React = React;
  vi.clearAllMocks();
  mocks.ai.mockResolvedValue([{ tags: ["UI 设计", "动效"] }]);
  mocks.save.mockResolvedValue({});
  mocks.remove.mockResolvedValue({});
});
afterEach(cleanup);

describe("Seedbed card tag review", () => {
  it("AI updates a draft only; confirm saves and advances", async () => {
    render(<SeedbedTagReview bookmarks={[item("one"), item("two")]} />);
    click("seedbed.review_untagged");
    click("seedbed.review_ai");
    await screen.findAllByRole("button", { name: "seedbed.review_remove_tag" });
    expect(mocks.save).not.toHaveBeenCalled();
    click("seedbed.review_save");
    await screen.findByText("Title two");
    expect(mocks.save).toHaveBeenCalledWith({
      bookmarkId: "one",
      attach: [{ tagName: "UI 设计" }, { tagName: "动效" }],
      detach: [],
    });
  });
  it("manual input reuses library names and skip makes no writes", async () => {
    render(<SeedbedTagReview bookmarks={[item("one"), item("two")]} />);
    click("seedbed.review_all");
    fireEvent.change(screen.getByLabelText("seedbed.review_manual"), {
      target: { value: "UI设计" },
    });
    click("seedbed.review_add");
    click("seedbed.review_save");
    await screen.findByText("Title two");
    expect(mocks.save.mock.calls[0][0].attach).toEqual([
      { tagName: "UI 设计" },
    ]);
    click("seedbed.review_skip");
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it("failed saving keeps the current card and displays an error", async () => {
    mocks.save.mockRejectedValueOnce(new Error("save failed"));
    render(<SeedbedTagReview bookmarks={[item("one"), item("two")]} />);
    click("seedbed.review_all");
    click("seedbed.review_save");
    await screen.findByRole("alert");
    expect(screen.getByText("Title one")).toBeTruthy();
  });
  it("deletion requires confirmation and then advances", async () => {
    render(<SeedbedTagReview bookmarks={[item("one"), item("two")]} />);
    click("seedbed.review_all");
    click("seedbed.review_delete");
    expect(mocks.remove).not.toHaveBeenCalled();
    click("seedbed.review_delete_confirm");
    await screen.findByText("Title two");
    expect(mocks.remove).toHaveBeenCalledWith({ bookmarkId: "one" });
  });
  it("does not offer other users' bookmarks", () => {
    render(<SeedbedTagReview bookmarks={[item("private", "other")]} />);
    expect(
      screen
        .getByRole("button", { name: "seedbed.review_all" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
  it("keeps the review banner visible and accepts legacy Bilibili short links", () => {
    const legacy = item("legacy");
    if (legacy.content.type === "link")
      legacy.content.url = "https://b23.tv/demo";
    render(<SeedbedTagReview bookmarks={[legacy]} />);
    expect(screen.getByText("seedbed.review_banner_title")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "seedbed.review_all" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
});
