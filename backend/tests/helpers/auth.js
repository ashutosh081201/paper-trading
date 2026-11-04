// Drives the real signup → OTP email → verify → login flow over HTTP.
const request = require("supertest");
const app = require("../../app");
const { sentMail } = require("nodemailer");

let counter = 0;

const lastOtpFor = (email) => {
  const mail = [...sentMail].reverse().find((m) => m.to === email);
  if (!mail) throw new Error(`No email sent to ${email}`);
  return mail.html.match(/letter-spacing:12px;">(\d{6})</)[1];
};

const createUser = async (overrides = {}) => {
  counter += 1;
  const user = {
    name: overrides.name || `Trader ${counter}`,
    email: overrides.email || `trader${counter}@example.test`,
    password: overrides.password || "Secret123!",
  };
  await request(app).post("/api/auth/signup").send(user).expect(201);
  await request(app)
    .post("/api/auth/verify-otp")
    .send({ email: user.email, otp: lastOtpFor(user.email) })
    .expect(200);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: user.password })
    .expect(200);
  return { ...user, id: res.body.user.id, token: res.body.token };
};

const authed = (token) => ({
  get: (url) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  post: (url) => request(app).post(url).set("Authorization", `Bearer ${token}`),
  patch: (url) => request(app).patch(url).set("Authorization", `Bearer ${token}`),
  delete: (url) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
});

module.exports = { createUser, authed, lastOtpFor };
