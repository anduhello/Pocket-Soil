"use client";

import { useState } from "react";
import Link from "next/link";
import GlobalActions from "@/components/dashboard/GlobalActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/client";
import { Plus, Upload } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import EditorCard from "./EditorCard";

export default function LibraryHeader() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  useHotkeys("mod+e", () => setOpen(true), { preventDefault: true });
  return (
    <div className="mb-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("seedbed.library")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("seedbed.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            {t("seedbed.add")}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings/import">
              <Upload data-icon="inline-start" />
              {t("seedbed.batch")}
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex justify-end">
        <GlobalActions />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("seedbed.add")}</DialogTitle>
            <DialogDescription>{t("editor.placeholder_v2")}</DialogDescription>
          </DialogHeader>
          <EditorCard />
        </DialogContent>
      </Dialog>
    </div>
  );
}
