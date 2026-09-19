import { useTranslation } from "@/lib/i18n/server";
import { TFunction } from "i18next";

import serverConfig from "@karakeep/shared/config";

import SidebarItem from "./SidebarItem";
import SidebarVersion from "./SidebarVersion";
import Link from "next/link";
import { Import } from "lucide-react";
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
    <aside className="flex h-[calc(100dvh-64px)] w-[220px] flex-col gap-5 border-r p-4">
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
      {extraSections}
      <Link
        href="/settings/import"
        className="mt-auto flex items-center gap-3 rounded-lg border-t px-3 py-4 text-sm hover:bg-accent"
      >
        <Import size={18} />
        {t("seedbed.import_export")}
      </Link>
      <SidebarVersion
        serverVersion={serverConfig.serverVersion}
        changeLogVersion={serverConfig.changelogVersion}
      />
    </aside>
  );
}
