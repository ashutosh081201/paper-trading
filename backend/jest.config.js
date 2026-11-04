module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupDb.js"],
  // Never load the real .env, never send real email, never call Gemini
  moduleNameMapper: {
    "^dotenv$": "<rootDir>/tests/mocks/dotenv.js",
    "^nodemailer$": "<rootDir>/tests/mocks/nodemailer.js",
    "^@google/generative-ai$": "<rootDir>/tests/mocks/generativeAi.js",
  },
  collectCoverageFrom: [
    "app.js",
    "controllers/**/*.js",
    "helpers/**/*.js",
    "middlewares/**/*.js",
    "models/**/*.js",
    "routes/**/*.js",
    "services/**/*.js",
    "marketData/**/*.js",
  ],
  testTimeout: 30000,
};
