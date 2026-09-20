"use client";

import Image from "next/image";
import { useTranslation } from "@/lib/i18n/client";

export default function NoBookmarksBanner() {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-[#fbfaf3] p-10 text-center shadow-sm dark:bg-card">
      <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative mb-4 size-36 overflow-hidden rounded-3xl bg-[#fbf6e7] shadow-inner transition-transform duration-300 hover:-rotate-2 hover:scale-105">
        <Image
          src="/seedbed/hedgehog-discovery.png"
          alt=""
          fill
          sizes="144px"
          className="object-cover"
          priority
        />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-foreground">
        {t("banners.no_bookmarks.title")}
      </h3>
      <p className="max-w-md text-muted-foreground">
        {t("banners.no_bookmarks.description")}
      </p>
    </div>
  );
}
