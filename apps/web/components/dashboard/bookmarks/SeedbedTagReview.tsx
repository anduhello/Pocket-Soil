"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { useTranslation } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ActionConfirmingDialog from "@/components/ui/action-confirming-dialog";
import { useTRPC } from "@karakeep/shared-react/trpc";
import {
  useDeleteBookmark,
  useUpdateBookmarkTags,
} from "@karakeep/shared-react/hooks/bookmarks";
import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { ExternalLink, Sparkles } from "lucide-react";

const eligible = (b: ZBookmark) => {
  if (b.content.type !== "link") return false;
  try {
    const hostname = new URL(b.content.url).hostname.toLowerCase();
    return (
      hostname === "bilibili.com" ||
      hostname.endsWith(".bilibili.com") ||
      hostname === "b23.tv" ||
      hostname === "github.com" ||
      hostname.endsWith(".github.com")
    );
  } catch {
    return false;
  }
};

export default function SeedbedTagReview({
  bookmarks,
}: {
  bookmarks: ZBookmark[];
}) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const api = useTRPC();
  const ai = useMutation(
    api.importSessions.suggestBilibiliTags.mutationOptions({ retry: false }),
  );
  const update = useUpdateBookmarkTags();
  const remove = useDeleteBookmark();
  const [queue, setQueue] = useState<ZBookmark[]>([]);
  const [position, setPosition] = useState(0);
  const [open, setOpen] = useState(false);
  const library = useQuery(
    api.tags.list.queryOptions(
      { limit: 200, sortBy: "usage" },
      { enabled: open },
    ),
  );
  const [draft, setDraft] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const generation = useRef(0);
  const operation = useRef(false);
  const current = queue[position];
  const busy = ai.isPending || update.isPending || remove.isPending;
  const candidates = bookmarks.filter(
    (b) => eligible(b) && b.userId === session?.user?.id,
  );
  const start = (untagged: boolean) => {
    const next = candidates.filter((b) => !untagged || b.tags.length === 0);
    if (!next.length) return;
    generation.current++;
    setQueue(next);
    setPosition(0);
    setDraft(next[0].tags.map((tag) => tag.name));
    setText("");
    setError("");
    setOpen(true);
  };
  const advance = () => {
    generation.current++;
    const next = position + 1;
    if (next >= queue.length) {
      setOpen(false);
      return;
    }
    setPosition(next);
    setDraft(queue[next].tags.map((tag) => tag.name));
    setText("");
    setError("");
  };
  const normalized = (value: string) =>
    value.toLowerCase().replace(/[ _-]/g, "");
  const add = () => {
    const values = text
      .split(/[,，;；\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.some((v) => v.length > 24)) {
      setError(t("seedbed.review_tag_length"));
      return;
    }
    setDraft((previous) => {
      const next = [...previous];
      for (const v of values) {
        const canonical =
          library.data?.tags.find(
            (tag) => normalized(tag.name) === normalized(v),
          )?.name ?? v;
        if (!next.some((n) => normalized(n) === normalized(canonical)))
          next.push(canonical);
      }
      return next;
    });
    setText("");
    setError("");
  };
  const suggest = async () => {
    if (!current || current.content.type !== "link" || operation.current)
      return;
    operation.current = true;
    const token = generation.current;
    setError("");
    try {
      const result = await ai.mutateAsync({
        billingMode: "rematch",
        billingRequestId: crypto.randomUUID(),
        videos: [
          {
            url: current.content.url,
            title: (current.title || current.content.url).slice(0, 500),
            intro: (current.note || "").slice(0, 1200),
          },
        ],
      });
      if (generation.current !== token) return;
      setDraft((previous) => {
        const next = [...previous];
        for (const tag of result[0]?.tags ?? [])
          if (!next.some((n) => normalized(n) === normalized(tag)))
            next.push(tag);
        return next;
      });
    } catch (e) {
      if (generation.current === token)
        setError(e instanceof Error ? e.message : t("seedbed.ai_failure"));
    } finally {
      operation.current = false;
    }
  };
  const save = async () => {
    if (!current || operation.current) return;
    if (text.trim()) {
      setError(t("seedbed.review_add_first"));
      return;
    }
    setError("");
    operation.current = true;
    try {
      await update.mutateAsync({
        bookmarkId: current.id,
        attach: draft
          .filter((name) => !current.tags.some((tag) => tag.name === name))
          .map((tagName) => ({ tagName })),
        detach: current.tags
          .filter((tag) => !draft.includes(tag.name))
          .map((tag) => ({ tagId: tag.id })),
      });
      advance();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("common.something_went_wrong"),
      );
    } finally {
      operation.current = false;
    }
  };
  return (
    <>
      {bookmarks.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-primary">
              {t("seedbed.review_banner_title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("seedbed.review_banner_help", { count: candidates.length })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => start(true)}
              disabled={!candidates.some((b) => b.tags.length === 0)}
            >
              {t("seedbed.review_untagged")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => start(false)}
              disabled={!candidates.length}
            >
              {t("seedbed.review_all")}
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (update.isPending || remove.isPending) return;
          generation.current++;
          setOpen(value);
        }}
      >
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("seedbed.review_title", {
                current: position + 1,
                total: queue.length,
              })}
            </DialogTitle>
            <DialogDescription>{t("seedbed.review_help")}</DialogDescription>
          </DialogHeader>
          {current && (
            <>
              <section className="rounded-2xl border bg-muted/35 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                      {t("seedbed.review_current_item")}
                    </p>
                    <h3 className="break-words text-xl font-semibold leading-snug text-foreground">
                      {current.title ||
                        (current.content.type === "link"
                          ? current.content.url
                          : "")}
                    </h3>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-background p-4 shadow-sm ring-1 ring-border/70">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    {t("seedbed.review_intro_title")}
                  </p>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-line text-[15px] leading-7 text-foreground/80">
                    {current.note || t("seedbed.review_no_intro")}
                  </p>
                </div>
                {current.content.type === "link" ? (
                  <Button className="mt-2 px-0" variant="link" asChild>
                    <a
                      href={current.content.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-1 size-4" />
                      {t("seedbed.open_original")}
                    </a>
                  </Button>
                ) : null}
              </section>
              <Button
                className="h-11 w-full"
                variant="outline"
                disabled={busy}
                onClick={suggest}
              >
                <Sparkles className="mr-2 size-4" aria-hidden="true" />
                {ai.isPending
                  ? t("seedbed.processing")
                  : t("seedbed.review_ai")}
              </Button>
              <div className="flex flex-wrap gap-2">
                {draft.map((tag) => (
                  <Button
                    key={tag}
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    aria-label={t("seedbed.review_remove_tag", { tag })}
                    onClick={() =>
                      setDraft(draft.filter((name) => name !== tag))
                    }
                  >
                    {tag} ×
                  </Button>
                ))}
              </div>
              {!!library.data?.tags.length && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    {t("seedbed.review_library")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {library.data.tags.slice(0, 12).map((tag) => (
                      <Button
                        key={tag.id}
                        variant="outline"
                        size="sm"
                        disabled={
                          busy ||
                          draft.some(
                            (name) => normalized(name) === normalized(tag.name),
                          )
                        }
                        onClick={() =>
                          setDraft((previous) => [...previous, tag.name])
                        }
                      >
                        {tag.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="review-tag-input">
                    {t("seedbed.review_manual")}
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="review-tag-input"
                      value={text}
                      disabled={busy}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          add();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      disabled={busy || !text.trim()}
                      onClick={add}
                    >
                      {t("seedbed.review_add")}
                    </Button>
                  </div>
                  <FieldDescription>
                    {t("seedbed.review_manual_help")}
                  </FieldDescription>
                </Field>
              </FieldGroup>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter className="flex-wrap gap-2">
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t("seedbed.review_delete")}
                </Button>
                <Button variant="outline" disabled={busy} onClick={advance}>
                  {t("seedbed.review_skip")}
                </Button>
                <Button disabled={busy} onClick={save}>
                  {t("seedbed.review_save")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <ActionConfirmingDialog
        open={confirmDelete}
        setOpen={setConfirmDelete}
        title={t("seedbed.review_delete")}
        description={
          <DialogDescription>
            {t("seedbed.review_delete_help")}
          </DialogDescription>
        }
        actionButton={() => (
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              if (!current || operation.current) return;
              operation.current = true;
              try {
                await remove.mutateAsync({ bookmarkId: current.id });
                setConfirmDelete(false);
                advance();
              } catch (e) {
                setConfirmDelete(false);
                setError(
                  e instanceof Error
                    ? e.message
                    : t("common.something_went_wrong"),
                );
              } finally {
                operation.current = false;
              }
            }}
          >
            {t("seedbed.review_delete_confirm")}
          </Button>
        )}
      />
    </>
  );
}
