// Technical indicators used by the candlestick chart. Input candles are
// { time, open, high, low, close, volume } sorted oldest first.

export const calculateSMA = (data, period) => {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data
      .slice(i - period + 1, i + 1)
      .reduce((acc, d) => acc + d.close, 0);
    result.push({
      time: data[i].time,
      value: parseFloat((sum / period).toFixed(2)),
    });
  }
  return result;
};

export const calculateEMA = (data, period) => {
  if (data.length < period) return [];
  const result = [];
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((acc, d) => acc + d.close, 0) / period;
  result.push({
    time: data[period - 1].time,
    value: parseFloat(ema.toFixed(2)),
  });
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: parseFloat(ema.toFixed(2)) });
  }
  return result;
};

export const calculateRSI = (data, period = 14) => {
  if (data.length < period + 1) return [];
  const result = [];
  const changes = [];
  for (let i = 1; i < data.length; i++)
    changes.push(data[i].close - data[i - 1].close);
  let avgGain =
    changes
      .slice(0, period)
      .filter((c) => c > 0)
      .reduce((a, b) => a + b, 0) / period;
  let avgLoss =
    changes
      .slice(0, period)
      .filter((c) => c < 0)
      .reduce((a, b) => a + Math.abs(b), 0) / period;
  // No losses in the window → RSI is exactly 100
  const rsi = (gain, loss) =>
    loss === 0 ? 100 : parseFloat((100 - 100 / (1 + gain / loss)).toFixed(2));
  result.push({ time: data[period].time, value: rsi(avgGain, avgLoss) });
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push({ time: data[i + 1].time, value: rsi(avgGain, avgLoss) });
  }
  return result;
};

export const calculateBollingerBands = (data, period = 20, multiplier = 2) => {
  if (data.length < period) return { upper: [], middle: [], lower: [] };
  const upper = [],
    middle = [],
    lower = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((acc, d) => acc + d.close, 0) / period;
    const variance =
      slice.reduce((acc, d) => acc + Math.pow(d.close - avg, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    middle.push({ time: data[i].time, value: parseFloat(avg.toFixed(2)) });
    upper.push({
      time: data[i].time,
      value: parseFloat((avg + multiplier * stdDev).toFixed(2)),
    });
    lower.push({
      time: data[i].time,
      value: parseFloat((avg - multiplier * stdDev).toFixed(2)),
    });
  }
  return { upper, middle, lower };
};

export const calculateMACD = (
  data,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
) => {
  if (data.length < slowPeriod + signalPeriod)
    return { macd: [], signal: [], histogram: [] };
  const fastMultiplier = 2 / (fastPeriod + 1);
  const slowMultiplier = 2 / (slowPeriod + 1);
  let fastEMA =
    data.slice(0, fastPeriod).reduce((acc, d) => acc + d.close, 0) / fastPeriod;
  let slowEMA =
    data.slice(0, slowPeriod).reduce((acc, d) => acc + d.close, 0) / slowPeriod;
  const macdValues = [];
  for (let i = slowPeriod; i < data.length; i++) {
    fastEMA = (data[i].close - fastEMA) * fastMultiplier + fastEMA;
    slowEMA = (data[i].close - slowEMA) * slowMultiplier + slowEMA;
    macdValues.push({
      time: data[i].time,
      value: parseFloat((fastEMA - slowEMA).toFixed(4)),
    });
  }
  if (macdValues.length < signalPeriod)
    return { macd: [], signal: [], histogram: [] };
  const signalMultiplier = 2 / (signalPeriod + 1);
  let signalEMA =
    macdValues.slice(0, signalPeriod).reduce((acc, d) => acc + d.value, 0) /
    signalPeriod;
  const macdLine = [],
    signalLine = [],
    histogramLine = [];
  signalLine.push({
    time: macdValues[signalPeriod - 1].time,
    value: parseFloat(signalEMA.toFixed(4)),
  });
  macdLine.push(macdValues[signalPeriod - 1]);
  histogramLine.push({
    time: macdValues[signalPeriod - 1].time,
    value: parseFloat(
      (macdValues[signalPeriod - 1].value - signalEMA).toFixed(4),
    ),
    color:
      macdValues[signalPeriod - 1].value - signalEMA >= 0
        ? "rgba(34, 197, 94, 0.7)"
        : "rgba(239, 68, 68, 0.7)",
  });
  for (let i = signalPeriod; i < macdValues.length; i++) {
    signalEMA =
      (macdValues[i].value - signalEMA) * signalMultiplier + signalEMA;
    const hist = parseFloat((macdValues[i].value - signalEMA).toFixed(4));
    macdLine.push(macdValues[i]);
    signalLine.push({
      time: macdValues[i].time,
      value: parseFloat(signalEMA.toFixed(4)),
    });
    histogramLine.push({
      time: macdValues[i].time,
      value: hist,
      color: hist >= 0 ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.7)",
    });
  }
  return { macd: macdLine, signal: signalLine, histogram: histogramLine };
};

export const calculateStochastic = (data, kPeriod = 14, dPeriod = 3, smooth = 3) => {
  if (data.length < kPeriod + dPeriod) return { kLine: [], dLine: [] };
  const rawK = [];
  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const lowestLow = Math.min(...slice.map((d) => d.low));
    const highestHigh = Math.max(...slice.map((d) => d.high));
    const range = highestHigh - lowestLow;
    const k = range === 0 ? 50 : ((data[i].close - lowestLow) / range) * 100;
    rawK.push({ time: data[i].time, value: parseFloat(k.toFixed(2)) });
  }
  const smoothedK = [];
  for (let i = smooth - 1; i < rawK.length; i++) {
    const avg =
      rawK.slice(i - smooth + 1, i + 1).reduce((acc, d) => acc + d.value, 0) /
      smooth;
    smoothedK.push({ time: rawK[i].time, value: parseFloat(avg.toFixed(2)) });
  }
  const dLine = [];
  for (let i = dPeriod - 1; i < smoothedK.length; i++) {
    const avg =
      smoothedK
        .slice(i - dPeriod + 1, i + 1)
        .reduce((acc, d) => acc + d.value, 0) / dPeriod;
    dLine.push({ time: smoothedK[i].time, value: parseFloat(avg.toFixed(2)) });
  }
  const dTimes = new Set(dLine.map((d) => d.time));
  const kLine = smoothedK.filter((d) => dTimes.has(d.time));
  return { kLine, dLine };
};

export const calculateOBV = (data) => {
  if (data.length < 2) return [];
  const result = [];
  let obv = 0;
  result.push({ time: data[0].time, value: 0 });
  for (let i = 1; i < data.length; i++) {
    if (data[i].close > data[i - 1].close) obv += data[i].volume;
    else if (data[i].close < data[i - 1].close) obv -= data[i].volume;
    result.push({ time: data[i].time, value: obv });
  }
  return result;
};

export const formatOBV = (value) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
};
