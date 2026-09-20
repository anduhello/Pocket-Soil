import { useTranslation } from "@/lib/i18n/server";
import { TFunction } from "i18next";

import SidebarItem from "./SidebarItem";
import SeedlingHedgehogPet from "./SeedlingHedgehogPet";
import Link from "next/link";
import { Import, Sprout } from "lucide-react";
import { TSidebarItem } from "./TSidebarItem";

export default async function Sidebar({
  items,
  extraSections,
}: {
  items: (t: TFunction) => TSidebarItem[];
  extraSections?: React.ReactNode;
}) {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();

  return (
    <aside className="relative flex h-[calc(100dvh-64px)] w-[220px] flex-col gap-5 border-r p-4">
      <div>
        <ul className="flex flex-col gap-2 text-sm">
          {items(t).map((item) => (
            <SidebarItem
              key={item.name}
              logo={item.icon}
              name={item.name}
              path={item.path}
            />
          ))}
        </ul>
      </div>
      <Link
        href="/settings/import"
        className="group flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary px-3 py-3 text-base font-semibold text-primary-foreground shadow-md transition duration-200 hover:-rotate-[0.6deg] hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110">
          <Sprout size={23} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Import size={20} className="shrink-0" />
          <span>{t("seedbed.import_export")}</span>
        </span>
      </Link>
      {extraSections}
      <SeedlingHedgehogPet />
    </aside>
  );
}
