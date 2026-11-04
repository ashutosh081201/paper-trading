// The trading day follows India time (IST, UTC+5:30), whatever the server's
// timezone is.
const IST_OFFSET_MS = 330 * 60 * 1000;

const istDate = (date = new Date()) =>
  new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

module.exports = { istDate };
