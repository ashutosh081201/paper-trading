jest.mock("../marketData", () => require("./helpers/fakeMarket"));
jest.mock("node-cron", () => ({ schedule: jest.fn() }));
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const market = require("./helpers/fakeMarket");
const User = require("../models/User");
const Holding = require("../models/Holding");
const Position = require("../models/Position");
const LimitOrder = require("../models/LimitOrder");
const PriceAlert = require("../models/PriceAlert");
const Transaction = require("../models/Transaction");
const { startLimitOrderCron } = require("../services/limitOrderCron");
const { startPriceAlertCron, detectCircuit } = require("../services/priceAlertCron");
const { startSquareOffCron } = require("../services/squareOffCron");
const { createUser, authed } = require("./helpers/auth");
const { freezeDate, unfreezeDate } = require("./helpers/clock");

// Capture the real callbacks registered with node-cron
const captured = {};
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  startLimitOrderCron();
  startPriceAlertCron();
  startSquareOffCron();
  for (const [schedule, fn] of cron.schedule.mock.calls) captured[schedule] = fn;
});
afterAll(() => console.log.mockRestore());
afterEach(() => unfreezeDate());

const runLimitOrders = () => captured["* * * * *"]();
const runPriceAlerts = () => captured["*/5 * * * *"]();

let user;
let api;
beforeEach(async () => {
  market.reset();
  market.setPrice("RELIANCE", 1000);
  user = await createUser();
  api = authed(user.token);
  nodemailer.sentMail.length = 0;
});

const funds = async () => (await User.findById(user.id)).funds;
const placeLimit = (body) =>
  api.post("/api/limit-orders").send({
    symbol: "RELIANCE", companyName: "Reliance", orderType: "delivery", quantity: 10, ...body,
  });

test("schedules: limit orders every minute, alerts every 5 minutes, square-off 15:20 IST", () => {
  expect(Object.keys(captured).sort()).toEqual(["* * * * *", "*/5 * * * *", "20 15 * * 1-5"]);
  const squareOff = cron.schedule.mock.calls.find(([s]) => s === "20 15 * * 1-5");
  expect(squareOff[2]).toEqual({ timezone: "Asia/Kolkata" });
});

describe("intraday auto square-off", () => {
  const runSquareOff = () => captured["20 15 * * 1-5"]();

  test("closes today's open positions at the live price and returns margin + P&L", async () => {
    await api.post("/api/orders/buy")
      .send({ symbol: "RELIANCE", companyName: "R", quantity: 10, orderType: "intraday" }).expect(200);
    market.setPrice("RELIANCE", 1050);
    await runSquareOff();
    expect((await Position.findOne()).isSquaredOff).toBe(true);
    expect(await funds()).toBe(98000 + 2000 + 500);
    const tx = await Transaction.findOne({ transactionType: "sell" });
    expect(tx).toMatchObject({ profitLoss: 500, holdingDuration: "Intraday (auto square-off)" });
  });

  test("closes at the buy price if no live price is available", async () => {
    await api.post("/api/orders/buy")
      .send({ symbol: "RELIANCE", companyName: "R", quantity: 10, orderType: "intraday" }).expect(200);
    market.setFailAll(true);
    await runSquareOff();
    expect(await funds()).toBe(100000);
  });

  test("leaves delivery holdings alone", async () => {
    await api.post("/api/orders/buy")
      .send({ symbol: "RELIANCE", companyName: "R", quantity: 1, orderType: "delivery" }).expect(200);
    await runSquareOff();
    expect(await Holding.countDocuments()).toBe(1);
  });
});

describe("limit order job", () => {
  test("LIMIT_BUY waits above the trigger and fills at or below it", async () => {
    const { body } = await placeLimit({ transactionType: "buy", limitType: "LIMIT_BUY", triggerPrice: 950 }).expect(201);

    await runLimitOrders();
    expect((await LimitOrder.findById(body.limitOrder._id)).status).toBe("PENDING");

    market.setPrice("RELIANCE", 940);
    await runLimitOrders();
    const order = await LimitOrder.findById(body.limitOrder._id);
    expect(order).toMatchObject({ status: "EXECUTED", executedPrice: 940 });
    expect(await funds()).toBe(100000 - 9400);
    expect(await Holding.findOne({ userId: user.id })).toMatchObject({ quantity: 10, avgBuyPrice: 940 });
    expect(nodemailer.sentMail).toHaveLength(1);
  });

  test("STOP_LOSS sells holdings when price falls to the trigger", async () => {
    await api.post("/api/orders/buy")
      .send({ symbol: "RELIANCE", companyName: "R", quantity: 10, orderType: "delivery" }).expect(200);
    await placeLimit({ transactionType: "sell", limitType: "STOP_LOSS", triggerPrice: 900 }).expect(201);

    market.setPrice("RELIANCE", 900);
    await runLimitOrders();
    expect(await Holding.countDocuments()).toBe(0);
    expect(await funds()).toBe(90000 + 9000);
    const tx = await Transaction.findOne({ transactionType: "sell" });
    expect(tx).toMatchObject({ profitLoss: -1000, sellPrice: 900 });
  });

  test("TARGET sells when price rises to the trigger", async () => {
    await api.post("/api/orders/buy")
      .send({ symbol: "RELIANCE", companyName: "R", quantity: 10, orderType: "delivery" }).expect(200);
    await placeLimit({ transactionType: "sell", limitType: "TARGET", triggerPrice: 1100 }).expect(201);
    market.setPrice("RELIANCE", 1099.95);
    await runLimitOrders();
    expect(await Holding.countDocuments()).toBe(1);
    market.setPrice("RELIANCE", 1150);
    await runLimitOrders();
    expect(await Holding.countDocuments()).toBe(0);
    expect((await Transaction.findOne({ transactionType: "sell" })).profitLoss).toBe(1500);
  });

  test("intraday STOP_LOSS squares off the position and returns margin + P&L", async () => {
    await api.post("/api/orders/buy")
      .send({ symbol: "RELIANCE", companyName: "R", quantity: 10, orderType: "intraday" }).expect(200);
    await placeLimit({ orderType: "intraday", transactionType: "sell", limitType: "STOP_LOSS", triggerPrice: 980 }).expect(201);
    market.setPrice("RELIANCE", 970);
    await runLimitOrders();
    expect((await Position.findOne()).isSquaredOff).toBe(true);
    expect(await funds()).toBe(98000 + 2000 - 300);
  });

  test("is cancelled if funds ran out before the trigger", async () => {
    const { body } = await placeLimit({ transactionType: "buy", limitType: "LIMIT_BUY", triggerPrice: 950 }).expect(201);
    await User.updateOne({ _id: user.id }, { funds: 100 });
    market.setPrice("RELIANCE", 900);
    await runLimitOrders();
    expect((await LimitOrder.findById(body.limitOrder._id)).status).toBe("CANCELLED");
    expect(await funds()).toBe(100);
  });

  test("is cancelled if the shares were sold in the meantime", async () => {
    await api.post("/api/orders/buy")
      .send({ symbol: "RELIANCE", companyName: "R", quantity: 10, orderType: "delivery" }).expect(200);
    const { body } = await placeLimit({ transactionType: "sell", limitType: "STOP_LOSS", triggerPrice: 900 }).expect(201);
    await api.post("/api/orders/sell")
      .send({ symbol: "RELIANCE", companyName: "R", quantity: 10, orderType: "delivery" }).expect(200);
    market.setPrice("RELIANCE", 850);
    await runLimitOrders();
    expect((await LimitOrder.findById(body.limitOrder._id)).status).toBe("CANCELLED");
  });

  test("stays pending when the price can't be fetched", async () => {
    const { body } = await placeLimit({ transactionType: "buy", limitType: "LIMIT_BUY", triggerPrice: 2000 }).expect(201);
    market.setFailAll(true);
    await runLimitOrders();
    expect((await LimitOrder.findById(body.limitOrder._id)).status).toBe("PENDING");
  });

  test("an email failure doesn't undo an executed order", async () => {
    const { body } = await placeLimit({ transactionType: "buy", limitType: "LIMIT_BUY", triggerPrice: 2000 }).expect(201);
    nodemailer.failNextSend();
    await runLimitOrders();
    expect((await LimitOrder.findById(body.limitOrder._id)).status).toBe("EXECUTED");
  });

  test("cancelled orders are ignored", async () => {
    const { body } = await placeLimit({ transactionType: "buy", limitType: "LIMIT_BUY", triggerPrice: 2000 }).expect(201);
    await api.delete(`/api/limit-orders/${body.limitOrder._id}`).expect(200);
    await runLimitOrders();
    expect(await Holding.countDocuments()).toBe(0);
  });
});

describe("price alert job", () => {
  const createAlert = (body) =>
    api.post("/api/alerts").send({ symbol: "RELIANCE", companyName: "Reliance", ...body });

  test("'above' alert fires once, emails, and is marked triggered", async () => {
    freezeDate("2026-11-04T06:00:00Z");
    await createAlert({ targetPrice: 1050, condition: "above" }).expect(201);
    await runPriceAlerts();
    expect(nodemailer.sentMail).toHaveLength(0);

    market.setPrice("RELIANCE", 1050);
    await runPriceAlerts();
    expect(nodemailer.sentMail).toHaveLength(1);
    expect(nodemailer.sentMail[0].subject).toMatch(/crossed above ₹1050/);
    const alert = await PriceAlert.findOne();
    expect(alert.triggered).toBe(true);
    expect(alert.triggeredAt.toISOString()).toBe("2026-11-04T06:00:00.000Z");

    await runPriceAlerts();
    expect(nodemailer.sentMail).toHaveLength(1);
    expect((await api.get("/api/alerts")).body.alerts).toEqual([]);
  });

  test("'below' alert fires when price drops to the target", async () => {
    await createAlert({ targetPrice: 950, condition: "below" }).expect(201);
    market.setPrice("RELIANCE", 949);
    await runPriceAlerts();
    expect(nodemailer.sentMail[0].subject).toMatch(/dropped below/);
  });

  test("alert is still marked triggered if the email fails", async () => {
    await createAlert({ targetPrice: 500, condition: "above" }).expect(201);
    jest.spyOn(console, "error").mockImplementation(() => {});
    nodemailer.failNextSend();
    await runPriceAlerts();
    console.error.mockRestore();
    expect((await PriceAlert.findOne()).triggered).toBe(true);
  });

  test("price fetch failure leaves alerts untouched", async () => {
    await createAlert({ targetPrice: 500, condition: "above" }).expect(201);
    market.setFailAll(true);
    jest.spyOn(console, "error").mockImplementation(() => {});
    await runPriceAlerts();
    console.error.mockRestore();
    expect((await PriceAlert.findOne()).triggered).toBe(false);
  });
});

describe("circuit breaker alerts", () => {
  beforeEach(async () => {
    await api.post("/api/orders/buy")
      .send({ symbol: "RELIANCE", companyName: "Reliance", quantity: 1, orderType: "delivery" })
      .expect(200);
  });

  test("uses the exchange's circuit limits when available", () => {
    expect(detectCircuit({ currentPrice: 110, upperCircuit: 110, lowerCircuit: 90 })).toBe("upper");
    expect(detectCircuit({ currentPrice: 90, upperCircuit: 110, lowerCircuit: 90 })).toBe("lower");
    expect(detectCircuit({ currentPrice: 109, upperCircuit: 110, lowerCircuit: 90, changePercent: 9 })).toBeNull();
  });

  test("falls back to a ≥4.5% move pinned at the day's high/low", () => {
    expect(detectCircuit({ changePercent: 5, currentPrice: 105, dayHigh: 105, dayLow: 99 })).toBe("upper");
    expect(detectCircuit({ changePercent: -5, currentPrice: 95, dayHigh: 101, dayLow: 95 })).toBe("lower");
    expect(detectCircuit({ changePercent: 4.4, currentPrice: 104.4, dayHigh: 104.4 })).toBeNull();
    expect(detectCircuit({ changePercent: 6, currentPrice: 100, dayHigh: 106 })).toBeNull();
  });

  test("emails holders once per symbol per day, again the next day", async () => {
    market.setPrice("RELIANCE", 1100, { previousClose: 1000, upperCircuit: 1100, lowerCircuit: 900 });
    freezeDate("2026-11-04T05:00:00Z");
    await runPriceAlerts();
    await runPriceAlerts();
    const circuitMails = () => nodemailer.sentMail.filter((m) => /Circuit/.test(m.subject));
    expect(circuitMails()).toHaveLength(1);
    expect(circuitMails()[0].subject).toMatch(/RELIANCE hit Upper Circuit/);

    freezeDate("2026-11-05T05:00:00Z");
    await runPriceAlerts();
    expect(circuitMails()).toHaveLength(2);
  });

  test("circuit alerts are de-duplicated per IST day, not UTC day", async () => {
    // 04:00 IST and 06:00 IST on the same Indian trading date (5 Nov)
    // fall on different UTC dates, so today the user gets two emails.
    market.setPrice("RELIANCE", 1100, { previousClose: 1000, upperCircuit: 1100, lowerCircuit: 900 });
    freezeDate("2026-11-04T22:30:00Z");
    await runPriceAlerts();
    freezeDate("2026-11-05T00:30:00Z");
    await runPriceAlerts();
    expect(nodemailer.sentMail.filter((m) => /Circuit/.test(m.subject))).toHaveLength(1);
  });
});
