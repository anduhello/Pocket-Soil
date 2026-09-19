import { BookmarkTypes } from "../types/bookmarks";
import type { ParsedBookmark, ParsedImportFile } from "./parsers";

export function previewImport(
  parsed: ParsedImportFile,
  existingUrls: string[] = [],
) {
  const existing = new Set(existingUrls);
  const seen = new Set<string>();
  const accepted: ParsedBookmark[] = [];
  const counts = {
    total: parsed.bookmarks.length,
    new: 0,
    existing: 0,
    duplicate: 0,
    invalid: 0,
  };
  const entries = parsed.bookmarks.map((bookmark) => {
    let status: "new" | "existing" | "duplicate" | "invalid" = "new";
    const content = bookmark.content;
    let url: string | undefined;
    if (content?.type === BookmarkTypes.LINK) {
      url = content.url.trim();
      try {
        const address = new URL(url);
        if (
          !["http:", "https:"].includes(address.protocol) ||
          address.username ||
          address.password ||
          url.length > 8192
        ) {
          status = "invalid";
        }
      } catch {
        status = "invalid";
      }
      if (status !== "invalid") {
        if (seen.has(url)) status = "duplicate";
        else if (existing.has(url)) status = "existing";
        seen.add(url);
      }
    } else if (!content || !content.text.trim()) {
      status = "invalid";
    }
    counts[status]++;
    if (status === "new") {
      accepted.push(
        url
          ? { ...bookmark, content: { type: BookmarkTypes.LINK, url } }
          : bookmark,
      );
    }
    return {
      title: bookmark.title,
      url,
      paths: bookmark.paths,
      status,
      notes: bookmark.notes,
      tags: bookmark.tags,
      bookmarkIndex: status === "new" ? accepted.length - 1 : null,
    };
  });
  return { counts, entries, parsed: { ...parsed, bookmarks: accepted } };
}

export type ImportPreview = ReturnType<typeof previewImport>;

export function selectImportPreview(
  preview: ImportPreview,
  selected: ReadonlySet<number>,
): ParsedImportFile {
  return {
    ...preview.parsed,
    bookmarks: preview.parsed.bookmarks.filter((_bookmark, index) =>
      selected.has(index),
    ),
  };
}
