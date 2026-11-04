// Runs with TZ=Asia/Kolkata (see vite.config.js).
import { describe, expect, test } from "vitest";
import { groupTradesByPeriod, groupMonthlyPnL } from "./tradeStats";

const t = (iso, transactionType = "buy", profitLoss = null) => ({
  createdAt: iso,
  transactionType,
  profitLoss,
});

describe("trade frequency", () => {
  test("months are ordered across a year boundary", () => {
    const groups = groupTradesByPeriod(
      [t("2027-01-05T05:00:00Z"), t("2026-12-20T05:00:00Z", "sell"), t("2026-12-21T05:00:00Z")],
      "month",
    );
    expect(groups.map((g) => [g.label, g.buys, g.sells])).toEqual([
      ["Dec 2026", 1, 1],
      ["Jan 2027", 1, 0],
    ]);
  });

  test("a trade at 23:30 IST on 31 March counts in March (quarter end)", () => {
    const [g] = groupTradesByPeriod([t("2026-03-31T18:00:00Z")], "month");
    expect(g.label).toBe("Mar 2026");
  });

  test("week groups start on Monday, even across New Year", () => {
    const groups = groupTradesByPeriod(
      [t("2026-12-30T06:00:00Z"), t("2027-01-03T06:00:00Z")], // Wed, Sun
      "week",
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("W 28 Dec");
  });

  test("early-morning IST trades land in the right day", () => {
    // 00:30 IST on 1 Jan 2027 is 31 Dec in UTC
    const [g] = groupTradesByPeriod([t("2026-12-31T19:00:00Z")], "day");
    expect(g.key).toBe("2027-01-01");
  });

  test("trades early and late on the same Monday are one week", () => {
    const groups = groupTradesByPeriod(
      [t("2026-11-01T19:00:00Z"), t("2026-11-02T10:00:00Z")], // Mon 00:30 and 15:30 IST
      "week",
    );
    expect(groups).toHaveLength(1);
  });
});

describe("monthly P&L", () => {
  test("sums per month and rounds", () => {
    const months = groupMonthlyPnL([
      t("2026-10-02T05:00:00Z", "sell", 100.105),
      t("2026-10-20T05:00:00Z", "sell", -50),
      t("2026-11-01T05:00:00Z", "sell", 10),
    ]);
    expect(months.map((m) => [m.label, m.pnl, m.trades, m.profitable, m.loss])).toEqual([
      ["Oct 2026", 50.11, 2, 1, 1],
      ["Nov 2026", 10, 1, 1, 0],
    ]);
  });

  test("uses fixed month names (same output in every browser locale)", () => {
    const [m] = groupMonthlyPnL([t("2026-09-15T05:00:00Z", "sell", 1)]);
    expect(m.label).toBe("Sep 2026"); // not "Sept" as en-GB/en-IN can render
  });
});
