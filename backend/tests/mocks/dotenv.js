// Tests must never read the real .env file.
module.exports = { config: () => ({ parsed: {} }) };
