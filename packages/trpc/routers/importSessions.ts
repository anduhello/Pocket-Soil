import { experimental_trpcMiddleware } from "@trpc/server";
import { z } from "zod";

import {
  DEFAULT_NUM_IMPORT_SESSION_RESULTS_PER_PAGE,
  MAX_NUM_IMPORT_SESSION_RESULTS_PER_PAGE,
  zCreateImportSessionRequestSchema,
  zDeleteImportSessionRequestSchema,
  zGetImportSessionStatsRequestSchema,
  zImportSessionWithStatsSchema,
  zListImportSessionsRequestSchema,
  zListImportSessionsResponseSchema,
} from "@karakeep/shared/types/importSessions";

import type { AuthedContext } from "../index";
import {
  createScopedAuthedProcedure,
  createRateLimitMiddleware,
  router,
} from "../index";
import { readBilibiliFavorites } from "../lib/bilibiliFavorites";
import { readGitHubStars } from "../lib/githubStars";
import {
  suggestSeedbedTags,
  zSeedbedTaggingRequest,
} from "../lib/seedbedTagging";
import { actorFromContext } from "../lib/actor";
import { ImportSessionsService } from "../models/importSessions.service";
import { CoinBillingService } from "../models/coinBilling";
import { Tag } from "../models/tags";

const importSessionsProcedure = createScopedAuthedProcedure(
  "importSessions",
).use((opts) => {
  return opts.next({
    ctx: {
      ...opts.ctx,
      actor: actorFromContext(opts.ctx),
      importSessionsService: new ImportSessionsService(opts.ctx.db),
    },
  });
});

type ImportSessionsContext = AuthedContext & {
  actor: ReturnType<typeof actorFromContext>;
  importSessionsService: ImportSessionsService;
};

const ensureImportSessionAccess = experimental_trpcMiddleware<{
  ctx: ImportSessionsContext;
  input: { importSessionId: string };
}>().create(async (opts) => {
  const importSession = await opts.ctx.importSessionsService.get(
    opts.ctx.actor,
    opts.input.importSessionId,
  );

  return opts.next({
    ctx: {
      ...opts.ctx,
      importSession,
    },
  });
});

export const importSessionsRouter = router({
  previewGitHubStars: importSessionsProcedure
    .use(
      createRateLimitMiddleware({
        name: "importSessions.previewGitHubStars",
        windowMs: 60000,
        maxRequests: 3,
      }),
    )
    .input(z.object({ url: z.string().trim().max(2048) }))
    .mutation(async ({ input }) => readGitHubStars(input.url)),
  suggestBilibiliTags: importSessionsProcedure
    .use(
      createRateLimitMiddleware({
        name: "seedbed.tagSuggestions.daily",
        windowMs: 86400000,
        maxRequests: 100,
      }),
    )
    .input(zSeedbedTaggingRequest)
    .mutation(async ({ input, ctx }) => {
      const billing = new CoinBillingService(ctx.db);
      const reservation = await billing.reserve(
        ctx.user.id,
        input.billingMode,
        input.videos.length,
        input.billingRequestId,
      );
      try {
        const library = await Tag.getAll(ctx, {
          sortBy: "usage",
          pagination: { page: 0, limit: 200 },
        });
        const result = await suggestSeedbedTags(
          { videos: input.videos },
          fetch,
          process.env,
          library.tags.map((tag) => tag.name),
          input.uiLanguage,
        );
        await billing.settle(reservation.id);
        return result;
      } catch (error) {
        await billing.refund(
          reservation.id,
          "AI 标签匹配失败，自动退回 AI 点数",
        );
        throw error;
      }
    }),
  previewBilibiliFavorites: importSessionsProcedure
    .use(
      createRateLimitMiddleware({
        name: "importSessions.previewBilibiliFavorites",
        windowMs: 60000,
        maxRequests: 3,
      }),
    )
    .input(z.object({ url: z.string().trim().max(2048) }))
    .mutation(async ({ input }) => readBilibiliFavorites(input.url)),
  createImportSession: importSessionsProcedure
    .input(zCreateImportSessionRequestSchema)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const session = await ctx.importSessionsService.create(ctx.actor, input);
      return { id: session.id };
    }),

  getImportSessionStats: importSessionsProcedure
    .input(zGetImportSessionStatsRequestSchema)
    .output(zImportSessionWithStatsSchema)
    .use(ensureImportSessionAccess)
    .query(async ({ ctx }) => {
      return await ctx.importSessionsService.getWithStats(ctx.importSession);
    }),

  listImportSessions: importSessionsProcedure
    .input(zListImportSessionsRequestSchema)
    .output(zListImportSessionsResponseSchema)
    .query(async ({ ctx }) => {
      const sessions = await ctx.importSessionsService.listWithStats(ctx.actor);
      return { sessions };
    }),

  deleteImportSession: importSessionsProcedure
    .input(zDeleteImportSessionRequestSchema)
    .output(z.object({ success: z.boolean() }))
    .use(ensureImportSessionAccess)
    .mutation(async ({ ctx }) => {
      await ctx.importSessionsService.delete(ctx.importSession);
      return { success: true };
    }),

  stageImportedBookmarks: importSessionsProcedure
    .input(
      z.object({
        importSessionId: z.string(),
        bookmarks: z
          .array(
            z.object({
              type: z.enum(["link", "text", "asset"]),
              url: z.string().optional(),
              title: z.string().optional(),
              content: z.string().optional(),
              note: z.string().optional(),
              tags: z.array(z.string()).default([]),
              listIds: z.array(z.string()).default([]),
              sourceAddedAt: z.date().optional(),
              archived: z.boolean().optional(),
            }),
          )
          .max(50),
      }),
    )
    .use(ensureImportSessionAccess)
    .mutation(async ({ input, ctx }) => {
      await ctx.importSessionsService.stageBookmarks(
        ctx.importSession,
        input.bookmarks,
      );
    }),

  finalizeImportStaging: importSessionsProcedure
    .input(z.object({ importSessionId: z.string() }))
    .use(ensureImportSessionAccess)
    .mutation(async ({ ctx }) => {
      await ctx.importSessionsService.finalize(ctx.importSession);
    }),

  pauseImportSession: importSessionsProcedure
    .input(z.object({ importSessionId: z.string() }))
    .use(ensureImportSessionAccess)
    .mutation(async ({ ctx }) => {
      await ctx.importSessionsService.pause(ctx.importSession);
    }),

  resumeImportSession: importSessionsProcedure
    .input(z.object({ importSessionId: z.string() }))
    .use(ensureImportSessionAccess)
    .mutation(async ({ ctx }) => {
      await ctx.importSessionsService.resume(ctx.importSession);
    }),

  retryFailedImportSession: importSessionsProcedure
    .input(z.object({ importSessionId: z.string() }))
    .output(z.object({ retried: z.number() }))
    .use(ensureImportSessionAccess)
    .mutation(async ({ ctx }) => ({
      retried: await ctx.importSessionsService.retryFailed(ctx.importSession),
    })),

  getImportSessionResults: importSessionsProcedure
    .input(
      z.object({
        importSessionId: z.string(),
        filter: z
          .enum(["all", "accepted", "rejected", "skipped_duplicate", "pending"])
          .optional(),
        cursor: z.string().optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_NUM_IMPORT_SESSION_RESULTS_PER_PAGE)
          .default(DEFAULT_NUM_IMPORT_SESSION_RESULTS_PER_PAGE),
      }),
    )
    .use(ensureImportSessionAccess)
    .query(async ({ ctx, input }) => {
      return await ctx.importSessionsService.getStagingBookmarks(
        ctx.importSession,
        input.filter,
        input.cursor,
        input.limit,
      );
    }),
});
