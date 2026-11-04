// Freezes Date only. Real timers keep running so MongoDB and Supertest work.
const freezeDate = (iso) => {
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: [
      "hrtime",
      "nextTick",
      "performance",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "setImmediate",
      "clearImmediate",
      "setInterval",
      "clearInterval",
      "setTimeout",
      "clearTimeout",
    ],
  });
};

const unfreezeDate = () => jest.useRealTimers();

module.exports = { freezeDate, unfreezeDate };
