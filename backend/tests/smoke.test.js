jest.mock("../marketData", () => require("./helpers/fakeMarket"));
const request = require("supertest");
const app = require("../app");
const { createUser } = require("./helpers/auth");

test("health route responds", async () => {
  const res = await request(app).get("/").expect(200);
  expect(res.body.message).toMatch(/running/);
});

test("signup → verify → login gives a working token", async () => {
  const user = await createUser();
  const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${user.token}`).expect(200);
  expect(me.body.user.email).toBe(user.email);
  expect(me.body.user.password).toBeUndefined();
});

test("outbound network is blocked", () => {
  expect(() => require("https").request("https://api.upstox.com/")).toThrow(/Blocked/);
});
