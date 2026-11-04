jest.mock("../marketData", () => require("./helpers/fakeMarket"));
const market = require("./helpers/fakeMarket");
const User = require("../models/User");
const Holding = require("../models/Holding");
const Position = require("../models/Position");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const { createUser, authed } = require("./helpers/auth");
const { freezeDate, unfreezeDate } = require("./helpers/clock");

let user;
let api;

beforeEach(async () => {
  market.reset();
  market.setPrice("RELIANCE", 1000);
  market.setPrice("TCS", 2500);
  market.setPrice("^NSEI", 24000);
  user = await createUser();
  api = authed(user.token);
});

afterEach(() => unfreezeDate());

const funds = async () => (await User.findById(user.id)).funds;
const buy = (body) =>
  api.post("/api/orders/buy").send({ companyName: "X", orderType: "delivery", ...body });
const sell = (body) =>
  api.post("/api/orders/sell").send({ companyName: "X", orderType: "delivery", ...body });

describe("delivery buy", () => {
  test("deducts full cost and creates a holding, order and transaction", async () => {
    const res = await buy({ symbol: "reliance", quantity: 10 }).expect(200);
    expect(res.body.amountDeducted).toBe(10000);
    expect(res.body.remainingFunds).toBe(90000);
    expect(await funds()).toBe(90000);

    const holding = await Holding.findOne({ userId: user.id });
    expect(holding).toMatchObject({ symbol: "RELIANCE", quantity: 10, avgBuyPrice: 1000 });
    expect(await Order.countDocuments({ userId: user.id })).toBe(1);
    const tx = await Transaction.findOne({ userId: user.id });
    expect(tx).toMatchObject({ transactionType: "buy", totalAmount: 10000, fundsAfter: 90000 });
  });

  test("a second buy updates the weighted average price", async () => {
    await buy({ symbol: "RELIANCE", quantity: 10 }).expect(200);
    market.setPrice("RELIANCE", 1300);
    await buy({ symbol: "RELIANCE", quantity: 5 }).expect(200);
    const holding = await Holding.findOne({ userId: user.id });
    expect(holding.quantity).toBe(15);
    expect(holding.avgBuyPrice).toBe(1100); // (10*1000 + 5*1300) / 15
    expect(await funds()).toBe(100000 - 10000 - 6500);
  });

  test("insufficient funds → 400, nothing changes", async () => {
    const res = await buy({ symbol: "TCS", quantity: 41 }).expect(400);
    expect(res.body.message).toMatch(/Insufficient funds/);
    expect(await funds()).toBe(100000);
    expect(await Holding.countDocuments()).toBe(0);
  });

  test("spending exactly all funds is allowed", async () => {
    await buy({ symbol: "TCS", quantity: 40 }).expect(200);
    expect(await funds()).toBe(0);
  });

  test.each([
    [{ quantity: 1 }, "missing symbol"],
    [{ symbol: "TCS" }, "missing quantity"],
    [{ symbol: "TCS", quantity: 0 }, "zero quantity"],
    [{ symbol: "TCS", quantity: -3 }, "negative quantity"],
    [{ symbol: "TCS", quantity: 1, orderType: "margin" }, "bad order type"],
  ])("validation: %o (%s) → 400", async (body) => {
    await buy(body).expect(400);
  });

  test("quantity sent as a string is treated as a number", async () => {
    await buy({ symbol: "RELIANCE", quantity: 10 }).expect(200);
    await buy({ symbol: "RELIANCE", quantity: "5" }).expect(200);
    const holding = await Holding.findOne({ userId: user.id });
    expect(holding.quantity).toBe(15); // today: 10 + "5" = "105" → 105 shares
  });

  test("non-integer quantity is rejected", async () => {
    await buy({ symbol: "RELIANCE", quantity: 0.5 }).expect(400);
  });

  test("non-numeric quantity is a 400, not a 500", async () => {
    await buy({ symbol: "RELIANCE", quantity: "abc" }).expect(400);
  });

  test("indices are view-only and can't be bought", async () => {
    await buy({ symbol: "^NSEI", quantity: 1 }).expect(400);
  });

  test("price lookup failure is a 502/503, not a generic 500", async () => {
    const res = await buy({ symbol: "UNKNOWN", quantity: 1 });
    expect([502, 503]).toContain(res.status);
    expect(await funds()).toBe(100000);
  });

  test("two simultaneous buys can't spend more than the balance", async () => {
    // Each costs 60,000; together they exceed the 1,00,000 balance.
    market.setPrice("BIG", 60000);
    await Promise.all([
      buy({ symbol: "BIG", quantity: 1 }),
      buy({ symbol: "BIG", quantity: 1 }),
    ]);
    const holding = await Holding.findOne({ userId: user.id, symbol: "BIG" });
    expect(await funds()).toBeGreaterThanOrEqual(0);
    expect(holding.quantity * 60000 + (await funds())).toBe(100000);
  });
});

describe("delivery sell", () => {
  beforeEach(async () => {
    await buy({ symbol: "RELIANCE", quantity: 10 }).expect(200);
  });

  test("partial sell books profit and returns full proceeds", async () => {
    market.setPrice("RELIANCE", 1200);
    const res = await sell({ symbol: "RELIANCE", quantity: 4 }).expect(200);
    expect(res.body.profitLoss).toBe(800);
    expect(await funds()).toBe(90000 + 4800);
    expect((await Holding.findOne({ userId: user.id })).quantity).toBe(6);
    const tx = await Transaction.findOne({ transactionType: "sell" });
    expect(tx).toMatchObject({ buyPrice: 1000, sellPrice: 1200, profitLoss: 800 });
  });

  test("selling everything at a loss removes the holding", async () => {
    market.setPrice("RELIANCE", 950);
    const res = await sell({ symbol: "RELIANCE", quantity: 10 }).expect(200);
    expect(res.body.profitLoss).toBe(-500);
    expect(await Holding.countDocuments()).toBe(0);
    expect(await funds()).toBe(99500);
  });

  test("can't sell more than owned", async () => {
    const res = await sell({ symbol: "RELIANCE", quantity: 11 }).expect(400);
    expect(res.body.message).toMatch(/You own 10/);
  });

  test("can't sell a stock you don't own", async () => {
    await sell({ symbol: "TCS", quantity: 1 }).expect(400);
  });

  test("holding duration is recorded in days and hours", async () => {
    freezeDate("2026-01-30T05:00:00Z");
    await buy({ symbol: "TCS", quantity: 1 }).expect(200);
    freezeDate("2026-02-02T08:00:00Z"); // across a month boundary
    await sell({ symbol: "TCS", quantity: 1 }).expect(200);
    const tx = await Transaction.findOne({ symbol: "TCS", transactionType: "sell" });
    expect(tx.holdingDuration).toBe("3 days 3 hrs");
  });

  test("a string quantity that equals the holding removes it", async () => {
    await sell({ symbol: "RELIANCE", quantity: "10" }).expect(200);
    // today "10" !== 10, so a holding with 0 shares is left behind
    expect(await Holding.countDocuments()).toBe(0);
  });

  test("an unknown order type on sell is a 400 (not treated as intraday)", async () => {
    const res = await sell({ symbol: "RELIANCE", quantity: 1, orderType: "foo" }).expect(400);
    // today it falls through to the intraday branch ("No open intraday position")
    expect(res.body.message).toMatch(/order type/i);
  });
});

describe("intraday", () => {
  const ibuy = (body) => buy({ orderType: "intraday", ...body });
  const isell = (body) => sell({ orderType: "intraday", ...body });

  test("buy blocks 20% margin (5x leverage)", async () => {
    const res = await ibuy({ symbol: "TCS", quantity: 10 }).expect(200);
    expect(res.body.amountDeducted).toBe(5000);
    expect(await funds()).toBe(95000);
    const pos = await Position.findOne({ userId: user.id });
    expect(pos).toMatchObject({ quantity: 10, buyPrice: 2500, isSquaredOff: false });
  });

  test("can buy up to 5x the cash balance", async () => {
    await ibuy({ symbol: "TCS", quantity: 200 }).expect(200); // 5,00,000 exposure
    expect(await funds()).toBe(0);
  });

  test("sell returns margin plus P&L and squares off", async () => {
    await ibuy({ symbol: "TCS", quantity: 10 }).expect(200);
    market.setPrice("TCS", 2400);
    const res = await isell({ symbol: "TCS", quantity: 10 }).expect(200);
    expect(res.body.profitLoss).toBe(-1000);
    expect(await funds()).toBe(95000 + 5000 - 1000);
    expect((await Position.findOne()).isSquaredOff).toBe(true);
  });

  test("partial intraday sell keeps the rest open", async () => {
    await ibuy({ symbol: "TCS", quantity: 10 }).expect(200);
    await isell({ symbol: "TCS", quantity: 4 }).expect(200);
    expect((await Position.findOne()).quantity).toBe(6);
  });

  test("selling without an open position → 400", async () => {
    await isell({ symbol: "TCS", quantity: 1 }).expect(400);
  });

  test("positions endpoint shows live P&L and margin", async () => {
    await ibuy({ symbol: "TCS", quantity: 10 }).expect(200);
    market.setPrice("TCS", 2600);
    const res = await api.get("/api/positions").expect(200);
    expect(res.body.positions[0]).toMatchObject({
      profitLoss: 1000,
      profitLossPercent: 4,
      marginPaid: 5000,
    });
    expect(res.body.summary.totalMarginUsed).toBe(5000);
  });

  test("an intraday position left open isn't lost the next day", async () => {
    freezeDate("2026-11-04T05:00:00Z"); // 10:30 IST
    await ibuy({ symbol: "TCS", quantity: 10 }).expect(200);
    expect(await funds()).toBe(95000);

    freezeDate("2026-11-05T05:00:00Z"); // next morning
    const res = await api.get("/api/positions").expect(200);
    // Either still visible, or squared off with the margin returned.
    const visible = res.body.positions.length === 1;
    const refunded = (await funds()) >= 95000 + 5000 - 1;
    expect(visible || refunded).toBe(true);
  });

  test("intraday trading day follows IST, not UTC", async () => {
    // 00:30 IST on 1 Jan 2027 is still 31 Dec 2026 in UTC.
    freezeDate("2026-12-31T19:00:00Z");
    api = authed((await createUser()).token); // token issued at the frozen time
    await ibuy({ symbol: "TCS", quantity: 1 }).expect(200);
    expect((await Position.findOne()).date).toBe("2027-01-01");
  });
});

describe("holdings and analytics", () => {
  test("empty portfolio", async () => {
    const res = await api.get("/api/holdings").expect(200);
    expect(res.body).toEqual({ holdings: [], summary: null, analytics: null });
  });

  test("live P&L, summary, best/worst, win rate and most traded", async () => {
    await buy({ symbol: "RELIANCE", quantity: 10 }).expect(200); // 10,000
    await buy({ symbol: "TCS", quantity: 4 }).expect(200); // 10,000
    market.setPrice("RELIANCE", 1100);
    await sell({ symbol: "RELIANCE", quantity: 2 }).expect(200); // +200 win
    market.setPrice("TCS", 2400);
    await sell({ symbol: "TCS", quantity: 1 }).expect(200); // -100 loss

    market.setPrice("RELIANCE", 1200, { previousClose: 1150 });
    market.setPrice("TCS", 2250);
    const res = await api.get("/api/holdings").expect(200);

    const rel = res.body.holdings.find((h) => h.symbol === "RELIANCE");
    expect(rel).toMatchObject({
      quantity: 8,
      investedAmount: 8000,
      currentValue: 9600,
      profitLoss: 1600,
      profitLossPercent: 20,
      dayChange: 50,
      sector: "Energy",
    });
    expect(res.body.summary).toEqual({
      totalInvested: 15500, // 8,000 + 3 × 2,500
      totalCurrentValue: 16350, // 9,600 + 3 × 2,250
      totalProfitLoss: 850,
      totalProfitLossPercent: 5.48,
    });
    expect(res.body.analytics).toMatchObject({
      bestHolding: { symbol: "RELIANCE" },
      worstHolding: { symbol: "TCS", profitLossPercent: -10 },
      winRate: 50,
      totalTrades: 4,
      totalSells: 2,
      profitableSells: 1,
      lossSells: 1,
      mostTraded: { count: 2 },
    });
  });

  test("a failed price lookup doesn't show a fake -100% loss", async () => {
    await buy({ symbol: "RELIANCE", quantity: 10 }).expect(200);
    market.setFailAll(true);
    const res = await api.get("/api/holdings").expect(200);
    // Today currentValue is 0, so the summary reports a ₹10,000 loss.
    expect(res.body.summary.totalProfitLoss).not.toBe(-10000);
  });

  test("transactions are listed newest first and only for this user", async () => {
    await buy({ symbol: "RELIANCE", quantity: 1 }).expect(200);
    await buy({ symbol: "TCS", quantity: 1 }).expect(200);
    const other = await createUser();
    await authed(other.token).post("/api/orders/buy")
      .send({ symbol: "TCS", companyName: "X", quantity: 1, orderType: "delivery" })
      .expect(200);

    const res = await api.get("/api/transactions").expect(200);
    expect(res.body.transactions.map((t) => t.symbol)).toEqual(["TCS", "RELIANCE"]);
  });

  test("one user can't see another user's holdings or positions", async () => {
    await buy({ symbol: "RELIANCE", quantity: 1 }).expect(200);
    await buy({ symbol: "TCS", quantity: 1, orderType: "intraday" }).expect(200);
    const other = authed((await createUser()).token);
    expect((await other.get("/api/holdings").expect(200)).body.holdings).toEqual([]);
    expect((await other.get("/api/positions").expect(200)).body.positions).toEqual([]);
    expect((await other.get("/api/transactions").expect(200)).body.transactions).toEqual([]);
  });

  test("protected trading routes require a token", async () => {
    const request = require("supertest");
    const app = require("../app");
    for (const url of ["/api/holdings", "/api/positions", "/api/transactions"]) {
      await request(app).get(url).expect(401);
    }
    await request(app).post("/api/orders/buy").send({}).expect(401);
  });
});
