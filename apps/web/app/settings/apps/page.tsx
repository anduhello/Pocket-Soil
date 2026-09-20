"use client";

import {
  SettingsPage,
  SettingsSection,
} from "@/components/settings/SettingsPage";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/client";
import { Blocks, Braces, Puzzle, SendToBack, Smartphone } from "lucide-react";

const integrations = [
  { key: "browser", icon: Puzzle },
  { key: "mobile", icon: Smartphone },
  { key: "connectors", icon: Blocks },
  { key: "api", icon: Braces },
] as const;

export default function AppsSettingsPage() {
  const { t } = useTranslation();

  return (
    <SettingsPage
      title={t("seedbed.apps_title")}
      description={t("seedbed.apps_description")}
    >
      <SettingsSection>
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-secondary/70 p-4">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <SendToBack className="size-5" />
          </div>
          <div>
            <p className="font-semibold">{t("seedbed.apps_hub_title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("seedbed.apps_hub_description")}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {integrations.map(({ key, icon: Icon }) => (
            <div key={key} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="size-5" />
                </div>
                <Badge variant="secondary">{t("seedbed.planned")}</Badge>
              </div>
              <h2 className="mt-4 font-semibold">
                {t(`seedbed.apps_${key}_title`)}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t(`seedbed.apps_${key}_description`)}
              </p>
            </div>
          ))}
        </div>
      </SettingsSection>
    </SettingsPage>
  );
}
