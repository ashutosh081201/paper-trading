jest.mock("../marketData", () => require("./helpers/fakeMarket"));
const mongoose = require("mongoose");
const market = require("./helpers/fakeMarket");
const User = require("../models/User");
const Holding = require("../models/Holding");
const Watchlist = require("../models/Watchlist");
const Note = require("../models/Note");
const PriceAlert = require("../models/PriceAlert");
const LimitOrder = require("../models/LimitOrder");
const { createUser, authed } = require("./helpers/auth");

let alice;
let bob;
let A;
let B;
const missingId = () => new mongoose.Types.ObjectId().toString();

beforeEach(async () => {
  market.reset();
  market.setPrice("RELIANCE", 1000);
  market.setPrice("TCS", 2500);
  alice = await createUser({ name: "Alice" });
  bob = await createUser({ name: "Bob" });
  A = authed(alice.token);
  B = authed(bob.token);
});

describe("account", () => {
  test("summary shows funds and counts", async () => {
    await A.post("/api/orders/buy")
      .send({ symbol: "TCS", companyName: "TCS", quantity: 2, orderType: "delivery" })
      .expect(200);
    const res = await A.get("/api/account").expect(200);
    expect(res.body.user).toMatchObject({ name: "Alice", funds: 95000 });
    expect(res.body.stats).toEqual({
      holdingsCount: 1,
      positionsCount: 0,
      ordersCount: 1,
      transactionsCount: 1,
    });
  });

  test("add funds", async () => {
    const res = await A.post("/api/account/add-funds").send({ amount: 2500.5 }).expect(200);
    expect(res.body.message).toMatch(/added successfully/);
    expect(res.body.funds).toBe(102500.5);
  });

  test.each([[0], [-100], [undefined]])("add funds rejects %p", async (amount) => {
    await A.post("/api/account/add-funds").send({ amount }).expect(400);
  });

  test("add funds with a string amount adds the number, not concatenates", async () => {
    await A.post("/api/account/add-funds").send({ amount: "100" });
    // today: 100000 + "100" = "100000100" → ₹10,00,00,100
    expect((await User.findById(alice.id)).funds).toBe(100100);
  });

  test("add funds rejects non-numeric amounts with 400", async () => {
    await A.post("/api/account/add-funds").send({ amount: "lots" }).expect(400);
  });

  test("reset clears trading data and restores ₹1,00,000", async () => {
    await A.post("/api/orders/buy")
      .send({ symbol: "TCS", companyName: "TCS", quantity: 2, orderType: "delivery" })
      .expect(200);
    await A.post("/api/account/reset").expect(200);
    const res = await A.get("/api/account").expect(200);
    expect(res.body.user.funds).toBe(100000);
    expect(res.body.stats).toMatchObject({ holdingsCount: 0, ordersCount: 0 });
  });

  test("reset also cancels pending limit orders", async () => {
    await A.post("/api/limit-orders").send({
      symbol: "TCS", companyName: "TCS", orderType: "delivery",
      transactionType: "buy", limitType: "LIMIT_BUY", triggerPrice: 2000, quantity: 1,
    }).expect(201);
    await A.post("/api/account/reset").expect(200);
    expect(await LimitOrder.countDocuments({ userId: alice.id, status: "PENDING" })).toBe(0);
  });

  test("reset only affects the caller", async () => {
    await B.post("/api/orders/buy")
      .send({ symbol: "TCS", companyName: "TCS", quantity: 1, orderType: "delivery" })
      .expect(200);
    await A.post("/api/account/reset").expect(200);
    expect(await Holding.countDocuments({ userId: bob.id })).toBe(1);
  });

  test("delete removes the user and their trades; token stops working", async () => {
    await A.post("/api/orders/buy")
      .send({ symbol: "TCS", companyName: "TCS", quantity: 1, orderType: "delivery" })
      .expect(200);
    await A.delete("/api/account/delete").expect(200);
    expect(await User.findById(alice.id)).toBeNull();
    expect(await Holding.countDocuments({ userId: alice.id })).toBe(0);
    await A.get("/api/account").expect(404);
  });

  test("delete also removes watchlists, notes, alerts and limit orders", async () => {
    await A.get("/api/watchlist/all").expect(200); // creates default watchlist
    await A.post("/api/notes/TCS").send({ content: "hi" }).expect(201);
    await A.post("/api/alerts")
      .send({ symbol: "TCS", companyName: "TCS", targetPrice: 3000, condition: "above" })
      .expect(201);
    await A.delete("/api/account/delete").expect(200);
    const leftovers =
      (await Watchlist.countDocuments({ userId: alice.id })) +
      (await Note.countDocuments({ userId: alice.id })) +
      (await PriceAlert.countDocuments({ userId: alice.id }));
    expect(leftovers).toBe(0);
  });

  test("signup ignores extra fields like funds or isVerified (mass assignment)", async () => {
    const request = require("supertest");
    const app = require("../app");
    await request(app).post("/api/auth/signup").send({
      name: "Eve", email: "eve@example.test", password: "Secret123!", funds: 1e9, isVerified: true,
    }).expect(201);
    const eve = await User.findOne({ email: "eve@example.test" });
    expect(eve.funds).toBe(100000);
    expect(eve.isVerified).toBe(false);
  });
});

describe("watchlists", () => {
  const firstId = async (api) => (await api.get("/api/watchlist/all")).body.watchlists[0]._id;

  test("a default watchlist is created on first visit", async () => {
    const res = await A.get("/api/watchlist/all").expect(200);
    expect(res.body.watchlists).toEqual([
      expect.objectContaining({ name: "My Watchlist", count: 0, symbols: [] }),
    ]);
  });

  test("create, add with prices, remove, rename, delete", async () => {
    await firstId(A);
    const created = await A.post("/api/watchlist/create").send({ name: " Banks " }).expect(201);
    const id = created.body.watchlist._id;
    expect(created.body.watchlist.name).toBe("Banks");

    await A.post(`/api/watchlist/list/${id}/add`).send({ symbol: "tcs", companyName: "TCS" }).expect(200);
    const list = await A.get(`/api/watchlist/list/${id}`).expect(200);
    expect(list.body.watchlist[0]).toMatchObject({ symbol: "TCS", currentPrice: 2500 });

    await A.post(`/api/watchlist/list/${id}/add`).send({ symbol: "TCS", companyName: "TCS" }).expect(400);
    await A.delete(`/api/watchlist/list/${id}/remove/tcs`).expect(200);
    await A.delete(`/api/watchlist/list/${id}/remove/TCS`).expect(404);

    await A.patch(`/api/watchlist/rename/${id}`).send({ name: "PSU Banks" }).expect(200);
    expect((await Watchlist.findById(id)).name).toBe("PSU Banks");
    await A.delete(`/api/watchlist/delete/${id}`).expect(200);
  });

  test("a stock whose price fails still appears with zeros", async () => {
    const id = await firstId(A);
    await A.post(`/api/watchlist/list/${id}/add`).send({ symbol: "NOPRICE", companyName: "N" }).expect(200);
    const res = await A.get(`/api/watchlist/list/${id}`).expect(200);
    expect(res.body.watchlist[0]).toMatchObject({ symbol: "NOPRICE", currentPrice: 0 });
  });

  test("limits: 5 watchlists, 20 stocks, unique names, can't delete the last one", async () => {
    const id = await firstId(A);
    for (let i = 2; i <= 5; i++) {
      await A.post("/api/watchlist/create").send({ name: `L${i}` }).expect(201);
    }
    await A.post("/api/watchlist/create").send({ name: "L6" }).expect(400);
    await A.post("/api/watchlist/create").send({ name: "L2" }).expect(400);
    await A.post("/api/watchlist/create").send({ name: "  " }).expect(400);

    for (let i = 0; i < 20; i++) {
      await A.post(`/api/watchlist/list/${id}/add`).send({ symbol: `S${i}`, companyName: "x" }).expect(200);
    }
    await A.post(`/api/watchlist/list/${id}/add`).send({ symbol: "S20", companyName: "x" }).expect(400);

    const others = (await A.get("/api/watchlist/all")).body.watchlists.filter((w) => w._id !== id);
    for (const w of others) await A.delete(`/api/watchlist/delete/${w._id}`).expect(200);
    await A.delete(`/api/watchlist/delete/${id}`).expect(400);
  });

  test("renaming to an existing watchlist name is rejected", async () => {
    await firstId(A);
    const res = await A.post("/api/watchlist/create").send({ name: "Banks" }).expect(201);
    await A.patch(`/api/watchlist/rename/${res.body.watchlist._id}`).send({ name: "My Watchlist" }).expect(400);
  });

  test("another user can't read, change or delete my watchlist", async () => {
    const id = await firstId(A);
    await firstId(B);
    await B.post("/api/watchlist/create").send({ name: "Bob 2" }).expect(201); // so delete isn't blocked by "last one"
    await B.get(`/api/watchlist/list/${id}`).expect(404);
    await B.post(`/api/watchlist/list/${id}/add`).send({ symbol: "TCS", companyName: "x" }).expect(404);
    await B.delete(`/api/watchlist/list/${id}/remove/TCS`).expect(404);
    await B.patch(`/api/watchlist/rename/${id}`).send({ name: "pwned" }).expect(404);
    await B.delete(`/api/watchlist/delete/${id}`).expect(404);
    expect((await Watchlist.findById(id)).name).toBe("My Watchlist");
  });

  test("unknown id → 404", async () => {
    await A.get(`/api/watchlist/list/${missingId()}`).expect(404);
  });

  test("malformed id → 400, not 500", async () => {
    await A.get("/api/watchlist/list/not-an-id").expect(400);
  });

  test("non-string name → 400, not 500", async () => {
    await A.post("/api/watchlist/create").send({ name: { $gt: "" } }).expect(400);
  });

  test("legacy single-watchlist routes", async () => {
    await A.post("/api/watchlist/add").send({ symbol: "TCS", companyName: "TCS" }).expect(200);
    expect((await A.get("/api/watchlist/check/tcs").expect(200)).body.isInWatchlist).toBe(true);
    expect((await A.get("/api/watchlist").expect(200)).body.count).toBe(1);
    await A.post("/api/watchlist/add").send({ symbol: "TCS", companyName: "TCS" }).expect(400);
    await A.post("/api/watchlist/add").send({ symbol: "^NSEI", companyName: "NIFTY 50" }).expect(200);
    const dup = await A.post("/api/watchlist/add").send({ symbol: "^NSEI", companyName: "NIFTY 50" }).expect(400);
    expect(dup.body.message).toBe("NSEI is already in your watchlist"); // no "^" in messages
    await A.delete("/api/watchlist/remove/TCS").expect(200);
    await A.delete("/api/watchlist/remove/TCS").expect(404);
    expect((await B.get("/api/watchlist/check/TCS").expect(200)).body.isInWatchlist).toBe(false);
  });
});

describe("notes", () => {
  test("create, list (newest first), update, delete", async () => {
    await A.post("/api/notes/tcs").send({ content: "  first  ", companyName: "TCS" }).expect(201);
    const second = await A.post("/api/notes/TCS").send({ content: "second" }).expect(201);
    const list = await A.get("/api/notes/TCS").expect(200);
    expect(list.body.notes.map((n) => n.content)).toEqual(["second", "first"]);

    const id = second.body.note._id;
    const upd = await A.patch(`/api/notes/${id}`).send({ content: "edited" }).expect(200);
    expect(upd.body.note.content).toBe("edited");
    await A.delete(`/api/notes/${id}`).expect(200);
    await A.delete(`/api/notes/${id}`).expect(404);
  });

  test("validation: empty and over 500 characters", async () => {
    await A.post("/api/notes/TCS").send({ content: "   " }).expect(400);
    await A.post("/api/notes/TCS").send({ content: "x".repeat(501) }).expect(400);
    await A.post("/api/notes/TCS").send({ content: "x".repeat(500) }).expect(201);
  });

  test("editing a note can't bypass the 500-character limit", async () => {
    const { body } = await A.post("/api/notes/TCS").send({ content: "short" }).expect(201);
    await A.patch(`/api/notes/${body.note._id}`).send({ content: "x".repeat(600) }).expect(400);
  });

  test("update can't reassign the note to someone else (mass assignment)", async () => {
    const { body } = await A.post("/api/notes/TCS").send({ content: "mine" }).expect(201);
    await A.patch(`/api/notes/${body.note._id}`)
      .send({ content: "still mine", userId: bob.id, symbol: "INFY" })
      .expect(200);
    const note = await Note.findById(body.note._id);
    expect(note.userId.toString()).toBe(alice.id);
    expect(note.symbol).toBe("TCS");
  });

  test("another user can't see, edit or delete my notes", async () => {
    const { body } = await A.post("/api/notes/TCS").send({ content: "secret" }).expect(201);
    expect((await B.get("/api/notes/TCS").expect(200)).body.notes).toEqual([]);
    await B.patch(`/api/notes/${body.note._id}`).send({ content: "hacked" }).expect(404);
    await B.delete(`/api/notes/${body.note._id}`).expect(404);
    expect((await Note.findById(body.note._id)).content).toBe("secret");
  });

  test("malformed note id → 400, not 500", async () => {
    await A.delete("/api/notes/123").expect(400);
  });
});

describe("price alerts", () => {
  const alert = { symbol: "TCS", companyName: "TCS", targetPrice: 3000, condition: "above" };

  test("create, list, update in place, delete", async () => {
    await A.post("/api/alerts").send(alert).expect(201);
    const upd = await A.post("/api/alerts").send({ ...alert, targetPrice: 2000, condition: "below" }).expect(200);
    expect(upd.body.alert).toMatchObject({ targetPrice: 2000, condition: "below" });
    const list = await A.get("/api/alerts").expect(200);
    expect(list.body.alerts).toHaveLength(1);
    await A.delete(`/api/alerts/${list.body.alerts[0]._id}`).expect(200);
    await A.delete(`/api/alerts/${list.body.alerts[0]._id}`).expect(404);
  });

  test("missing fields → 400", async () => {
    await A.post("/api/alerts").send({ symbol: "TCS" }).expect(400);
  });

  test("invalid condition → 400, not 500", async () => {
    await A.post("/api/alerts").send({ ...alert, condition: "sideways" }).expect(400);
  });

  test("negative target price → 400", async () => {
    await A.post("/api/alerts").send({ ...alert, targetPrice: -5 }).expect(400);
  });

  test("another user can't see or delete my alert", async () => {
    const { body } = await A.post("/api/alerts").send(alert).expect(201);
    expect((await B.get("/api/alerts").expect(200)).body.alerts).toEqual([]);
    await B.delete(`/api/alerts/${body.alert._id}`).expect(404);
  });

  test("malformed alert id → 400, not 500", async () => {
    await A.delete("/api/alerts/xyz").expect(400);
  });
});

describe("limit orders", () => {
  const base = {
    symbol: "TCS", companyName: "TCS", orderType: "delivery",
    transactionType: "buy", limitType: "LIMIT_BUY", triggerPrice: 2000, quantity: 5,
  };

  test("LIMIT_BUY checks funds at the trigger price", async () => {
    await A.post("/api/limit-orders").send(base).expect(201);
    await A.post("/api/limit-orders").send({ ...base, quantity: 51 }).expect(400); // 1,02,000
    await A.post("/api/limit-orders")
      .send({ ...base, orderType: "intraday", quantity: 250 }) // 5,00,000 / 5
      .expect(201);
  });

  test("STOP_LOSS needs enough shares in holdings", async () => {
    const sl = { ...base, transactionType: "sell", limitType: "STOP_LOSS", triggerPrice: 900, symbol: "RELIANCE" };
    await A.post("/api/limit-orders").send(sl).expect(400);
    await A.post("/api/orders/buy")
      .send({ symbol: "RELIANCE", companyName: "R", quantity: 3, orderType: "delivery" })
      .expect(200);
    await A.post("/api/limit-orders").send(sl).expect(400); // wants 5, owns 3
    await A.post("/api/limit-orders").send({ ...sl, quantity: 3 }).expect(201);
  });

  test("validation: missing fields, zero price", async () => {
    await A.post("/api/limit-orders").send({ symbol: "TCS" }).expect(400);
    await A.post("/api/limit-orders").send({ ...base, triggerPrice: -1 }).expect(400);
  });

  test("invalid limit type → 400, not 500", async () => {
    await A.post("/api/limit-orders").send({ ...base, limitType: "TRAILING" }).expect(400);
  });

  test("client can't create an order that's already EXECUTED (mass assignment)", async () => {
    const res = await A.post("/api/limit-orders")
      .send({ ...base, status: "EXECUTED", userId: bob.id })
      .expect(201);
    expect(res.body.limitOrder.status).toBe("PENDING");
    expect(res.body.limitOrder.userId).toBe(alice.id);
  });

  test("list pending / all, cancel once, scoping", async () => {
    const { body } = await A.post("/api/limit-orders").send(base).expect(201);
    const id = body.limitOrder._id;
    expect((await A.get("/api/limit-orders/pending").expect(200)).body.orders).toHaveLength(1);
    expect((await B.get("/api/limit-orders/pending").expect(200)).body.orders).toHaveLength(0);
    await B.delete(`/api/limit-orders/${id}`).expect(404);
    await A.delete(`/api/limit-orders/${id}`).expect(200);
    await A.delete(`/api/limit-orders/${id}`).expect(400);
    const all = await A.get("/api/limit-orders").expect(200);
    expect(all.body.limitOrders[0].status).toBe("CANCELLED");
  });

  test("malformed limit order id → 400, not 500", async () => {
    await A.delete("/api/limit-orders/bad").expect(400);
  });
});
