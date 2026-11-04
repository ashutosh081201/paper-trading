import { beforeEach, describe, expect, test, vi } from "vitest";

// A fake socket.io client we can connect and push events through
const fake = vi.hoisted(() => {
  const handlers = {};
  const socket = {
    connected: false,
    id: "sock-1",
    emitted: [],
    on: (event, fn) => { (handlers[event] ||= []).push(fn); },
    emit: (...args) => socket.emitted.push(args),
    disconnect: vi.fn(),
    fire: (event, ...args) => (handlers[event] || []).forEach((fn) => fn(...args)),
    reset: () => {
      for (const k of Object.keys(handlers)) delete handlers[k];
      socket.connected = false;
      socket.emitted = [];
    },
  };
  return socket;
});
vi.mock("socket.io-client", () => ({ io: vi.fn(() => fake) }));

import {
  connectSocket,
  disconnectSocket,
  subscribeToSymbols,
  unsubscribeFromSymbols,
  onPriceUpdate,
} from "./socket";

beforeEach(() => {
  disconnectSocket();
  fake.reset();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

const connect = () => {
  connectSocket("token");
  fake.connected = true;
  fake.fire("connect");
};

describe("socket service", () => {
  test("subscriptions made before the socket connects are sent on connect", () => {
    connectSocket("token");
    subscribeToSymbols(["RELIANCE"]);
    expect(fake.emitted).toEqual([]);
    fake.connected = true;
    fake.fire("connect");
    expect(fake.emitted).toEqual([["subscribe", ["RELIANCE"]]]);
  });

  test("re-subscribes after a reconnect", () => {
    connect();
    subscribeToSymbols(["TCS"]);
    fake.emitted = [];
    fake.fire("connect");
    expect(fake.emitted).toEqual([["subscribe", ["TCS"]]]);
  });

  test("unsubscribed symbols aren't re-sent", () => {
    connect();
    subscribeToSymbols(["TCS", "INFY"]);
    unsubscribeFromSymbols(["TCS"]);
    fake.emitted = [];
    fake.fire("connect");
    expect(fake.emitted).toEqual([["subscribe", ["INFY"]]]);
  });

  test("price listeners registered before connecting receive updates; cleanup stops them", () => {
    const seen = [];
    const stop = onPriceUpdate((u) => seen.push(u));
    connect();
    fake.fire("priceUpdate", { TCS: { currentPrice: 1 } });
    stop();
    fake.fire("priceUpdate", { TCS: { currentPrice: 2 } });
    expect(seen).toEqual([{ TCS: { currentPrice: 1 } }]);
  });

  test("logout clears subscriptions", () => {
    connect();
    subscribeToSymbols(["TCS"]);
    disconnectSocket();
    fake.reset();
    connect();
    expect(fake.emitted).toEqual([]);
  });
});
