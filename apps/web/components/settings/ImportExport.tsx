"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import FilePickerButton from "@/components/ui/file-picker-button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
import {
  Select,
  SelectGroup,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useBookmarkImport } from "@/lib/hooks/useBookmarkImport";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@karakeep/shared-react/trpc";
import {
  AlertCircle,
  Download,
  Loader2,
  Upload,
  Clapperboard,
  BookOpen,
  Music2,
  Github,
  Check,
  Square,
  ChevronDown,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../ui/card";
import { ImportSessionsSection } from "./ImportSessionsSection";
import { SettingsPage, SettingsSection } from "./SettingsPage";

function ImportCard({
  text,
  description,
  children,
}: {
  text: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-full bg-primary/10 p-2">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">{text}</h3>
          <p>{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ExportButton() {
  const { t } = useTranslation();
  const [format, setFormat] = useState<"json" | "netscape">("json");
  const queryClient = useQueryClient();
  const { isFetching, refetch, error } = useQuery({
    queryKey: ["exportBookmarks"],
    queryFn: async () => {
      const res = await fetch(`/api/bookmarks/export?format=${format}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || "Failed to export bookmarks");
      }
      const match = res.headers
        .get("Content-Disposition")
        ?.match(/filename\*?=(?:UTF-8''|")?([^"]+)/i);
      const filename = match
        ? match[1]
        : `karakeep-export-${new Date().toISOString()}.${format}`;
      return { blob: res.blob(), filename };
    },
    enabled: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error]);

  const onExport = useCallback(async () => {
    const { data } = await refetch();
    if (!data) return;
    const { blob, filename } = data;
    const url = window.URL.createObjectURL(await blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    queryClient.setQueryData(["exportBookmarks"], () => null);
  }, [refetch]);

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-full bg-primary/10 p-2">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">Export File</h3>
          <p>{t("settings.import.export_links_and_notes")}</p>
          <Select
            value={format}
            onValueChange={(value) => setFormat(value as "json" | "netscape")}
          >
            <SelectTrigger className="mt-2 w-[180px]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON (Karakeep format)</SelectItem>
              <SelectItem value="netscape">HTML (Netscape format)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "flex items-center gap-2",
          )}
          onClick={onExport}
          disabled={isFetching}
        >
          {isFetching && <Loader2 className="mr-2 animate-spin" />}
          <p>Export</p>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ImportExportRow() {
  const { t } = useTranslation();
  const [pastedLinks, setPastedLinks] = useState("");
  const [lastImportId, setLastImportId] = useState<string | null>(null);
  const [favoriteUrl, setFavoriteUrl] = useState("");
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const api = useTRPC();
  const queryClient = useQueryClient();
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [legacyImportOpen, setLegacyImportOpen] = useState(false);
  const tagSuggestions = useMutation(
    api.importSessions.suggestBilibiliTags.mutationOptions({ retry: false }),
  );
  const readFavorites = useMutation(
    api.importSessions.previewBilibiliFavorites.mutationOptions(),
  );
  const readStars = useMutation(
    api.importSessions.previewGitHubStars.mutationOptions({ retry: false }),
  );
  const wallet = useQuery(api.billing.summary.queryOptions());
  const {
    importProgress,
    quotaError,
    runUploadBookmarkFile,
    preview,
    previewNotice,
    resolvePreview,
    selected,
    previewPage,
    setPreviewPage,
    selectAll,
    selectNone,
    invertSelection,
    toggleSelection,
    isImporting,
  } = useBookmarkImport();

  const [platform, setPlatform] = useState("bilibili");
  const importFavoriteFolder = async (withAI: boolean) => {
    if (favoriteBusy || isImporting) return;
    setFavoriteBusy(true);
    setFavoriteError(null);
    try {
      const result =
        platform === "github"
          ? await readStars.mutateAsync({ url: favoriteUrl.trim() })
          : await readFavorites.mutateAsync({ url: favoriteUrl.trim() });
      let aiNotice = "";
      if (withAI) {
        try {
          const videos = result.parsed.bookmarks.flatMap((bookmark) =>
            bookmark.content?.type === "link" && bookmark.title
              ? [
                  {
                    url: bookmark.content.url,
                    title: bookmark.title.slice(0, 500),
                    intro: (
                      bookmark.notes?.split("\n\n").slice(1).join("\n\n") ?? ""
                    ).slice(0, 1200),
                  },
                ]
              : [],
          );
          const existing = new Set<string>();
          for (let offset = 0; offset < videos.length; offset += 100) {
            const found = await queryClient.fetchQuery({
              ...api.bookmarks.previewExistingLinks.queryOptions({
                urls: videos.slice(offset, offset + 100).map((v) => v.url),
              }),
              staleTime: 0,
            });
            found.urls.forEach((url) => existing.add(url));
          }
          const seen = new Set<string>();
          const candidates = videos.filter((v) => {
            if (existing.has(v.url) || seen.has(v.url)) return false;
            seen.add(v.url);
            return true;
          });
          if (candidates.length) {
            for (let offset = 0; offset < candidates.length; offset += 50) {
              const suggestions = await tagSuggestions.mutateAsync({
                billingMode: "initial_import",
                billingRequestId: crypto.randomUUID(),
                videos: candidates.slice(offset, offset + 50),
              });
              const tagsByUrl = new Map(
                suggestions.map((item) => [item.url, item.tags]),
              );
              result.parsed.bookmarks = result.parsed.bookmarks.map(
                (bookmark) => ({
                  ...bookmark,
                  tags:
                    bookmark.content?.type === "link"
                      ? (tagsByUrl.get(bookmark.content.url) ?? bookmark.tags)
                      : bookmark.tags,
                }),
              );
            }
            aiNotice = ` ${t("seedbed.ai_notice")}`;
            await queryClient.invalidateQueries(
              api.billing.summary.pathFilter(),
            );
          }
        } catch (error) {
          aiNotice = ` ${error instanceof Error ? error.message : t("seedbed.ai_failure")}`;
        }
      }
      const imported = await runUploadBookmarkFile({
        file: new File([""], `${platform}-favorites.txt`, {
          type: "text/plain",
        }),
        source: "links",
        prepared: result.parsed,
        listName:
          `${platform === "github" ? "GitHub" : "B站"} · ${result.title}`.slice(
            0,
            100,
          ),
        notice:
          t(
            platform === "github"
              ? "seedbed.github_notice"
              : "seedbed.bilibili_notice",
            {
              title: result.title,
              total: result.total,
              fetched: result.parsed.bookmarks.length,
              skipped: result.skipped,
            },
          ) +
          (result.truncated
            ? ` ${t(platform === "github" ? "seedbed.github_truncated" : "seedbed.bilibili_truncated")}`
            : "") +
          aiNotice,
      });
      if (imported?.importSessionId) {
        setLastImportId(imported.importSessionId);
        setFavoriteUrl("");
      }
    } catch (error) {
      setFavoriteError(
        error instanceof Error ? error.message : t("seedbed.bilibili_error"),
      );
    } finally {
      setFavoriteBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>{t("seedbed.platform_title")}</CardTitle>
          <CardDescription>{t("seedbed.platform_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="import-platform">
                {t("seedbed.platform_title")}
              </FieldLabel>
              <Select
                value={platform}
                onValueChange={(value) => {
                  setPlatform(value);
                  setFavoriteUrl("");
                  setFavoriteError(null);
                }}
                disabled={favoriteBusy || isImporting}
              >
                <SelectTrigger id="import-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="bilibili">
                      <span className="flex items-center gap-2">
                        <Clapperboard className="size-4" aria-hidden="true" />
                        Bilibili
                      </span>
                    </SelectItem>
                    <SelectItem value="github">
                      <span className="flex items-center gap-2">
                        <Github className="size-4" aria-hidden="true" />
                        GitHub Stars
                      </span>
                    </SelectItem>
                    <SelectItem value="xiaohongshu">
                      <span className="flex items-center gap-2">
                        <BookOpen className="size-4" aria-hidden="true" />
                        小红书
                      </span>
                    </SelectItem>
                    <SelectItem value="douyin">
                      <span className="flex items-center gap-2">
                        <Music2 className="size-4" aria-hidden="true" />
                        抖音
                      </span>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                {platform === "bilibili"
                  ? t("seedbed.platform_bilibili")
                  : platform === "github"
                    ? t("seedbed.github_description")
                    : t("seedbed.construction_description")}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      {(platform === "xiaohongshu" || platform === "douyin") && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("seedbed.construction_title")}</CardTitle>
            <CardDescription>
              {t("seedbed.construction_description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Image
              src="/seedbed-construction.png"
              alt={t("seedbed.construction_alt")}
              width={240}
              height={240}
              className="size-60 object-contain"
            />
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setPlatform("bilibili");
                setFavoriteUrl("");
                setFavoriteError(null);
              }}
            >
              {t("seedbed.try_bilibili")}
            </Button>
          </CardFooter>
        </Card>
      )}
      {(platform === "bilibili" || platform === "github") && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t(
                platform === "github"
                  ? "seedbed.github_title"
                  : "seedbed.bilibili_title",
              )}
            </CardTitle>
            <CardDescription>
              {t(
                platform === "github"
                  ? "seedbed.github_description"
                  : "seedbed.bilibili_description",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field
                data-disabled={isImporting || readFavorites.isPending}
                data-invalid={!!favoriteError}
              >
                <FieldLabel htmlFor="bilibili-favorites">
                  {t(
                    platform === "github"
                      ? "seedbed.github_url"
                      : "seedbed.bilibili_url",
                  )}
                </FieldLabel>
                <Input
                  id="bilibili-favorites"
                  value={favoriteUrl}
                  type="url"
                  placeholder={
                    platform === "github"
                      ? "https://github.com/anduhello?tab=stars"
                      : "https://space.bilibili.com/用户ID/favlist?fid=收藏夹ID"
                  }
                  disabled={isImporting || readFavorites.isPending}
                  aria-invalid={!!favoriteError}
                  aria-describedby="bilibili-favorites-help"
                  onChange={(event) => {
                    setFavoriteUrl(event.target.value);
                    setFavoriteError(null);
                  }}
                />
                <FieldDescription id="bilibili-favorites-help">
                  {t(
                    platform === "github"
                      ? "seedbed.github_help"
                      : "seedbed.bilibili_help",
                  )}
                </FieldDescription>
                {favoriteError && <p role="alert">{favoriteError}</p>}
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center gap-2">
            <Button
              disabled={isImporting || favoriteBusy || !favoriteUrl.trim()}
              onClick={() => importFavoriteFolder(true)}
            >
              {favoriteBusy || isImporting ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  {t("seedbed.processing")}
                </>
              ) : (
                t("seedbed.ai_preview")
              )}
            </Button>
            <Button
              variant="outline"
              disabled={isImporting || favoriteBusy || !favoriteUrl.trim()}
              onClick={() => importFavoriteFolder(false)}
            >
              {t("seedbed.preview_without_ai")}
            </Button>
            <p className="w-full text-xs text-muted-foreground">
              {t("seedbed.billing_status", {
                balance: wallet.data?.balance ?? "—",
                free: wallet.data?.freeRemaining ?? "—",
              })}
            </p>
          </CardFooter>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("seedbed.batch_title")}</CardTitle>
          <CardDescription>{t("seedbed.batch_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-disabled={isImporting}>
              <FieldLabel htmlFor="batch-links">
                {t("seedbed.links")}
              </FieldLabel>
              <Textarea
                id="batch-links"
                rows={6}
                value={pastedLinks}
                disabled={isImporting}
                aria-describedby="batch-links-help"
                placeholder={
                  "https://example.com/article\nhttps://www.bilibili.com/video/BV..."
                }
                onChange={(event) => setPastedLinks(event.target.value)}
              />
              <FieldDescription id="batch-links-help">
                {t("seedbed.links_help")}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            disabled={isImporting || !pastedLinks.trim()}
            onClick={async () => {
              try {
                const result = await runUploadBookmarkFile({
                  file: new File([pastedLinks], "pasted-links.txt", {
                    type: "text/plain",
                  }),
                  source: "links",
                });
                if (result?.importSessionId) {
                  setPastedLinks("");
                  setLastImportId(result.importSessionId);
                }
              } catch {
                /* The import hook presents errors and preserves input. */
              }
            }}
          >
            {isImporting ? t("seedbed.processing") : t("seedbed.preview_links")}
          </Button>
          <Button
            variant="outline"
            disabled={isImporting || !pastedLinks}
            onClick={() => setPastedLinks("")}
          >
            {t("seedbed.clear")}
          </Button>
        </CardFooter>
        {lastImportId && (
          <CardContent
            role="status"
            className="flex flex-wrap items-center gap-3"
          >
            <p>{t("seedbed.batch_queued")}</p>
            <Button variant="outline" asChild>
              <Link href={`/settings/import/${lastImportId}`}>
                {t("seedbed.batch_results")}
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) resolvePreview(false);
        }}
      >
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-[760px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("seedbed.preview_title")}</DialogTitle>
            <DialogDescription>
              {t("seedbed.preview_description")}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <>
              {previewNotice && (
                <p role="status" className="text-sm">
                  {previewNotice}
                </p>
              )}
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-primary/30 bg-background p-3 shadow-sm">
                <div>
                  <p role="status" className="font-medium">
                    {t("seedbed.counts", { ...preview.counts })}
                  </p>
                  <p role="status" className="text-sm font-medium text-primary">
                    {t("seedbed.selected_count", {
                      count: selected.size,
                      total: preview.counts.new,
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={selectAll}>
                    {t("seedbed.select_all")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectNone}>
                    {t("seedbed.select_none")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={invertSelection}
                  >
                    {t("seedbed.invert_selection")}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("seedbed.selection_help")}
              </p>
              <div className="max-h-80 overflow-y-auto rounded-lg border">
                <Table aria-label={t("seedbed.preview_title")}>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>{t("seedbed.selection")}</TableHead>
                      <TableHead>{t("common.url")}</TableHead>
                      <TableHead>{t("seedbed.result")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.entries
                      .slice(previewPage * 100, (previewPage + 1) * 100)
                      .map((entry, index) => (
                        <TableRow
                          key={previewPage * 100 + index}
                          className={
                            entry.bookmarkIndex !== null
                              ? "cursor-pointer"
                              : undefined
                          }
                          data-state={
                            entry.bookmarkIndex !== null &&
                            selected.has(entry.bookmarkIndex)
                              ? "selected"
                              : undefined
                          }
                          onClick={() => {
                            if (entry.bookmarkIndex !== null) {
                              toggleSelection(
                                entry.bookmarkIndex,
                                !selected.has(entry.bookmarkIndex),
                              );
                            }
                          }}
                        >
                          <TableCell className="w-20">
                            <button
                              type="button"
                              role="checkbox"
                              className="inline-flex size-9 items-center justify-center rounded-md border-2 border-primary/40 bg-background text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30"
                              disabled={entry.bookmarkIndex === null}
                              aria-checked={
                                entry.bookmarkIndex !== null &&
                                selected.has(entry.bookmarkIndex)
                              }
                              aria-label={t("seedbed.select_item", {
                                title:
                                  entry.title ||
                                  entry.url ||
                                  t("seedbed.missing_link"),
                              })}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (entry.bookmarkIndex !== null) {
                                  toggleSelection(
                                    entry.bookmarkIndex,
                                    !selected.has(entry.bookmarkIndex),
                                  );
                                }
                              }}
                            >
                              {entry.bookmarkIndex !== null &&
                              selected.has(entry.bookmarkIndex) ? (
                                <Check aria-hidden="true" />
                              ) : (
                                <Square aria-hidden="true" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="max-w-[420px] break-all py-4">
                            {entry.title ? (
                              <p className="mb-1 font-medium">{entry.title}</p>
                            ) : null}
                            <p className="font-mono text-sm">
                              {entry.url || t("seedbed.missing_link")}
                            </p>
                            {entry.notes && (
                              <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                                {entry.notes}
                              </p>
                            )}
                            {entry.tags.length > 0 && (
                              <p className="mt-2 text-sm">
                                {t("seedbed.ai_tags")}：{entry.tags.join(" · ")}
                              </p>
                            )}
                            {entry.paths.some((path) => path.length > 0) ? (
                              <p className="mt-1 text-muted-foreground">
                                {t("seedbed.folder")}：
                                {entry.paths
                                  .map((path) => path.join(" / "))
                                  .filter(Boolean)
                                  .join("；") || t("seedbed.unfiled")}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {t(
                              (
                                {
                                  new: "seedbed.new",
                                  existing: "seedbed.existing",
                                  duplicate: "seedbed.duplicate",
                                  invalid: "seedbed.invalid",
                                } as const
                              )[entry.status],
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("seedbed.read_note")}
              </p>
              {preview.entries.length > 100 ? (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={previewPage === 0}
                    onClick={() => setPreviewPage(previewPage - 1)}
                  >
                    {t("seedbed.previous_page")}
                  </Button>
                  <p className="text-sm">
                    {t("seedbed.preview_page", {
                      page: previewPage + 1,
                      total: Math.ceil(preview.entries.length / 100),
                    })}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(previewPage + 1) * 100 >= preview.entries.length}
                    onClick={() => setPreviewPage(previewPage + 1)}
                  >
                    {t("seedbed.next_page")}
                  </Button>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {t("seedbed.cancel_note")}
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => resolvePreview(false)}>
                  {t("seedbed.back")}
                </Button>
                <Button
                  disabled={selected.size === 0}
                  onClick={() => resolvePreview(true)}
                >
                  {t("seedbed.confirm", { count: selected.size })}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      {quotaError && (
        <Alert variant="destructive" className="relative">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Import Quota Exceeded</AlertTitle>
          <AlertDescription>{quotaError}</AlertDescription>
        </Alert>
      )}
      <Collapsible
        open={legacyImportOpen}
        onOpenChange={setLegacyImportOpen}
        className="rounded-xl border bg-muted/20"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left transition-colors hover:bg-muted/50"
          >
            <span>
              <span className="block font-semibold">
                {t("seedbed.other_import_tools")}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {t("seedbed.other_import_tools_help")}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-5 shrink-0 transition-transform",
                legacyImportOpen ? "rotate-180" : "rotate-0",
              )}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-4 border-t p-4 md:grid-cols-2">
            <ImportCard
              text="HTML File"
              description={t("settings.import.import_bookmarks_from_html_file")}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".html"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "html" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ImportCard
              text="Pocket"
              description={t(
                "settings.import.import_bookmarks_from_pocket_export",
              )}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".csv"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "pocket" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ImportCard
              text="Matter"
              description={t(
                "settings.import.import_bookmarks_from_matter_export",
              )}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".csv"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "matter" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ImportCard
              text="Omnivore"
              description={t(
                "settings.import.import_bookmarks_from_omnivore_export",
              )}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".json"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "omnivore" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ImportCard
              text="Linkwarden"
              description={t(
                "settings.import.import_bookmarks_from_linkwarden_export",
              )}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".json"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "linkwarden" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ImportCard
              text="Tab Session Manager"
              description={t(
                "settings.import.import_bookmarks_from_tab_session_manager_export",
              )}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".json"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "tab-session-manager" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ImportCard
              text="mymind"
              description={t(
                "settings.import.import_bookmarks_from_mymind_export",
              )}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".csv"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "mymind" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ImportCard
              text="Instapaper"
              description={t(
                "settings.import.import_bookmarks_from_instapaper_export",
              )}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".csv"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "instapaper" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ImportCard
              text="Karakeep"
              description={t(
                "settings.import.import_bookmarks_from_karakeep_export",
              )}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".json"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "karakeep" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ImportCard
              text="Readwise Reader"
              description={t(
                "settings.import.import_bookmarks_from_readwise_reader_export",
              )}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".csv"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "readwise-reader" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ImportCard
              text="OneTab"
              description={t(
                "settings.import.import_bookmarks_from_onetab_export",
              )}
            >
              <FilePickerButton
                size={"sm"}
                loading={false}
                accept=".txt"
                multiple={false}
                className="flex items-center gap-2"
                onFileSelect={(file) =>
                  runUploadBookmarkFile({ file, source: "onetab" })
                }
              >
                <p>Import</p>
              </FilePickerButton>
            </ImportCard>
            <ExportButton />
          </div>
        </CollapsibleContent>
      </Collapsible>
      {Object.entries(importProgress).map(([id, progress]) => {
        return (
          <div key={id} className="flex flex-col gap-2">
            <p className="shrink-0 text-sm">
              Processed {progress.done} of {progress.total} bookmarks
            </p>
            <div className="w-full">
              <Progress value={(progress.done * 100) / progress.total} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ImportExport() {
  const { t } = useTranslation();
  return (
    <SettingsPage title={t("settings.import.import_export")}>
      <SettingsSection title={t("settings.import.import_export_bookmarks")}>
        <ImportExportRow />
      </SettingsSection>

      <ImportSessionsSection />
    </SettingsPage>
  );
}
