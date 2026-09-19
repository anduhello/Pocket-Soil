"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useCreateBookmarkList } from "@karakeep/shared-react/hooks/lists";
import { useTRPC } from "@karakeep/shared-react/trpc";
import {
  importBookmarksFromFile,
  ImportSource,
  parseImportFile,
} from "@karakeep/shared/import-export";
import type { ParsedImportFile } from "@karakeep/shared/import-export";

import { useCreateImportSession } from "./useImportSessions";
import {
  previewImport,
  selectImportPreview,
} from "@karakeep/shared/import-export/preview";
import type { ImportPreview } from "@karakeep/shared/import-export/preview";

export interface ImportProgress {
  done: number;
  total: number;
}

export function useBookmarkImport() {
  const { t } = useTranslation();
  const api = useTRPC();

  const [importProgress, setImportProgress] = useState<
    Record<string, ImportProgress>
  >({});
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const decision = useRef<
    ((confirmed: ParsedImportFile | null) => void) | null
  >(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const selection = useRef<Set<number>>(new Set());
  const [previewPage, setPreviewPage] = useState(0);
  const updateSelection = (next: Set<number>) => {
    selection.current = next;
    setSelected(next);
  };
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      decision.current?.(null);
      decision.current = null;
    };
  }, []);
  const resolvePreview = (confirmed: boolean) => {
    if (confirmed && (!preview || selection.current.size === 0)) return;
    const chosen =
      confirmed && preview
        ? selectImportPreview(preview, selection.current)
        : null;
    const resolve = decision.current;
    decision.current = null;
    setPreview(null);
    setPreviewNotice(null);
    updateSelection(new Set());
    resolve?.(chosen);
  };

  const queryClient = useQueryClient();
  const { mutateAsync: createImportSession } = useCreateImportSession();
  const { mutateAsync: createList } = useCreateBookmarkList();
  const { mutateAsync: stageImportedBookmarks } = useMutation(
    api.importSessions.stageImportedBookmarks.mutationOptions(),
  );
  const { mutateAsync: finalizeImportStaging } = useMutation(
    api.importSessions.finalizeImportStaging.mutationOptions(),
  );
  const currentImportIds = useRef(new Map<File, string>());

  const uploadBookmarkFileMutation = useMutation({
    mutationFn: async ({
      file,
      source,
      prepared,
      listName,
      notice,
    }: {
      file: File;
      source: ImportSource;
      prepared?: ParsedImportFile;
      listName?: string;
      notice?: string;
    }) => {
      // Clear any previous quota error
      setQuotaError(null);

      // First, parse the file to count bookmarks
      const textContent = await file.text();
      let parsedImport =
        prepared ??
        parseImportFile(source, textContent, {
          preserveDuplicates: true,
        });
      let preparedPreview: ImportPreview | null = null;
      if (source === "html" || source === "links") {
        const candidates = previewImport(parsedImport);
        const urls = candidates.parsed.bookmarks.flatMap((b) =>
          b.content?.type === "link" ? [b.content.url] : [],
        );
        const existingUrls: string[] = [];
        for (let offset = 0; offset < urls.length; offset += 100) {
          const result = await queryClient.fetchQuery({
            ...api.bookmarks.previewExistingLinks.queryOptions({
              urls: urls.slice(offset, offset + 100),
            }),
            staleTime: 0,
          });
          existingUrls.push(...result.urls);
        }
        preparedPreview = previewImport(parsedImport, existingUrls);
        parsedImport = preparedPreview.parsed;
      }
      const checkQuota = async (bookmarkCount: number) => {
        if (bookmarkCount === 0) return;
        const quotaUsage = await queryClient.fetchQuery(
          api.subscriptions.getQuotaUsage.queryOptions(),
        );

        if (
          !quotaUsage.bookmarks.unlimited &&
          quotaUsage.bookmarks.quota !== null
        ) {
          const remaining =
            quotaUsage.bookmarks.quota - quotaUsage.bookmarks.used;

          if (remaining < bookmarkCount) {
            const errorMsg = `Cannot import ${bookmarkCount} bookmarks. You have ${remaining} bookmark${remaining === 1 ? "" : "s"} remaining in your quota of ${quotaUsage.bookmarks.quota}.`;
            setQuotaError(errorMsg);
            throw new Error(errorMsg);
          }
        }
      };
      // Preview imports are checked after the user chooses the actual subset.
      if (!preparedPreview) await checkQuota(parsedImport.bookmarks.length);

      // Proceed with import if quota check passes
      const result = await importBookmarksFromFile(
        {
          file,
          source,
          rootListName: listName ?? t("settings.import.imported_bookmarks"),
          deps: {
            createImportSession,
            createList,
            stageImportedBookmarks,
            finalizeImportStaging: async (sessionId: string) => {
              await finalizeImportStaging({ importSessionId: sessionId });
            },
          },
          onProgress: (id, done, total) => {
            currentImportIds.current.set(file, id);
            setImportProgress((prev) => ({ ...prev, [id]: { done, total } }));
          },
        },
        {
          confirmImport: preparedPreview
            ? async () => {
                if (!mounted.current) return false;
                const chosen = await new Promise<ParsedImportFile | null>(
                  (resolve) => {
                    decision.current = resolve;
                    updateSelection(
                      new Set(
                        preparedPreview.parsed.bookmarks.map(
                          (_bookmark, index) => index,
                        ),
                      ),
                    );
                    setPreviewPage(0);
                    setPreview(preparedPreview);
                    setPreviewNotice(notice ?? null);
                  },
                );
                if (!chosen) return false;
                await checkQuota(chosen.bookmarks.length);
                return chosen;
              }
            : undefined,
          // Use a custom parser to avoid re-parsing the file
          parsers: {
            [source]: () => parsedImport,
          },
        },
      );
      return result;
    },
    onSuccess: async (result, variables) => {
      if (result.cancelled) return;
      await queryClient.invalidateQueries(
        api.importSessions.listImportSessions.pathFilter(),
      );
      setImportProgress((prev) => {
        const next = { ...prev };
        if (result.importSessionId) {
          delete next[result.importSessionId];
        }
        return next;
      });
      currentImportIds.current.delete(variables.file);

      if (result.counts.total === 0) {
        toast({ description: "No bookmarks found in the file." });
        return;
      }

      toast({
        description: `Staged ${result.counts.total} bookmarks for import. Background processing will start automatically.`,
        variant: "default",
      });
    },
    onError: (error, variables) => {
      const id = currentImportIds.current.get(variables.file);
      setImportProgress((prev) => {
        const next = { ...prev };
        if (id) {
          delete next[id];
        }
        return next;
      });
      currentImportIds.current.delete(variables.file);

      toast({
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    preview,
    previewNotice,
    selected,
    previewPage,
    setPreviewPage,
    selectAll: () =>
      updateSelection(
        new Set(
          preview?.parsed.bookmarks.map((_bookmark, index) => index) ?? [],
        ),
      ),
    selectNone: () => updateSelection(new Set()),
    invertSelection: () => {
      const next = new Set<number>();
      for (
        let index = 0;
        index < (preview?.parsed.bookmarks.length ?? 0);
        index++
      ) {
        if (!selection.current.has(index)) next.add(index);
      }
      updateSelection(next);
    },
    toggleSelection: (index: number, checked: boolean) => {
      if (!preview?.parsed.bookmarks[index]) return;
      const next = new Set(selection.current);
      if (checked) next.add(index);
      else next.delete(index);
      updateSelection(next);
    },
    resolvePreview,
    importProgress,
    quotaError,
    clearQuotaError: () => setQuotaError(null),
    runUploadBookmarkFile: async (input: {
      file: File;
      source: ImportSource;
      prepared?: ParsedImportFile;
      listName?: string;
      notice?: string;
    }) => {
      if (active.current) return;
      active.current = true;
      try {
        return await uploadBookmarkFileMutation.mutateAsync(input);
      } finally {
        active.current = false;
      }
    },
    isImporting: uploadBookmarkFileMutation.isPending,
  };
}
