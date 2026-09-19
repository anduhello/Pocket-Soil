"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/client";
import { useInterfaceLang } from "@/lib/userLocalSettings/bookmarksLayout";
import { updateInterfaceLang } from "@/lib/userLocalSettings/userLocalSettings";
import { toast } from "sonner";

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const lang = useInterfaceLang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div
      className="flex shrink-0 items-center gap-1"
      role="group"
      aria-label={t("seedbed.language")}
      aria-busy={pending}
    >
      {(
        [
          ["zh", "中文"],
          ["en", "English"],
        ] as const
      ).map(([value, label]) => (
        <Button
          key={value}
          variant={lang === value ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={lang === value}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await updateInterfaceLang(value);
                router.refresh();
              } catch {
                toast.error(t("seedbed.language_error"));
              }
            })
          }
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
