import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";

import type { DB, KarakeepDBTransaction } from "@karakeep/db";
import {
  aiBillingReservations,
  coinTransactions,
  coinWallets,
} from "@karakeep/db/schema";

export const WELCOME_COIN_GRANT = 20;
export const FREE_INITIAL_AI_TAGGINGS = 100;
export const AI_TAGGING_COIN_COST = 1;

type BillingMode = "initial_import" | "rematch";
type Database = DB | KarakeepDBTransaction;

function ensureWallet(db: Database, userId: string) {
  const created = db
    .insert(coinWallets)
    .values({ userId, balance: WELCOME_COIN_GRANT })
    .onConflictDoNothing()
    .returning()
    .all();

  if (created.length > 0) {
    db.insert(coinTransactions)
      .values({
        userId,
        amount: WELCOME_COIN_GRANT,
        balanceAfter: WELCOME_COIN_GRANT,
        kind: "welcome_grant",
        description: "新用户欢迎金币",
        idempotencyKey: `welcome:${userId}`,
      })
      .run();
    return created[0];
  }

  const wallet = db
    .select()
    .from(coinWallets)
    .where(eq(coinWallets.userId, userId))
    .get();
  if (!wallet) throw new Error("Coin wallet could not be initialized");
  return wallet;
}

function calculateQuote(
  balance: number,
  freeAiTaggingsUsed: number,
  bonusFreeAiTaggings: number,
  unlimitedAiTagging: boolean,
  mode: BillingMode,
  itemCount: number,
) {
  const freeRemaining = Math.max(
    0,
    FREE_INITIAL_AI_TAGGINGS - freeAiTaggingsUsed,
  );
  const includedFreeItemCount =
    mode === "initial_import" ? Math.min(freeRemaining, itemCount) : 0;
  const bonusFreeItemCount = unlimitedAiTagging
    ? itemCount - includedFreeItemCount
    : Math.min(bonusFreeAiTaggings, itemCount - includedFreeItemCount);
  const freeItemCount = includedFreeItemCount + bonusFreeItemCount;
  const paidItemCount = itemCount - freeItemCount;
  const coinCost = paidItemCount * AI_TAGGING_COIN_COST;
  return {
    balance,
    freeLimit: FREE_INITIAL_AI_TAGGINGS,
    freeUsed: freeAiTaggingsUsed,
    freeRemaining,
    bonusFreeRemaining: bonusFreeAiTaggings,
    unlimitedAiTagging,
    includedFreeItemCount,
    bonusFreeItemCount,
    freeItemCount,
    paidItemCount,
    coinCost,
    balanceAfter: balance - coinCost,
    canAfford: balance >= coinCost,
  };
}

export class CoinBillingService {
  constructor(private db: DB) {}

  async summary(userId: string) {
    return this.db.transaction((tx) => {
      const wallet = ensureWallet(tx, userId);
      const transactions = tx
        .select()
        .from(coinTransactions)
        .where(eq(coinTransactions.userId, userId))
        .orderBy(desc(coinTransactions.createdAt))
        .limit(30)
        .all();
      return {
        ...calculateQuote(
          wallet.balance,
          wallet.freeAiTaggingsUsed,
          wallet.bonusFreeAiTaggings,
          wallet.unlimitedAiTagging,
          "initial_import",
          0,
        ),
        transactions,
      };
    });
  }

  async quote(userId: string, mode: BillingMode, itemCount: number) {
    return this.db.transaction((tx) => {
      const wallet = ensureWallet(tx, userId);
      return calculateQuote(
        wallet.balance,
        wallet.freeAiTaggingsUsed,
        wallet.bonusFreeAiTaggings,
        wallet.unlimitedAiTagging,
        mode,
        itemCount,
      );
    });
  }

  async reserve(
    userId: string,
    mode: BillingMode,
    itemCount: number,
    idempotencyKey: string,
  ) {
    return this.db.transaction((tx) => {
      const existing = tx
        .select()
        .from(aiBillingReservations)
        .where(eq(aiBillingReservations.idempotencyKey, idempotencyKey))
        .get();
      if (existing) {
        if (existing.userId !== userId)
          throw new TRPCError({ code: "FORBIDDEN" });
        return existing;
      }

      const wallet = ensureWallet(tx, userId);
      const quote = calculateQuote(
        wallet.balance,
        wallet.freeAiTaggingsUsed,
        wallet.bonusFreeAiTaggings,
        wallet.unlimitedAiTagging,
        mode,
        itemCount,
      );
      if (!quote.canAfford) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `金币不足：本次需要 ${quote.coinCost} 金币，当前余额 ${quote.balance}。`,
        });
      }

      const [updatedWallet] = tx
        .update(coinWallets)
        .set({
          balance: sql`${coinWallets.balance} - ${quote.coinCost}`,
          freeAiTaggingsUsed: sql`${coinWallets.freeAiTaggingsUsed} + ${quote.includedFreeItemCount}`,
          bonusFreeAiTaggings: sql`${coinWallets.bonusFreeAiTaggings} - ${quote.bonusFreeItemCount}`,
        })
        .where(
          and(
            eq(coinWallets.userId, userId),
            gte(coinWallets.balance, quote.coinCost),
          ),
        )
        .returning()
        .all();
      if (!updatedWallet) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "余额刚刚发生变化，请重新确认本次费用。",
        });
      }

      const [reservation] = tx
        .insert(aiBillingReservations)
        .values({
          userId,
          idempotencyKey,
          mode,
          itemCount,
          freeItemCount: quote.freeItemCount,
          bonusFreeItemCount: quote.bonusFreeItemCount,
          coinCost: quote.coinCost,
        })
        .returning()
        .all();

      if (quote.coinCost > 0) {
        tx.insert(coinTransactions)
          .values({
            userId,
            amount: -quote.coinCost,
            balanceAfter: updatedWallet.balance,
            kind: "ai_tagging",
            description:
              mode === "rematch"
                ? `重新匹配 ${itemCount} 条收藏标签`
                : `导入时匹配 ${itemCount} 条收藏标签`,
            idempotencyKey: `charge:${idempotencyKey}`,
            relatedReservationId: reservation.id,
          })
          .run();
      }
      return reservation;
    });
  }

  async settle(reservationId: string) {
    this.db
      .update(aiBillingReservations)
      .set({ status: "settled", settledAt: new Date() })
      .where(
        and(
          eq(aiBillingReservations.id, reservationId),
          eq(aiBillingReservations.status, "reserved"),
        ),
      )
      .run();
  }

  async refund(reservationId: string, reason: string) {
    this.db.transaction((tx) => {
      const reservation = tx
        .select()
        .from(aiBillingReservations)
        .where(
          and(
            eq(aiBillingReservations.id, reservationId),
            eq(aiBillingReservations.status, "reserved"),
          ),
        )
        .get();
      if (!reservation) return;
      const [wallet] = tx
        .update(coinWallets)
        .set({
          balance: sql`${coinWallets.balance} + ${reservation.coinCost}`,
          freeAiTaggingsUsed: sql`${coinWallets.freeAiTaggingsUsed} - ${reservation.freeItemCount - reservation.bonusFreeItemCount}`,
          bonusFreeAiTaggings: sql`${coinWallets.bonusFreeAiTaggings} + ${reservation.bonusFreeItemCount}`,
        })
        .where(eq(coinWallets.userId, reservation.userId))
        .returning()
        .all();
      tx.update(aiBillingReservations)
        .set({ status: "refunded", settledAt: new Date() })
        .where(eq(aiBillingReservations.id, reservation.id))
        .run();
      if (reservation.coinCost > 0 && wallet) {
        tx.insert(coinTransactions)
          .values({
            userId: reservation.userId,
            amount: reservation.coinCost,
            balanceAfter: wallet.balance,
            kind: "refund",
            description: reason,
            idempotencyKey: `refund:${reservation.id}`,
            relatedReservationId: reservation.id,
          })
          .run();
      }
    });
  }

  async adminAdjust(
    userId: string,
    amount: number,
    reason: string,
    adminUserId: string,
    idempotencyKey: string,
  ) {
    return this.db.transaction((tx) => {
      const wallet = ensureWallet(tx, userId);
      if (wallet.balance + amount < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "调整后余额不能小于0。",
        });
      }
      const [updated] = tx
        .update(coinWallets)
        .set({ balance: sql`${coinWallets.balance} + ${amount}` })
        .where(eq(coinWallets.userId, userId))
        .returning()
        .all();
      tx.insert(coinTransactions)
        .values({
          userId,
          amount,
          balanceAfter: updated.balance,
          kind: "admin_adjustment",
          description: reason,
          idempotencyKey,
          createdByUserId: adminUserId,
        })
        .run();
      return updated;
    });
  }

  async adminAdjustFreeQuota(
    userId: string,
    amount: number,
    unlimitedAiTagging?: boolean,
  ) {
    return this.db.transaction((tx) => {
      const wallet = ensureWallet(tx, userId);
      if (wallet.bonusFreeAiTaggings + amount < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "调整后的额外免费额度不能小于0。",
        });
      }
      const [updated] = tx
        .update(coinWallets)
        .set({
          bonusFreeAiTaggings: sql`${coinWallets.bonusFreeAiTaggings} + ${amount}`,
          ...(unlimitedAiTagging === undefined ? {} : { unlimitedAiTagging }),
        })
        .where(eq(coinWallets.userId, userId))
        .returning()
        .all();
      return updated;
    });
  }
}
