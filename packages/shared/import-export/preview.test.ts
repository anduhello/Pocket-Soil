import { describe, expect, it, vi } from "vitest";
import { previewImport, selectImportPreview } from "./preview";
import { importBookmarksFromFile } from "./importer";
import { parseImportFile } from "./parsers";
import { BookmarkTypes } from "../types/bookmarks";

const bookmark = (url: string) => ({
  title: "参考",
  content: { type: BookmarkTypes.LINK as const, url },
  tags: [],
  paths: [["设计"]],
});

describe("import preview", () => {
  it("selects only new entries and preserves descriptions and tags across pages", () => {
    const parsed = {
      lists: [],
      bookmarks: [
        bookmark("invalid"),
        bookmark("https://example.com/old"),
        ...Array.from({ length: 150 }, (_, index) => ({
          ...bookmark(`https://example.com/${index}`),
          notes: "简介",
          tags: ["设计"],
        })),
      ],
    };
    const preview = previewImport(parsed, ["https://example.com/old"]);
    expect(
      preview.entries.slice(0, 3).map((entry) => entry.bookmarkIndex),
    ).toEqual([null, null, 0]);
    const chosen = selectImportPreview(preview, new Set([149, -1, 999]));
    expect(chosen.bookmarks).toEqual([preview.parsed.bookmarks[149]]);
    expect(chosen.bookmarks[0].notes).toBe("简介");
    expect(chosen.bookmarks[0].tags).toEqual(["设计"]);
    expect(preview.parsed.bookmarks).toHaveLength(150);
  });

  it("stages only selected entries and makes no writes for an empty selection", async () => {
    for (const selected of [new Set([1]), new Set<number>()]) {
      const deps = {
        createList: vi.fn().mockResolvedValue({ id: "list" }),
        createImportSession: vi.fn().mockResolvedValue({ id: "session" }),
        stageImportedBookmarks: vi.fn(),
        finalizeImportStaging: vi.fn(),
      };
      const parsed = {
        lists: [],
        bookmarks: [
          bookmark("https://example.com/a"),
          {
            ...bookmark("https://example.com/b"),
            notes: "简介",
            tags: ["设计"],
          },
        ],
      };
      await importBookmarksFromFile(
        {
          file: { text: async () => "unused" },
          source: "links",
          rootListName: "导入",
          deps,
        },
        {
          parsers: { links: () => parsed },
          confirmImport: async () =>
            selectImportPreview(previewImport(parsed), selected),
        },
      );
      if (selected.size === 0) {
        for (const write of Object.values(deps))
          expect(write).not.toHaveBeenCalled();
      } else {
        const staged = deps.stageImportedBookmarks.mock.calls[0][0].bookmarks;
        expect(staged).toHaveLength(1);
        expect(staged[0].url).toBe("https://example.com/b");
        expect(staged[0].note).toBe("简介");
        expect(staged[0].tags).toEqual(["设计"]);
      }
    }
  });
  it("parses pasted lines while retaining invalid and duplicate entries for preview", () => {
    const parsed = parseImportFile(
      "links",
      "  https://example.com/a  \r\n\r\nhttps://example.com/a\nnot a link\rhttps://example.com/b",
    );
    expect(previewImport(parsed, ["https://example.com/b"]).counts).toEqual({
      total: 4,
      new: 1,
      existing: 1,
      duplicate: 1,
      invalid: 1,
    });
    expect(parsed.bookmarks[0].title).toBe("");
    expect(parseImportFile("links", " \n\r\n").bookmarks).toEqual([]);
  });

  it("HTML parsing retains duplicates so preview reports original counts", () => {
    const parsed = parseImportFile(
      "html",
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<DL><DT><A HREF="https://example.com">One</A></DT><DT><A HREF="https://example.com">Two</A></DT></DL>',
      { preserveDuplicates: true },
    );
    expect(previewImport(parsed).counts).toEqual({
      total: 2,
      new: 1,
      existing: 0,
      duplicate: 1,
      invalid: 0,
    });
  });
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
