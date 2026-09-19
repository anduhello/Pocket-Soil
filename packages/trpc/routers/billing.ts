import { z } from "zod";

import { router, sessionProcedure } from "../index";
import { CoinBillingService } from "../models/coinBilling";

export const billingRouter = router({
  summary: sessionProcedure.query(async ({ ctx }) =>
    new CoinBillingService(ctx.db).summary(ctx.user.id),
  ),
  quoteAiTagging: sessionProcedure
    .input(
      z.object({
        mode: z.enum(["initial_import", "rematch"]),
        itemCount: z.number().int().min(1).max(500),
      }),
    )
    .query(async ({ ctx, input }) =>
      new CoinBillingService(ctx.db).quote(
        ctx.user.id,
        input.mode,
        input.itemCount,
      ),
    ),
});
