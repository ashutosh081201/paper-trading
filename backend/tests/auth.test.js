jest.mock("../marketData", () => require("./helpers/fakeMarket"));
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const User = require("../models/User");
const OTP = require("../models/OTP");
const nodemailer = require("nodemailer");
const { createUser, lastOtpFor } = require("./helpers/auth");
const { freezeDate, unfreezeDate } = require("./helpers/clock");

afterEach(() => unfreezeDate());

const signup = (body) => request(app).post("/api/auth/signup").send(body);
const login = (body) => request(app).post("/api/auth/login").send(body);
const me = (token) =>
  request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

describe("signup and email verification", () => {
  const body = { name: "Asha", email: "asha@example.test", password: "Secret123!" };

  test("creates an unverified user, hashes the password and emails an OTP", async () => {
    const res = await signup(body).expect(201);
    expect(res.body.email).toBe(body.email);

    const user = await User.findOne({ email: body.email });
    expect(user.isVerified).toBe(false);
    expect(user.password).not.toBe(body.password);
    expect(user.funds).toBe(100000);

    expect(nodemailer.sentMail).toHaveLength(1);
    expect(nodemailer.sentMail[0].subject).toMatch(/Verify/);
    expect(lastOtpFor(body.email)).toMatch(/^\d{6}$/);
  });

  test.each([
    [{ email: "a@b.test", password: "x" }],
    [{ name: "A", password: "x" }],
    [{ name: "A", email: "a@b.test" }],
  ])("rejects missing fields %#", async (partial) => {
    await signup(partial).expect(400);
  });

  test("rejects a duplicate verified email", async () => {
    await createUser({ email: body.email });
    const res = await signup(body).expect(400);
    expect(res.body.message).toMatch(/already registered/);
  });

  test("cannot log in before verifying", async () => {
    await signup(body).expect(201);
    const res = await login(body).expect(400);
    expect(res.body.message).toMatch(/verify your email/);
  });

  test("wrong OTP is rejected and the user stays unverified", async () => {
    await signup(body).expect(201);
    await request(app)
      .post("/api/auth/verify-otp")
      .send({ email: body.email, otp: "000000" })
      .expect(400);
    expect((await User.findOne({ email: body.email })).isVerified).toBe(false);
  });

  test("OTP expires after 10 minutes", async () => {
    freezeDate("2026-11-04T10:00:00Z");
    await signup(body).expect(201);
    const otp = lastOtpFor(body.email);

    freezeDate("2026-11-04T10:10:01Z");
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email: body.email, otp })
      .expect(400);
    expect(res.body.message).toMatch(/expired/);
  });

  test("OTP still works just before 10 minutes", async () => {
    freezeDate("2026-11-04T10:00:00Z");
    await signup(body).expect(201);
    const otp = lastOtpFor(body.email);
    freezeDate("2026-11-04T10:09:59Z");
    await request(app)
      .post("/api/auth/verify-otp")
      .send({ email: body.email, otp })
      .expect(200);
  });

  test("an unverified user whose OTP expired can sign up again to get a new code", async () => {
    await signup(body).expect(201);
    await OTP.deleteMany({}); // OTP expired and was cleaned up
    // The verify page tells the user to "signup again", but signup refuses.
    await signup(body).expect(201);
  });

  test("OTP guessing is limited (locks after 5 wrong attempts)", async () => {
    await signup(body).expect(201);
    const otp = lastOtpFor(body.email);
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/auth/verify-otp")
        .send({ email: body.email, otp: "111111" === otp ? "222222" : "111111" });
    }
    // After 5 failures even the right code must not work, or a 6-digit code
    // can be brute-forced within its 10-minute window.
    await request(app)
      .post("/api/auth/verify-otp")
      .send({ email: body.email, otp })
      .expect(400);
  });

  test("if the OTP email fails to send, the account is not left half-created", async () => {
    nodemailer.failNextSend();
    await signup(body).expect(502);
    // Retrying must be possible; today the user row blocks it.
    await signup(body).expect(201);
  });
});

describe("login and tokens", () => {
  test("logs in with correct credentials and returns a JWT", async () => {
    const user = await createUser();
    const decoded = jwt.verify(user.token, process.env.TOKEN_KEY);
    expect(decoded.id).toBe(user.id);
    const res = await me(user.token).expect(200);
    expect(res.body.user.password).toBeUndefined();
  });

  test("email is case-insensitive at login", async () => {
    const user = await createUser({ email: "mixed@example.test" });
    await login({ email: "MIXED@Example.TEST", password: user.password }).expect(200);
  });

  test("wrong password and unknown email give the same message", async () => {
    const user = await createUser();
    const a = await login({ email: user.email, password: "nope" }).expect(400);
    const b = await login({ email: "ghost@example.test", password: "nope" }).expect(400);
    expect(a.body.message).toBe(b.body.message);
  });

  test("missing credentials → 400", async () => {
    await login({}).expect(400);
  });

  test("no token → 401", async () => {
    await request(app).get("/api/auth/me").expect(401);
  });

  test("malformed Authorization header → 401", async () => {
    await request(app).get("/api/auth/me").set("Authorization", "Token abc").expect(401);
    await me("not-a-jwt").expect(401);
  });

  test("token signed with another key (forged) → 401", async () => {
    const user = await createUser();
    const forged = jwt.sign({ id: user.id }, "attacker-key");
    await me(forged).expect(401);
  });

  test("unsigned alg=none token → 401", async () => {
    const user = await createUser();
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ id: user.id })).toString("base64url");
    await me(`${header}.${payload}.`).expect(401);
  });

  test("token expires after 24 hours", async () => {
    freezeDate("2026-11-04T10:00:00Z");
    const user = await createUser();
    freezeDate("2026-11-05T09:59:00Z");
    await me(user.token).expect(200);
    freezeDate("2026-11-05T10:00:01Z");
    await me(user.token).expect(401);
  });

  test("token of a deleted user → 404 on /me", async () => {
    const user = await createUser();
    await User.deleteOne({ email: user.email });
    await me(user.token).expect(404);
  });

  test("logout responds OK", async () => {
    const user = await createUser();
    await request(app)
      .get("/api/auth/logout")
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);
  });
});

describe("password reset", () => {
  const forgot = (email) => request(app).post("/api/auth/forgot-password").send({ email });
  const reset = (body) => request(app).post("/api/auth/reset-password").send(body);

  test("full reset flow: new password works, old one doesn't", async () => {
    const user = await createUser();
    await forgot(user.email).expect(200);
    const otp = lastOtpFor(user.email);
    expect(nodemailer.sentMail.at(-1).subject).toMatch(/Reset/);

    await reset({ email: user.email, otp, newPassword: "NewPass456!" }).expect(200);
    await login({ email: user.email, password: user.password }).expect(400);
    await login({ email: user.email, password: "NewPass456!" }).expect(200);

    // OTP is single-use
    await reset({ email: user.email, otp, newPassword: "Again789!" }).expect(400);
  });

  test("requires email", async () => {
    await forgot(undefined).expect(400);
  });

  test("unknown email → 400", async () => {
    await forgot("ghost@example.test").expect(400);
  });

  test("wrong OTP → 400 and password unchanged", async () => {
    const user = await createUser();
    await forgot(user.email).expect(200);
    await reset({ email: user.email, otp: "000000", newPassword: "x" }).expect(400);
    await login({ email: user.email, password: user.password }).expect(200);
  });

  test("expired reset OTP → 400", async () => {
    freezeDate("2026-11-04T10:00:00Z");
    const user = await createUser();
    await forgot(user.email).expect(200);
    const otp = lastOtpFor(user.email);
    freezeDate("2026-11-04T10:11:00Z");
    const res = await reset({ email: user.email, otp, newPassword: "x" }).expect(400);
    expect(res.body.message).toMatch(/expired/);
  });

  test("a verify OTP can't be used to reset a password", async () => {
    await signup({ name: "B", email: "b@example.test", password: "Secret123!" }).expect(201);
    const otp = lastOtpFor("b@example.test");
    await reset({ email: "b@example.test", otp, newPassword: "x" }).expect(400);
  });

  test("missing fields → 400", async () => {
    await reset({ email: "a@b.test" }).expect(400);
  });
});

describe("abuse protection", () => {
  test("reset codes also lock after 5 wrong guesses", async () => {
    const user = await createUser();
    await request(app).post("/api/auth/forgot-password").send({ email: user.email }).expect(200);
    const otp = lastOtpFor(user.email);
    const wrong = otp === "111111" ? "222222" : "111111";
    for (let i = 0; i < 4; i++) {
      await request(app).post("/api/auth/reset-password")
        .send({ email: user.email, otp: wrong, newPassword: "x" }).expect(400);
    }
    await request(app).post("/api/auth/reset-password")
      .send({ email: user.email, otp: wrong, newPassword: "x" }).expect(429);
    await request(app).post("/api/auth/reset-password")
      .send({ email: user.email, otp, newPassword: "Hacked1!" }).expect(400);
    await login({ email: user.email, password: user.password }).expect(200);
  });

  test("objects in auth fields are rejected (no query operators reach MongoDB)", async () => {
    await createUser();
    await login({ email: { $ne: null }, password: "x" }).expect(400);
    await request(app).post("/api/auth/forgot-password").send({ email: { $gt: "" } }).expect(400);
  });

  test("rate limiter returns 429 after the limit", async () => {
    const express = require("express");
    const { createAuthLimiter } = require("../middlewares/rateLimit");
    const tiny = express().post("/x", createAuthLimiter({ max: 2 }), (req, res) => res.send("ok"));
    await request(tiny).post("/x").expect(200);
    await request(tiny).post("/x").expect(200);
    const res = await request(tiny).post("/x").expect(429);
    expect(res.body.message).toMatch(/Too many attempts/);
  });
});
