import { afterEach, describe, expect, test, vi } from "vitest";
import {
  calculateXIRR,
  computeXIRR,
  getXIRRLabel,
  computeSectorPerformance,
  computeTodayPnL,
} from "./portfolioMath";

afterEach(() => vi.useRealTimers());

describe("XIRR", () => {
  test("−1000 then +1100 a year later is 10%", () => {
    const rate = calculateXIRR(
      [-1000, 1100],
      [new Date("2025-01-01"), new Date("2026-01-01")],
    );
    expect(rate).toBeCloseTo(0.1, 4);
  });

  test("needs both inflows and outflows", () => {
    expect(calculateXIRR([-1, -2], [new Date(), new Date()])).toBeNull();
    expect(calculateXIRR([5], [new Date()])).toBeNull();
  });

  test("uses buys, sells and today's holdings value", () => {
    vi.useFakeTimers({
      now: new Date("2026-07-01T00:00:00Z"),
      toFake: ["Date"],
    });
    const xirr = computeXIRR(
      [
        {
          transactionType: "buy",
          totalAmount: 10000,
          createdAt: "2025-07-01T00:00:00Z",
        },
        {
          transactionType: "sell",
          totalAmount: 5500,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      [{ currentPrice: 110, quantity: 50 }],
    );
    // 5500/(1+r)^(184/365) + 5500/(1+r) = 10000  →  r ≈ 13.59%
    expect(xirr).toBe("13.59");
  });

  test("no transactions → null", () => {
    expect(computeXIRR([], [])).toBeNull();
  });

  test("same-day trades give no XIRR instead of an extreme number", () => {
    const now = new Date("2026-11-22T10:00:00Z");
    const xirr = computeXIRR(
      [
        {
          transactionType: "buy",
          orderType: "delivery",
          totalAmount: 10000,
          createdAt: "2026-11-22T04:00:00Z",
        },
        {
          transactionType: "sell",
          orderType: "delivery",
          totalAmount: 9000,
          createdAt: "2026-11-22T05:00:00Z",
        },
      ],
      [],
      now,
    );
    expect(xirr).toBeNull(); // annualised this would be about -100%
  });

  test("intraday trades are ignored", () => {
    const now = new Date("2026-07-01T00:00:00Z");
    const delivery = [
      {
        transactionType: "buy",
        orderType: "delivery",
        totalAmount: 10000,
        createdAt: "2025-07-01T00:00:00Z",
      },
      {
        transactionType: "sell",
        orderType: "delivery",
        totalAmount: 5500,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    const intraday = [
      {
        transactionType: "buy",
        orderType: "intraday",
        totalAmount: 50000,
        createdAt: "2026-06-30T04:00:00Z",
      },
    ];
    const holdings = [{ currentPrice: 110, quantity: 50 }];
    expect(computeXIRR([...delivery, ...intraday], holdings, now)).toBe(
      computeXIRR(delivery, holdings, now),
    );
  });

  test.each([
    ["35", "Excellent 🚀"],
    ["15", "Good 📈"],
    ["0", "Moderate ➡️"],
    ["-0.01", "Negative 📉"],
  ])("label for %s%%", (xirr, label) => {
    expect(getXIRRLabel(xirr).label).toBe(label);
  });
});

describe("sector performance", () => {
  test("groups by sector, sorts by % return, defaults to Others", () => {
    const out = computeSectorPerformance([
      {
        symbol: "A",
        sector: "IT",
        avgBuyPrice: 100,
        currentPrice: 110,
        quantity: 10,
      },
      {
        symbol: "B",
        sector: "IT",
        avgBuyPrice: 50,
        currentPrice: 45,
        quantity: 20,
      },
      { symbol: "C", avgBuyPrice: 10, currentPrice: 15, quantity: 1 },
    ]);
    expect(out.map((s) => s.sector)).toEqual(["Others", "IT"]);
    expect(out[1]).toMatchObject({
      invested: 2000,
      currentValue: 2000,
      profitLoss: 0,
      pnlPercent: 0,
      stocks: ["A", "B"],
    });
    expect(out[0].pnlPercent).toBe(50);
  });
});

describe("today's P&L", () => {
  const now = new Date("2026-11-04T10:00:00+05:30");

  test("held from before: day change × quantity", () => {
    const pnl = computeTodayPnL(
      [
        {
          quantity: 10,
          dayChange: 5,
          currentPrice: 105,
          avgBuyPrice: 80,
          buyDate: "2026-10-01T05:00:00Z",
        },
      ],
      now,
    );
    expect(pnl).toBe(50);
  });

  test("bought today: measured from the buy price, not yesterday's close", () => {
    const pnl = computeTodayPnL(
      [
        {
          quantity: 7,
          dayChange: -36,
          currentPrice: 2436,
          avgBuyPrice: 2436,
          buyDate: "2026-11-04T03:50:00Z",
        },
      ],
      now,
    );
    expect(pnl).toBe(0);
  });
});
