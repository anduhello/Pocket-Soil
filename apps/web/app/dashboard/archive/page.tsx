import type { Metadata } from "next";
import ArchiveLearningDashboard from "@/components/dashboard/archive/ArchiveLearningDashboard";
import { useTranslation } from "@/lib/i18n/server";
import { api } from "@/server/api/client";

export async function generateMetadata(): Promise<Metadata> {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  return {
    title: `${t("common.archive")} | Little Soil`,
  };
}

export default async function ArchivedBookmarkPage() {
  const [archived, active] = await Promise.all([
    api.bookmarks.getBookmarks({ archived: true, limit: 100 }),
    api.bookmarks.getBookmarks({ archived: false, limit: 100 }),
  ]);

  return (
    <ArchiveLearningDashboard
      initialBookmarks={archived.bookmarks}
      activeCount={active.bookmarks.length}
      activeHasMore={Boolean(active.nextCursor)}
      archivedHasMore={Boolean(archived.nextCursor)}
    />
  );
}
