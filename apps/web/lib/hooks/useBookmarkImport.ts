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

import { useCreateImportSession } from "./useImportSessions";
import { previewImport } from "@karakeep/shared/import-export/preview";
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
  const decision = useRef<((confirmed: boolean) => void) | null>(null);
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      decision.current?.(false);
      decision.current = null;
    };
  }, []);
  const resolvePreview = (confirmed: boolean) => {
    const resolve = decision.current;
    decision.current = null;
    setPreview(null);
    resolve?.(confirmed);
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
    }: {
      file: File;
      source: ImportSource;
    }) => {
      // Clear any previous quota error
      setQuotaError(null);

      // First, parse the file to count bookmarks
      const textContent = await file.text();
      let parsedImport = parseImportFile(source, textContent);
      let preparedPreview: ImportPreview | null = null;
      if (source === "html") {
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
      const bookmarkCount = parsedImport.bookmarks.length;

      // Check quota before proceeding
      if (bookmarkCount > 0) {
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
      }

      // Proceed with import if quota check passes
      const result = await importBookmarksFromFile(
        {
          file,
          source,
          rootListName: t("settings.import.imported_bookmarks"),
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
                return await new Promise<boolean>((resolve) => {
                  decision.current = resolve;
                  setPreview(preparedPreview);
                });
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
    resolvePreview,
    importProgress,
    quotaError,
    clearQuotaError: () => setQuotaError(null),
    runUploadBookmarkFile: async (input: {
      file: File;
      source: ImportSource;
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
