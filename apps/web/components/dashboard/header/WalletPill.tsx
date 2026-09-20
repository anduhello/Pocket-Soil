"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/client";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@karakeep/shared-react/trpc";

export default function WalletPill() {
  const { t } = useTranslation();
  const api = useTRPC();
  const { data: wallet } = useQuery(api.billing.summary.queryOptions());

  return (
    <Link
      href="/settings/stats"
      className="group flex h-11 shrink-0 items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 pr-3 text-amber-950 shadow-sm transition duration-200 hover:-rotate-[0.7deg] hover:border-amber-400 hover:shadow-md active:scale-[0.98] dark:bg-amber-950/30 dark:text-amber-100"
      title={t("seedbed.coin_balance")}
    >
      <span className="relative size-8 shrink-0 overflow-hidden rounded-full border border-amber-300/60 bg-[#f5f7df] shadow-inner transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110">
        <Image
          src="/seedbed/ai-points-leaf-tag.png"
          alt=""
          fill
          sizes="32px"
          className="object-contain p-0.5"
        />
      </span>
      <span className="hidden text-xs font-medium sm:block">
        {t("seedbed.coin_balance")}
      </span>
      <span className="text-base font-bold tabular-nums">
        {wallet?.balance ?? "—"}
      </span>
    </Link>
  );
}
