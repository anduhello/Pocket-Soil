"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/client";
import { useInterfaceLang } from "@/lib/userLocalSettings/bookmarksLayout";
import { updateInterfaceLang } from "@/lib/userLocalSettings/userLocalSettings";
import { Globe2 } from "lucide-react";
import { toast } from "sonner";

import { langNameMappings } from "@karakeep/shared/langs";

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const lang = useInterfaceLang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div
      className="w-[8.5rem] shrink-0 sm:w-[11rem]"
      aria-label={t("seedbed.language")}
      aria-busy={pending}
    >
      <Select
        value={lang}
        disabled={pending}
        onValueChange={(value) =>
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
        <SelectTrigger className="h-10 gap-2 rounded-full border border-primary/15 bg-secondary px-3 font-medium shadow-sm transition-transform hover:-rotate-[0.5deg] hover:bg-secondary/80">
          <Globe2 className="size-4 shrink-0 text-primary" />
          <SelectValue>{langNameMappings[lang] ?? lang}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {Object.entries(langNameMappings).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
