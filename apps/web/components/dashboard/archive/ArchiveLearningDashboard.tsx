"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/client";
import {
  ArchiveRestore,
  BookCheck,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";
import { useUpdateBookmark } from "@karakeep/shared-react/hooks/bookmarks";
import { getBookmarkTitle } from "@karakeep/shared/utils/bookmarkUtils";

function formatCompletedAt(date: Date | null, locale: string) {
  if (!date) return locale === "zh" ? "时间未记录" : "Time unavailable";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function ArchiveLearningDashboard({
  initialBookmarks,
  activeCount,
  activeHasMore,
  archivedHasMore,
}: {
  initialBookmarks: ZBookmark[];
  activeCount: number;
  activeHasMore: boolean;
  archivedHasMore: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const updateBookmark = useUpdateBookmark({
    onSuccess: (bookmark) => {
      setBookmarks((items) => items.filter((item) => item.id !== bookmark.id));
      setRestoringId(null);
      toast.success(t("seedbed.archive_restored"));
    },
    onError: () => {
      setRestoringId(null);
      toast.error(t("common.something_went_wrong"));
    },
  });

  const completedThisMonth = useMemo(() => {
    const now = new Date();
    return bookmarks.filter((bookmark) => {
      if (!bookmark.modifiedAt) return false;
      const date = new Date(bookmark.modifiedAt);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    }).length;
  }, [bookmarks]);

  const totalKnown = bookmarks.length + activeCount;
  const completionRate = totalKnown
    ? Math.round((bookmarks.length / totalKnown) * 100)
    : 0;
  const countIsPartial = activeHasMore || archivedHasMore;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookCheck className="size-6" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("seedbed.archive_title")}
            </h1>
            <p className="text-muted-foreground">
              {t("seedbed.archive_description")}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            {t("seedbed.archive_completed")}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {bookmarks.length}
            {archivedHasMore ? "+" : ""}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            {t("seedbed.archive_month")}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {completedThisMonth}
            {archivedHasMore ? "+" : ""}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            {t("seedbed.archive_progress")}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-semibold tabular-nums">
              {completionRate}%
            </p>
            {countIsPartial ? (
              <span className="text-xs text-muted-foreground">
                {t("seedbed.archive_loaded_scope")}
              </span>
            ) : null}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4 border-b pb-3">
          <div>
            <h2 className="text-xl font-semibold">
              {t("seedbed.archive_history")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("seedbed.archive_history_help")}
            </p>
          </div>
        </div>

        {bookmarks.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <BookCheck className="mx-auto size-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-medium">{t("seedbed.archive_empty")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t("seedbed.archive_empty_help")}
            </p>
            <Button asChild className="mt-5">
              <Link href="/dashboard/bookmarks">
                {t("seedbed.archive_back_to_library")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {bookmarks.map((bookmark) => {
              const url =
                bookmark.content.type === BookmarkTypes.LINK
                  ? bookmark.content.url
                  : null;
              return (
                <article
                  key={bookmark.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-medium">
                      {getBookmarkTitle(bookmark) ?? t("common.bookmarks")}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-4" />
                        {t("seedbed.archive_completed_at", {
                          date: formatCompletedAt(
                            bookmark.modifiedAt,
                            i18n.language,
                          ),
                        })}
                      </span>
                      {bookmark.tags.slice(0, 3).map((tag) => (
                        <span key={tag.id}>#{tag.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {url ? (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={url} target="_blank" rel="noreferrer">
                          <ExternalLink data-icon="inline-start" />
                          {t("seedbed.archive_open_source")}
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={restoringId === bookmark.id}
                      onClick={() => {
                        setRestoringId(bookmark.id);
                        updateBookmark.mutate({
                          bookmarkId: bookmark.id,
                          archived: false,
                        });
                      }}
                    >
                      <ArchiveRestore data-icon="inline-start" />
                      {t("seedbed.archive_restore")}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
