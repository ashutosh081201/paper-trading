import { describe, expect, test } from "vitest";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  calculateMACD,
  calculateOBV,
  formatOBV,
} from "./indicators";

const candles = (closes, volumes = []) =>
  closes.map((close, i) => ({ time: i, close, volume: volumes[i] ?? 100 }));

describe("moving averages", () => {
  test("SMA averages each window", () => {
    expect(calculateSMA(candles([1, 2, 3, 4, 5]), 3)).toEqual([
      { time: 2, value: 2 },
      { time: 3, value: 3 },
      { time: 4, value: 4 },
    ]);
  });

  test("EMA is seeded with the SMA, then weights recent prices", () => {
    const ema = calculateEMA(candles([10, 10, 10, 20]), 3);
    expect(ema[0]).toEqual({ time: 2, value: 10 });
    expect(ema[1]).toEqual({ time: 3, value: 15 }); // multiplier 2/(3+1)
  });

  test("EMA on fewer candles than the period returns no points instead of crashing", () => {
    expect(calculateEMA(candles([1, 2]), 9)).toEqual([]);
  });
});

describe("RSI", () => {
  test("is 50 for alternating equal moves", () => {
    const closes = [100];
    for (let i = 0; i < 20; i++) closes.push(closes.at(-1) + (i % 2 ? -1 : 1));
    const rsi = calculateRSI(candles(closes), 14);
    expect(rsi[0].value).toBe(50);
  });

  test("needs period + 1 candles", () => {
    expect(calculateRSI(candles([1, 2, 3]), 14)).toEqual([]);
  });

  test("only gains → RSI is exactly 100", () => {
    const rsi = calculateRSI(candles(Array.from({ length: 16 }, (_, i) => 100 + i)), 14);
    expect(rsi[0].value).toBe(100); // today 99.01 (rs is capped at 100)
  });
});

describe("Bollinger bands and MACD", () => {
  test("flat prices give bands equal to the average", () => {
    const { upper, middle, lower } = calculateBollingerBands(candles(Array(20).fill(50)), 20);
    expect([upper[0].value, middle[0].value, lower[0].value]).toEqual([50, 50, 50]);
  });

  test("bands are ±2 standard deviations", () => {
    const { upper, lower } = calculateBollingerBands(candles([1, 3]), 2);
    expect(upper[0].value).toBe(4); // mean 2, sd 1
    expect(lower[0].value).toBe(0);
  });

  test("MACD needs slow + signal periods of data", () => {
    expect(calculateMACD(candles(Array(30).fill(1))).macd).toEqual([]);
    const out = calculateMACD(candles(Array.from({ length: 60 }, (_, i) => 100 + i)));
    expect(out.macd.length).toBeGreaterThan(0);
    expect(out.macd.at(-1).value).toBeGreaterThan(0); // rising prices
  });
});

describe("OBV", () => {
  test("adds volume on up days and subtracts on down days", () => {
    const obv = calculateOBV(candles([10, 11, 10, 10], [5, 7, 3, 9]));
    expect(obv.map((p) => p.value)).toEqual([0, 7, 4, 4]);
  });

  test("formats large values", () => {
    expect(formatOBV(2_500_000)).toMatch(/2\.5/);
    expect(formatOBV(-1500)).toMatch(/-1\.5/);
  });
});
