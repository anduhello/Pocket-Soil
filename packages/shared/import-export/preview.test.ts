import { describe, expect, it, vi } from "vitest";
import { previewImport } from "./preview";
import { importBookmarksFromFile } from "./importer";
import { BookmarkTypes } from "../types/bookmarks";

const bookmark = (url: string) => ({
  title: "参考",
  content: { type: BookmarkTypes.LINK as const, url },
  tags: [],
  paths: [["设计"]],
});

describe("import preview", () => {
  it("separates new, existing, in-file duplicates and invalid without mutating input", () => {
    const parsed = {
      lists: [],
      bookmarks: [
        bookmark(" https://example.com/new "),
        bookmark("https://example.com/new"),
        bookmark("https://example.com/old"),
        bookmark("javascript:alert(1)"),
        bookmark("https://user:secret@example.com"),
      ],
    };
    const preview = previewImport(parsed, ["https://example.com/old"]);
    expect(preview.counts).toEqual({
      total: 5,
      new: 1,
      existing: 1,
      duplicate: 1,
      invalid: 2,
    });
    expect(preview.parsed.bookmarks[0].paths).toEqual([["设计"]]);
    expect(preview.parsed.bookmarks[0].content).toEqual({
      type: "link",
      url: "https://example.com/new",
    });
    expect(parsed.bookmarks).toHaveLength(5);
    expect(parsed.bookmarks[0].content.url).toBe(" https://example.com/new ");
  });

  it("cancellation makes no import writes", async () => {
    const deps = {
      createList: vi.fn(),
      createImportSession: vi.fn(),
      stageImportedBookmarks: vi.fn(),
      finalizeImportStaging: vi.fn(),
    };
    const result = await importBookmarksFromFile(
      {
        file: { text: async () => "unused" },
        source: "html",
        rootListName: "导入",
        deps,
      },
      {
        parsers: {
          html: () => ({
            lists: [],
            bookmarks: [bookmark("https://example.com")],
          }),
        },
        confirmImport: async () => false,
      },
    );
    expect(result.cancelled).toBe(true);
    for (const write of Object.values(deps))
      expect(write).not.toHaveBeenCalled();
  });

  it("preserves distinct query parameters rather than merging content", () => {
    expect(
      previewImport({
        lists: [],
        bookmarks: [
          bookmark("https://example.com?id=1"),
          bookmark("https://example.com?id=2"),
        ],
      }).counts.new,
    ).toBe(2);
  });
});
