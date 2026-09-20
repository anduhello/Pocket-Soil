"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n/client";

import { useUpdateTag } from "@karakeep/shared-react/hooks/tags";

export default function EditableTagDescription({
  tag,
}: {
  tag: { id: string; description: string | null };
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(tag.description ?? "");
  const { mutate: updateTag, isPending } = useUpdateTag({
    onSuccess: () => {
      setEditing(false);
      toast({ description: t("tags.note_saved") });
    },
    onError: (error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const save = () => {
    updateTag({
      tagId: tag.id,
      description: value.trim() || null,
    });
  };

  if (editing) {
    return (
      <div className="mt-3 max-w-2xl space-y-2">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={500}
          autoFocus
          rows={3}
          placeholder={t("tags.note_placeholder")}
          className="resize-none bg-background/80 text-sm"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={isPending}>
            <Check className="mr-1.5 size-4" />
            {t("actions.save")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setValue(tag.description ?? "");
              setEditing(false);
            }}
            disabled={isPending}
          >
            <X className="mr-1.5 size-4" />
            {t("actions.cancel")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {value.length}/500
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group mt-2 flex max-w-2xl items-start gap-2 rounded-lg px-1 py-1 text-left text-sm text-muted-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={t("tags.edit_note")}
    >
      <span className={tag.description ? "line-clamp-2" : "italic"}>
        {tag.description || t("tags.add_note")}
      </span>
      <Pencil className="mt-0.5 size-3.5 shrink-0 opacity-0 transition group-hover:opacity-70" />
    </button>
  );
}
