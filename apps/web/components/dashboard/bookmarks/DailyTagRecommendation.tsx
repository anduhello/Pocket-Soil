"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/client";
import { useQuery } from "@tanstack/react-query";
import { Leaf, Sparkles } from "lucide-react";

import { useTRPC } from "@karakeep/shared-react/trpc";

function dailyIndex(length: number) {
  const day = new Date().toISOString().slice(0, 10);
  return (
    [...day].reduce((total, character) => total + character.charCodeAt(0), 0) %
    length
  );
}

export default function DailyTagRecommendation() {
  const { t } = useTranslation();
  const api = useTRPC();
  const { data } = useQuery(
    api.tags.list.queryOptions({ limit: 100, sortBy: "usage" }),
  );
  const tags = data?.tags.filter((tag) => tag.numBookmarks > 0) ?? [];

  if (!tags.length) return null;
  const tag = tags[dailyIndex(tags.length)];

  return (
    <Link
      href={`/dashboard/tags/${tag.id}`}
      className="group relative flex min-h-56 flex-1 items-end overflow-hidden rounded-3xl border border-primary/20 bg-[#eef4e8] px-6 py-5 shadow-sm transition duration-200 hover:-rotate-[0.25deg] hover:border-primary/40 hover:shadow-md"
    >
      <Image
        src="/seedbed/soil-mini-charms.png"
        alt=""
        width={180}
        height={60}
        className="pointer-events-none absolute left-5 top-3 h-10 w-auto opacity-85 transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-105"
      />
      <span className="relative z-10 min-w-0 rounded-2xl bg-[#fdfdf9]/85 p-3 pr-6 shadow-sm backdrop-blur-[2px]">
        <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Leaf className="size-4" />
          <Sparkles className="size-3.5" />
          {t("seedbed.daily_tag_eyebrow")}
        </span>
        <span className="mt-0.5 block truncate text-base font-semibold text-foreground">
          #{tag.name}
        </span>
      </span>
      <span className="relative z-10 ml-auto shrink-0 rounded-full bg-white/75 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
        {t("seedbed.daily_tag_count", { count: tag.numBookmarks })}
      </span>
    </Link>
  );
}
