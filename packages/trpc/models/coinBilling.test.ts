import { beforeEach, describe, expect, test } from "vitest";

import { CoinBillingService } from "./coinBilling";
import type { CustomTestContext } from "../testUtils";
import { defaultBeforeEach } from "../testUtils";

beforeEach<CustomTestContext>(defaultBeforeEach(true));

describe("CoinBillingService", () => {
  test<CustomTestContext>("creates a wallet with welcome coins and free quota", async ({
    db,
    apiCallers,
  }) => {
    const user = await apiCallers[0].users.whoami();
    const summary = await new CoinBillingService(db).summary(user.id);
    expect(summary.balance).toBe(20);
    expect(summary.freeRemaining).toBe(100);
    expect(summary.transactions[0].amount).toBe(20);
  });

  test<CustomTestContext>("uses free imports before coins and does not double charge", async ({
    db,
    apiCallers,
  }) => {
    const user = await apiCallers[0].users.whoami();
    const billing = new CoinBillingService(db);
    const first = await billing.reserve(
      user.id,
      "initial_import",
      100,
      "free-100",
    );
    expect(first.coinCost).toBe(0);
    await billing.settle(first.id);

    const paid = await billing.reserve(user.id, "initial_import", 2, "paid-2");
    expect(paid.coinCost).toBe(2);
    const same = await billing.reserve(user.id, "initial_import", 2, "paid-2");
    expect(same.id).toBe(paid.id);
    expect((await billing.summary(user.id)).balance).toBe(18);
  });

  test<CustomTestContext>("charges rematches and refunds failed work", async ({
    db,
    apiCallers,
  }) => {
    const user = await apiCallers[0].users.whoami();
    const billing = new CoinBillingService(db);
    const reservation = await billing.reserve(
      user.id,
      "rematch",
      1,
      "rematch-1",
    );
    expect((await billing.summary(user.id)).balance).toBe(19);
    await billing.refund(reservation.id, "provider failed");
    const summary = await billing.summary(user.id);
    expect(summary.balance).toBe(20);
    expect(summary.freeRemaining).toBe(100);
  });

  test<CustomTestContext>("records administrator adjustments", async ({
    db,
    apiCallers,
  }) => {
    const user = await apiCallers[0].users.whoami();
    const admin = await apiCallers[1].users.whoami();
    const billing = new CoinBillingService(db);
    await billing.adminAdjust(
      user.id,
      5,
      "内测奖励",
      admin.id,
      "admin-grant-1",
    );
    const summary = await billing.summary(user.id);
    expect(summary.balance).toBe(25);
    expect(summary.transactions[0].kind).toBe("admin_adjustment");
  });
});
