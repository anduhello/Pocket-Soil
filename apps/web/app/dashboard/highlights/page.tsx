import type { Metadata } from "next";
import Bookmarks from "@/components/dashboard/bookmarks/Bookmarks";
import { useTranslation } from "@/lib/i18n/server";
import { Sparkles } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  return {
    title: `${t("common.highlights")} | Little Soil`,
  };
}

export default async function HighlightsPage() {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  return (
    <Bookmarks
      query={{ favourited: true, archived: false }}
      showDivider
      header={
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {t("common.highlights")}
              </h1>
              <p className="text-muted-foreground">
                {t("seedbed.highlights_description")}
              </p>
            </div>
          </div>
        </div>
      }
    />
  );
}
