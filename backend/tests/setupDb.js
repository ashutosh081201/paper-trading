// Each test file gets its own in-memory MongoDB; collections are wiped
// between tests.
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  require("nodemailer").sentMail.length = 0;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
