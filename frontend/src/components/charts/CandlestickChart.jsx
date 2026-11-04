import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";
import { getHistoricalData } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  calculateMACD,
  calculateStochastic,
  calculateOBV,
  formatOBV,
} from "../../utils/indicators";

const TIME_FILTERS = [
  { label: "1D", interval: "5m", range: "1d" },
  { label: "1W", interval: "15m", range: "5d" },
  { label: "1M", interval: "1d", range: "1mo" },
  { label: "3M", interval: "1d", range: "3mo" },
  { label: "6M", interval: "1d", range: "6mo" },
  { label: "1Y", interval: "1d", range: "1y" },
  { label: "5Y", interval: "1wk", range: "5y" },
  { label: "All", interval: "1mo", range: "10y" },
];

const MA_OPTIONS = [
  { label: "EMA 9", type: "ema", period: 9, color: "#f97316" },
  { label: "SMA 20", type: "sma", period: 20, color: "#60a5fa" },
  { label: "SMA 50", type: "sma", period: 50, color: "#a78bfa" },
];

const getColors = (isDark) => ({
  background: isDark ? "#111827" : "#ffffff",
  text: isDark ? "#9ca3af" : "#374151",
  grid: isDark ? "#1f2937" : "#f3f4f6",
  border: isDark ? "#374151" : "#e5e7eb",
  upColor: "#22c55e",
  downColor: "#ef4444",
  wickUpColor: "#22c55e",
  wickDownColor: "#ef4444",
  volumeUp: "rgba(34, 197, 94, 0.4)",
  volumeDown: "rgba(239, 68, 68, 0.4)",
  rsiLine: "#e879f9",
  rsiOverboughtLine: "#ef4444",
  rsiOversoldLine: "#22c55e",
  bbUpper: "#38bdf8",
  bbMiddle: "#94a3b8",
  bbLower: "#38bdf8",
  macdLine: "#60a5fa",
  signalLine: "#f97316",
  stochK: "#34d399",
  stochD: "#f43f5e",
  obvLine: "#fbbf24",
});

// Helper: get responsive heights
const getChartHeight = () => (window.innerWidth < 640 ? 260 : 420);
const getIndicatorHeight = () => (window.innerWidth < 640 ? 100 : 150);

const CandlestickChart = ({ symbol }) => {
  const { darkMode } = useTheme();

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const maSeriesRefs = useRef({});
  const bbUpperRef = useRef(null);
  const bbMiddleRef = useRef(null);
  const bbLowerRef = useRef(null);

  const rsiContainerRef = useRef(null);
  const rsiChartRef = useRef(null);
  const rsiSeriesRef = useRef(null);
  const rsiOverboughtRef = useRef(null);
  const rsiOversoldRef = useRef(null);

  const macdContainerRef = useRef(null);
  const macdChartRef = useRef(null);
  const macdLineRef = useRef(null);
  const macdSignalRef = useRef(null);
  const macdHistogramRef = useRef(null);

  const stochContainerRef = useRef(null);
  const stochChartRef = useRef(null);
  const stochKRef = useRef(null);
  const stochDRef = useRef(null);
  const stochOverboughtRef = useRef(null);
  const stochOversoldRef = useRef(null);

  const obvContainerRef = useRef(null);
  const obvChartRef = useRef(null);
  const obvSeriesRef = useRef(null);

  const syncingRef = useRef(false);
  const activeFilterRef = useRef("1M");
  const candleDataRef = useRef([]);
  const barSpacingRef = useRef(12);

  const [activeFilter, setActiveFilter] = useState("1M");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ohlcv, setOhlcv] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeMAs, setActiveMAs] = useState([]);
  const [showRSI, setShowRSI] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showStoch, setShowStoch] = useState(false);
  const [showOBV, setShowOBV] = useState(false);
  const [rsiValue, setRsiValue] = useState(null);
  const [macdValues, setMacdValues] = useState(null);
  const [stochValues, setStochValues] = useState(null);
  const [obvValue, setObvValue] = useState(null);
  const [maWarning, setMaWarning] = useState("");
  const [macdWarning, setMacdWarning] = useState("");
  const [stochWarning, setStochWarning] = useState("");
  const [bbWarning, setBbWarning] = useState("");

  useEffect(() => {
    activeFilterRef.current = activeFilter;
  }, [activeFilter]);

  const reapplyBarSpacing = () => {
    if (!chartRef.current) return;
    try {
      chartRef.current
        .timeScale()
        .applyOptions({ barSpacing: barSpacingRef.current });
    } catch {
  // the indicator chart may already have been removed
}
  };

  const syncAllToMain = () => {
    if (!chartRef.current) return;
    try {
      const range = chartRef.current.timeScale().getVisibleRange();
      if (!range) return;
      syncingRef.current = true;
      if (rsiChartRef.current)
        try {
          rsiChartRef.current.timeScale().setVisibleRange(range);
        } catch {
  // the indicator chart may already have been removed
}
      if (macdChartRef.current)
        try {
          macdChartRef.current.timeScale().setVisibleRange(range);
        } catch {
  // the indicator chart may already have been removed
}
      if (stochChartRef.current)
        try {
          stochChartRef.current.timeScale().setVisibleRange(range);
        } catch {
  // the indicator chart may already have been removed
}
      if (obvChartRef.current)
        try {
          obvChartRef.current.timeScale().setVisibleRange(range);
        } catch {
  // the indicator chart may already have been removed
}
      syncingRef.current = false;
    } catch {
  // the indicator chart may already have been removed
}
  };

  const getIndicatorChartOpts = (colors, showTime) => ({
    layout: {
      background: { color: colors.background },
      textColor: colors.text,
      fontSize: 11,
    },
    grid: {
      vertLines: { color: colors.grid },
      horzLines: { color: colors.grid },
    },
    crosshair: { mode: 1 },
    rightPriceScale: {
      borderColor: colors.border,
      textColor: colors.text,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    },
    timeScale: {
      borderColor: colors.border,
      textColor: colors.text,
      timeVisible: showTime,
      secondsVisible: false,
      rightOffset: 0,
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale: { mouseWheel: true, pinch: true },
  });

  const buildIndicatorSyncHandler = (selfChartRef) => () => {
    if (syncingRef.current || !chartRef.current || !selfChartRef.current)
      return;
    try {
      const range = selfChartRef.current.timeScale().getVisibleRange();
      if (!range) return;
      syncingRef.current = true;
      try {
        chartRef.current.timeScale().setVisibleRange(range);
        chartRef.current
          .timeScale()
          .applyOptions({ barSpacing: barSpacingRef.current });
      } catch {
  // the indicator chart may already have been removed
}
      if (rsiChartRef.current && rsiChartRef !== selfChartRef)
        try {
          rsiChartRef.current.timeScale().setVisibleRange(range);
        } catch {
  // the indicator chart may already have been removed
}
      if (macdChartRef.current && macdChartRef !== selfChartRef)
        try {
          macdChartRef.current.timeScale().setVisibleRange(range);
        } catch {
  // the indicator chart may already have been removed
}
      if (stochChartRef.current && stochChartRef !== selfChartRef)
        try {
          stochChartRef.current.timeScale().setVisibleRange(range);
        } catch {
  // the indicator chart may already have been removed
}
      if (obvChartRef.current && obvChartRef !== selfChartRef)
        try {
          obvChartRef.current.timeScale().setVisibleRange(range);
        } catch {
  // the indicator chart may already have been removed
}
      syncingRef.current = false;
    } catch {
  // the indicator chart may already have been removed
}
  };

  // Initialize main chart ONCE
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const colors = getColors(darkMode);
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
        fontSize: 12,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: colors.border, textColor: colors.text },
      timeScale: {
        borderColor: colors.border,
        textColor: colors.text,
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: getChartHeight(), // ← responsive height
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: false,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
      priceScaleId: "right",
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) return;
      const data = param.seriesData.get(candleSeries);
      if (data)
        setOhlcv({
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          isUp: data.close >= data.open,
        });
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      if (syncingRef.current || !chartRef.current) return;
      try {
        const range = chartRef.current.timeScale().getVisibleRange();
        if (!range) return;
        syncingRef.current = true;
        if (rsiChartRef.current)
          try {
            rsiChartRef.current.timeScale().setVisibleRange(range);
          } catch {
  // the indicator chart may already have been removed
}
        if (macdChartRef.current)
          try {
            macdChartRef.current.timeScale().setVisibleRange(range);
          } catch {
  // the indicator chart may already have been removed
}
        if (stochChartRef.current)
          try {
            stochChartRef.current.timeScale().setVisibleRange(range);
          } catch {
  // the indicator chart may already have been removed
}
        if (obvChartRef.current)
          try {
            obvChartRef.current.timeScale().setVisibleRange(range);
          } catch {
  // the indicator chart may already have been removed
}
        syncingRef.current = false;
      } catch {
  // the indicator chart may already have been removed
}
    });

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: getChartHeight(), // ← responsive on resize too
        });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Initialize RSI chart
  useEffect(() => {
    if (!showRSI) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
        rsiOverboughtRef.current = null;
        rsiOversoldRef.current = null;
      }
      return;
    }
    if (!rsiContainerRef.current) return;

    const colors = getColors(darkMode);
    const showTime =
      activeFilterRef.current === "1D" || activeFilterRef.current === "1W";
    const rsiChart = createChart(rsiContainerRef.current, {
      ...getIndicatorChartOpts(colors, showTime),
      width: rsiContainerRef.current.clientWidth,
      height: getIndicatorHeight(), // ← responsive height
    });

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: colors.rsiLine,
      lineWidth: 1.5,
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      priceFormat: { type: "custom", formatter: (v) => v.toFixed(1) },
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: 0, maxValue: 100 },
      }),
    });
    const overboughtSeries = rsiChart.addSeries(LineSeries, {
      color: colors.rsiOverboughtLine,
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: "right",
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const oversoldSeries = rsiChart.addSeries(LineSeries, {
      color: colors.rsiOversoldLine,
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: "right",
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    rsiChartRef.current = rsiChart;
    rsiSeriesRef.current = rsiSeries;
    rsiOverboughtRef.current = overboughtSeries;
    rsiOversoldRef.current = oversoldSeries;

    rsiChart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(
        buildIndicatorSyncHandler(rsiChartRef),
      );

    rsiChart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) return;
      const data = param.seriesData.get(rsiSeries);
      if (data) setRsiValue(data.value);
    });

    const resizeObserver = new ResizeObserver(() => {
      if (rsiContainerRef.current)
        rsiChart.applyOptions({ width: rsiContainerRef.current.clientWidth });
    });
    resizeObserver.observe(rsiContainerRef.current);

    if (candleDataRef.current.length > 0) updateRSIData(candleDataRef.current);
    setTimeout(() => {
      syncAllToMain();
      reapplyBarSpacing();
    }, 150);

    return () => resizeObserver.disconnect();
  }, [showRSI]);

  // Initialize MACD chart
  useEffect(() => {
    if (!showMACD) {
      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
        macdLineRef.current = null;
        macdSignalRef.current = null;
        macdHistogramRef.current = null;
      }
      return;
    }
    if (!macdContainerRef.current) return;

    const colors = getColors(darkMode);
    const showTime =
      activeFilterRef.current === "1D" || activeFilterRef.current === "1W";
    const macdChart = createChart(macdContainerRef.current, {
      ...getIndicatorChartOpts(colors, showTime),
      width: macdContainerRef.current.clientWidth,
      height: getIndicatorHeight(), // ← responsive height
    });

    const histogram = macdChart.addSeries(HistogramSeries, {
      priceScaleId: "right",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const macdLine = macdChart.addSeries(LineSeries, {
      color: colors.macdLine,
      lineWidth: 1.5,
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
    });
    const signalLine = macdChart.addSeries(LineSeries, {
      color: colors.signalLine,
      lineWidth: 1.5,
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
    });

    macdChartRef.current = macdChart;
    macdLineRef.current = macdLine;
    macdSignalRef.current = signalLine;
    macdHistogramRef.current = histogram;

    macdChart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(
        buildIndicatorSyncHandler(macdChartRef),
      );

    macdChart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) return;
      const macdData = param.seriesData.get(macdLine);
      const signalData = param.seriesData.get(signalLine);
      if (macdData && signalData) {
        setMacdValues({
          macd: macdData.value,
          signal: signalData.value,
          hist: parseFloat((macdData.value - signalData.value).toFixed(4)),
        });
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (macdContainerRef.current)
        macdChart.applyOptions({ width: macdContainerRef.current.clientWidth });
    });
    resizeObserver.observe(macdContainerRef.current);

    if (candleDataRef.current.length > 0) updateMACDData(candleDataRef.current);
    setTimeout(() => {
      syncAllToMain();
      reapplyBarSpacing();
    }, 150);

    return () => resizeObserver.disconnect();
  }, [showMACD]);

  // Initialize Stochastic chart
  useEffect(() => {
    if (!showStoch) {
      if (stochChartRef.current) {
        stochChartRef.current.remove();
        stochChartRef.current = null;
        stochKRef.current = null;
        stochDRef.current = null;
        stochOverboughtRef.current = null;
        stochOversoldRef.current = null;
      }
      return;
    }
    if (!stochContainerRef.current) return;

    const colors = getColors(darkMode);
    const showTime =
      activeFilterRef.current === "1D" || activeFilterRef.current === "1W";
    const stochChart = createChart(stochContainerRef.current, {
      ...getIndicatorChartOpts(colors, showTime),
      width: stochContainerRef.current.clientWidth,
      height: getIndicatorHeight(), // ← responsive height
    });

    const kSeries = stochChart.addSeries(LineSeries, {
      color: colors.stochK,
      lineWidth: 1.5,
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      priceFormat: { type: "custom", formatter: (v) => v.toFixed(1) },
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: 0, maxValue: 100 },
      }),
    });
    const dSeries = stochChart.addSeries(LineSeries, {
      color: colors.stochD,
      lineWidth: 1.5,
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      priceFormat: { type: "custom", formatter: (v) => v.toFixed(1) },
    });
    const overboughtSeries = stochChart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: "right",
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const oversoldSeries = stochChart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: "right",
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    stochChartRef.current = stochChart;
    stochKRef.current = kSeries;
    stochDRef.current = dSeries;
    stochOverboughtRef.current = overboughtSeries;
    stochOversoldRef.current = oversoldSeries;

    stochChart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(
        buildIndicatorSyncHandler(stochChartRef),
      );

    stochChart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) return;
      const kData = param.seriesData.get(kSeries);
      const dData = param.seriesData.get(dSeries);
      if (kData && dData) setStochValues({ k: kData.value, d: dData.value });
    });

    const resizeObserver = new ResizeObserver(() => {
      if (stochContainerRef.current)
        stochChart.applyOptions({
          width: stochContainerRef.current.clientWidth,
        });
    });
    resizeObserver.observe(stochContainerRef.current);

    if (candleDataRef.current.length > 0)
      updateStochData(candleDataRef.current);
    setTimeout(() => {
      syncAllToMain();
      reapplyBarSpacing();
    }, 150);

    return () => resizeObserver.disconnect();
  }, [showStoch]);

  // Initialize OBV chart
  useEffect(() => {
    if (!showOBV) {
      if (obvChartRef.current) {
        obvChartRef.current.remove();
        obvChartRef.current = null;
        obvSeriesRef.current = null;
      }
      return;
    }
    if (!obvContainerRef.current) return;

    const colors = getColors(darkMode);
    const showTime =
      activeFilterRef.current === "1D" || activeFilterRef.current === "1W";
    const obvChart = createChart(obvContainerRef.current, {
      ...getIndicatorChartOpts(colors, showTime),
      width: obvContainerRef.current.clientWidth,
      height: getIndicatorHeight(), // ← responsive height
    });

    const obvSeries = obvChart.addSeries(LineSeries, {
      color: colors.obvLine,
      lineWidth: 1.5,
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      priceFormat: { type: "custom", formatter: (v) => formatOBV(v) },
    });

    obvChartRef.current = obvChart;
    obvSeriesRef.current = obvSeries;

    obvChart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(
        buildIndicatorSyncHandler(obvChartRef),
      );

    obvChart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) return;
      const data = param.seriesData.get(obvSeries);
      if (data) setObvValue(data.value);
    });

    const resizeObserver = new ResizeObserver(() => {
      if (obvContainerRef.current)
        obvChart.applyOptions({ width: obvContainerRef.current.clientWidth });
    });
    resizeObserver.observe(obvContainerRef.current);

    if (candleDataRef.current.length > 0) updateOBVData(candleDataRef.current);
    setTimeout(() => {
      syncAllToMain();
      reapplyBarSpacing();
    }, 150);

    return () => resizeObserver.disconnect();
  }, [showOBV]);

  function updateRSIData(candleData) {
    if (!rsiSeriesRef.current || !rsiOverboughtRef.current) return;
    const rsiData = calculateRSI(candleData, 14);
    if (rsiData.length === 0) return;
    rsiSeriesRef.current.setData(rsiData);
    const fullRange = candleData.map((d) => d.time);
    rsiOverboughtRef.current.setData(
      fullRange.map((t) => ({ time: t, value: 70 })),
    );
    rsiOversoldRef.current.setData(
      fullRange.map((t) => ({ time: t, value: 30 })),
    );
  }

  function updateMACDData(candleData) {
    if (
      !macdLineRef.current ||
      !macdSignalRef.current ||
      !macdHistogramRef.current
    )
      return;
    if (candleData.length < 35) {
      setMacdWarning(
        `MACD needs at least 35 candles — only ${candleData.length} available. Switch to 1W or longer.`,
      );
      return;
    }
    setMacdWarning("");
    const { macd, signal, histogram } = calculateMACD(candleData, 12, 26, 9);
    if (macd.length === 0) return;
    macdLineRef.current.setData(macd);
    macdSignalRef.current.setData(signal);
    macdHistogramRef.current.setData(histogram);
  }

  function updateStochData(candleData) {
    if (!stochKRef.current || !stochDRef.current) return;
    if (candleData.length < 20) {
      setStochWarning(
        `Stochastic needs at least 20 candles — only ${candleData.length} available. Switch to 1W or longer.`,
      );
      return;
    }
    setStochWarning("");
    const { kLine, dLine } = calculateStochastic(candleData, 14, 3, 3);
    if (kLine.length === 0 || dLine.length === 0) return;
    stochKRef.current.setData(kLine);
    stochDRef.current.setData(dLine);
    const fullRange = candleData.map((d) => d.time);
    stochOverboughtRef.current.setData(
      fullRange.map((t) => ({ time: t, value: 80 })),
    );
    stochOversoldRef.current.setData(
      fullRange.map((t) => ({ time: t, value: 20 })),
    );
  }

  function updateOBVData(candleData) {
    if (!obvSeriesRef.current) return;
    const obvData = calculateOBV(candleData);
    if (obvData.length === 0) return;
    obvSeriesRef.current.setData(obvData);
  }

  const toggleBB = () => {
    if (!chartRef.current || candleDataRef.current.length === 0) return;
    if (showBB) {
      [bbUpperRef, bbMiddleRef, bbLowerRef].forEach((ref) => {
        if (ref.current) {
          try {
            chartRef.current.removeSeries(ref.current);
          } catch {
  // the indicator chart may already have been removed
}
          ref.current = null;
        }
      });
      setShowBB(false);
    } else {
      const colors = getColors(darkMode);
      const { upper, middle, lower } = calculateBollingerBands(
        candleDataRef.current,
        20,
        2,
      );
     
      if (candleDataRef.current.length < 20) {
        setBbWarning(
          `BB needs at least 20 candles — only ${candleDataRef.current.length} available. Switch to 1W or longer.`,
        );
        setTimeout(() => setBbWarning(""), 4000);
        return;
      }

      if (upper.length === 0) return;
      const upperSeries = chartRef.current.addSeries(LineSeries, {
        color: colors.bbUpper,
        lineWidth: 1,
        lineStyle: 0,
        priceScaleId: "right",
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const middleSeries = chartRef.current.addSeries(LineSeries, {
        color: colors.bbMiddle,
        lineWidth: 1,
        lineStyle: 1,
        priceScaleId: "right",
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const lowerSeries = chartRef.current.addSeries(LineSeries, {
        color: colors.bbLower,
        lineWidth: 1,
        lineStyle: 0,
        priceScaleId: "right",
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      upperSeries.setData(upper);
      middleSeries.setData(middle);
      lowerSeries.setData(lower);
      bbUpperRef.current = upperSeries;
      bbMiddleRef.current = middleSeries;
      bbLowerRef.current = lowerSeries;
      setShowBB(true);
    }
  };

  useEffect(() => {
    fetchChartData();
    const interval = setInterval(fetchChartData, 900000);
    return () => clearInterval(interval);
  }, [symbol, activeFilter]);

  useEffect(() => {
    if (!chartRef.current) return;
    const colors = getColors(darkMode);
    chartRef.current.applyOptions({
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border },
    });
  }, [darkMode]);

  useEffect(() => {
    const colors = getColors(darkMode);
    const opts = {
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border },
    };
    if (rsiChartRef.current) rsiChartRef.current.applyOptions(opts);
    if (macdChartRef.current) macdChartRef.current.applyOptions(opts);
    if (stochChartRef.current) stochChartRef.current.applyOptions(opts);
    if (obvChartRef.current) obvChartRef.current.applyOptions(opts);
  }, [darkMode]);

  useEffect(() => {
    if (!chartRef.current) return;
    const showTime = activeFilter === "1D" || activeFilter === "1W";
    const opts = {
      timeScale: { timeVisible: showTime, secondsVisible: false },
    };
    chartRef.current.applyOptions(opts);
    if (rsiChartRef.current) rsiChartRef.current.applyOptions(opts);
    if (macdChartRef.current) macdChartRef.current.applyOptions(opts);
    if (stochChartRef.current) stochChartRef.current.applyOptions(opts);
    if (obvChartRef.current) obvChartRef.current.applyOptions(opts);
  }, [activeFilter]);

  const toggleMA = (maOption) => {
    if (!chartRef.current || candleDataRef.current.length === 0) return;
    const key = maOption.label;
    if (activeMAs.includes(key)) {
      if (maSeriesRefs.current[key]) {
        try {
          chartRef.current.removeSeries(maSeriesRefs.current[key]);
        } catch {
  // the indicator chart may already have been removed
}
        delete maSeriesRefs.current[key];
      }
      setActiveMAs((prev) => prev.filter((m) => m !== key));
      setMaWarning("");
    } else {
      const data = candleDataRef.current;
      if (data.length < maOption.period) {
        setMaWarning(
          `${key} needs at least ${maOption.period} candles — only ${data.length} available. Switch to 3M or longer.`,
        );
        setTimeout(() => setMaWarning(""), 4000);
        return;
      }
      let maData =
        maOption.type === "sma"
          ? calculateSMA(data, maOption.period)
          : calculateEMA(data, maOption.period);
      if (maData.length === 0) return;
      const maSeries = chartRef.current.addSeries(LineSeries, {
        color: maOption.color,
        lineWidth: 1.5,
        priceScaleId: "right",
        crosshairMarkerVisible: false,
        lastValueVisible: true,
        priceLineVisible: false,
      });
      maSeries.setData(maData);
      maSeriesRefs.current[key] = maSeries;
      setActiveMAs((prev) => [...prev, key]);
      setMaWarning("");
    }
  };

  async function fetchChartData() {
    try {
      setLoading(true);
      setError("");
      setOhlcv(null);
      setRsiValue(null);
      setMacdValues(null);
      setStochValues(null);
      setObvValue(null);

      const filter = TIME_FILTERS.find((f) => f.label === activeFilter);
      const res = await getHistoricalData(
        symbol,
        filter.interval,
        filter.range,
      );
      const { candlestickData } = res.data;

      if (!candlestickData || candlestickData.length === 0) {
        setError("No data available for this period");
        return;
      }

      candleDataRef.current = candlestickData;
      if (candleSeriesRef.current)
        candleSeriesRef.current.setData(candlestickData);

      if (volumeSeriesRef.current) {
        const colors = getColors(darkMode);
        const volumeData = candlestickData.map((d) => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? colors.volumeUp : colors.volumeDown,
        }));
        volumeSeriesRef.current.setData(volumeData);
      }

      const masToRemove = [];
      activeMAs.forEach((key) => {
        const maOption = MA_OPTIONS.find((m) => m.label === key);
        if (!maOption || !maSeriesRefs.current[key]) return;
        if (candlestickData.length < maOption.period) {
          try {
            chartRef.current.removeSeries(maSeriesRefs.current[key]);
          } catch {
  // the indicator chart may already have been removed
}
          delete maSeriesRefs.current[key];
          masToRemove.push(key);
          return;
        }
        const maData =
          maOption.type === "sma"
            ? calculateSMA(candlestickData, maOption.period)
            : calculateEMA(candlestickData, maOption.period);
        if (maData.length > 0) maSeriesRefs.current[key].setData(maData);
      });

      if (masToRemove.length > 0) {
        setActiveMAs((prev) => prev.filter((m) => !masToRemove.includes(m)));
        setMaWarning(
          `${masToRemove.join(", ")} removed — not enough candles. Switch to 3M or longer.`,
        );
        setTimeout(() => setMaWarning(""), 4000);
      }

      if (showBB) {
        const { upper, middle, lower } = calculateBollingerBands(
          candlestickData,
          20,
          2,
        );
        if (bbUpperRef.current) bbUpperRef.current.setData(upper);
        if (bbMiddleRef.current) bbMiddleRef.current.setData(middle);
        if (bbLowerRef.current) bbLowerRef.current.setData(lower);
      }

      if (showRSI) updateRSIData(candlestickData);
      if (showMACD) updateMACDData(candlestickData);
      if (showStoch) updateStochData(candlestickData);
      if (showOBV) updateOBVData(candlestickData);

      if (chartRef.current) {
        const containerWidth = chartContainerRef.current?.clientWidth || 800;
        const barSpacing = Math.min(Math.max(containerWidth / 60, 3), 12);
        barSpacingRef.current = barSpacing;

        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.timeScale().applyOptions({
              barSpacing: barSpacingRef.current,
              rightOffset: 5,
            });
            chartRef.current.timeScale().scrollToRealTime();
          }
          syncAllToMain();
        }, 0);

        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current
              .timeScale()
              .applyOptions({ barSpacing: barSpacingRef.current });
          }
        }, 200);
      }

      const last = candlestickData[candlestickData.length - 1];
      setOhlcv({
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        isUp: last.close >= last.open,
      });
      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      setError("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  }

  const getRSIColor = (value) => {
    if (value === null) return "text-gray-400";
    if (value >= 70) return "text-red-500";
    if (value <= 30) return "text-green-500";
    return "text-purple-400";
  };

  const getRSILabel = (value) => {
    if (value === null) return "";
    if (value >= 70) return "Overbought";
    if (value <= 30) return "Oversold";
    return "Neutral";
  };

  const getStochColor = (k) => {
    if (k === null) return "text-gray-400";
    if (k >= 80) return "text-red-500";
    if (k <= 20) return "text-green-500";
    return "text-emerald-400";
  };

  const getStochLabel = (k) => {
    if (k === null) return "";
    if (k >= 80) return "Overbought";
    if (k <= 20) return "Oversold";
    return "Neutral";
  };

  const getOBVTrend = (value) => {
    if (value === null) return "";
    if (value > 0) return "Accumulation";
    if (value < 0) return "Distribution";
    return "Neutral";
  };

  const getOBVColor = (value) => {
    if (value === null) return "text-gray-400";
    if (value > 0) return "text-green-500";
    if (value < 0) return "text-red-500";
    return "text-gray-400";
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-gray-900 dark:text-white font-bold text-sm">
              {symbol} — Price Chart
            </h3>
            {lastUpdated && (
              <span className="text-gray-400 text-xs">
                Updated: {lastUpdated}
              </span>
            )}
          </div>
          {ohlcv && (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                O:{" "}
                <span
                  className={ohlcv.isUp ? "text-green-500" : "text-red-500"}
                >
                  ₹{ohlcv.open?.toFixed(2)}
                </span>
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                H:{" "}
                <span className="text-green-500">
                  ₹{ohlcv.high?.toFixed(2)}
                </span>
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                L:{" "}
                <span className="text-red-500">₹{ohlcv.low?.toFixed(2)}</span>
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                C:{" "}
                <span
                  className={ohlcv.isUp ? "text-green-500" : "text-red-500"}
                >
                  ₹{ohlcv.close?.toFixed(2)}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Time Filters — horizontal scroll on mobile, no wrap */}
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(filter.label)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex-shrink-0 ${
                activeFilter === filter.label
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Indicators Row — horizontal scroll on mobile, NEVER wraps */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-gray-400 dark:text-gray-500 text-xs font-medium flex-shrink-0">
          Indicators:
        </span>
        {MA_OPTIONS.map((ma) => {
          const isActive = activeMAs.includes(ma.label);
          return (
            <button
              key={ma.label}
              onClick={() => toggleMA(ma)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition border flex-shrink-0"
              style={{
                backgroundColor: isActive ? ma.color : "transparent",
                borderColor: ma.color,
                color: isActive ? "white" : ma.color,
              }}
            >
              {ma.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowRSI((prev) => !prev)}
          className="px-3 py-1 rounded-full text-xs font-semibold transition border flex-shrink-0"
          style={{
            backgroundColor: showRSI ? "#e879f9" : "transparent",
            borderColor: "#e879f9",
            color: showRSI ? "white" : "#e879f9",
          }}
        >
          RSI 14
        </button>
        <button
          onClick={toggleBB}
          className="px-3 py-1 rounded-full text-xs font-semibold transition border flex-shrink-0"
          style={{
            backgroundColor: showBB ? "#38bdf8" : "transparent",
            borderColor: "#38bdf8",
            color: showBB ? "white" : "#38bdf8",
          }}
        >
          BB (20,2)
        </button>
        <button
          onClick={() => setShowMACD((prev) => !prev)}
          className="px-3 py-1 rounded-full text-xs font-semibold transition border flex-shrink-0"
          style={{
            backgroundColor: showMACD ? "#60a5fa" : "transparent",
            borderColor: "#60a5fa",
            color: showMACD ? "white" : "#60a5fa",
          }}
        >
          MACD
        </button>
        <button
          onClick={() => setShowStoch((prev) => !prev)}
          className="px-3 py-1 rounded-full text-xs font-semibold transition border flex-shrink-0"
          style={{
            backgroundColor: showStoch ? "#34d399" : "transparent",
            borderColor: "#34d399",
            color: showStoch ? "white" : "#34d399",
          }}
        >
          Stoch
        </button>
        <button
          onClick={() => setShowOBV((prev) => !prev)}
          className="px-3 py-1 rounded-full text-xs font-semibold transition border flex-shrink-0"
          style={{
            backgroundColor: showOBV ? "#fbbf24" : "transparent",
            borderColor: "#fbbf24",
            color: showOBV ? "white" : "#fbbf24",
          }}
        >
          OBV
        </button>
      </div>

      {/* MA Warning */}
      {maWarning && (
        <div className="mb-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-600 dark:text-yellow-400 text-xs">
            ⚠️ {maWarning}
          </p>
        </div>
      )}

      {/* BB Warning — ADD THIS BLOCK RIGHT HERE */}
      {bbWarning && (
        <div className="mb-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-600 dark:text-yellow-400 text-xs">
            ⚠️ {bbWarning}
          </p>
        </div>
      )}

      {/* Main Chart */}
      <div className="relative mt-2">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10 rounded-xl">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Loading chart...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10 rounded-xl">
            <div className="text-center">
              <p className="text-4xl mb-2">📉</p>
              <p className="text-gray-400 text-sm">{error}</p>
              <button
                onClick={fetchChartData}
                className="mt-3 text-green-400 hover:text-green-300 text-xs transition"
              >
                Try again
              </button>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" />
      </div>

      {/* RSI Panel */}
      {showRSI && (
        <div className="mt-1">
          <div className="flex items-center gap-2 mb-1 px-1">
            <span
              className="text-xs font-semibold flex-shrink-0"
              style={{ color: "#e879f9" }}
            >
              RSI 14
            </span>
            {rsiValue !== null && (
              <>
                <span
                  className={`text-xs font-bold flex-shrink-0 ${getRSIColor(rsiValue)}`}
                >
                  {rsiValue?.toFixed(2)}
                </span>
                <span
                  className={`text-xs flex-shrink-0 ${getRSIColor(rsiValue)}`}
                >
                  {getRSILabel(rsiValue)}
                </span>
              </>
            )}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <span className="text-xs text-red-500 whitespace-nowrap">
                ── 70
              </span>
              <span className="text-xs text-green-500 whitespace-nowrap">
                ── 30
              </span>
            </div>
          </div>
          <div
            ref={rsiContainerRef}
            className="w-full border-t border-gray-100 dark:border-gray-800"
          />
        </div>
      )}

      {/* MACD Panel */}
      {showMACD && (
        <div className="mt-1">
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-semibold text-blue-400 flex-shrink-0">
              MACD (12,26,9)
            </span>
            {macdValues !== null && (
              <>
                <span className="text-xs text-blue-400 flex-shrink-0">
                  MACD: {macdValues.macd?.toFixed(2)}
                </span>
                <span className="text-xs text-orange-400 flex-shrink-0">
                  Signal: {macdValues.signal?.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-bold flex-shrink-0 ${macdValues.hist >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  Hist: {macdValues.hist >= 0 ? "+" : ""}
                  {macdValues.hist?.toFixed(2)}
                </span>
              </>
            )}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-blue-400 rounded" />
                <span className="text-xs text-blue-400">MACD</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-orange-400 rounded" />
                <span className="text-xs text-orange-400">Signal</span>
              </div>
            </div>
          </div>
          {macdWarning && (
            <div className="mx-1 mb-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                ⚠️ {macdWarning}
              </p>
            </div>
          )}
          <div
            ref={macdContainerRef}
            className="w-full border-t border-gray-100 dark:border-gray-800"
          />
        </div>
      )}

      {/* Stochastic Panel */}
      {showStoch && (
        <div className="mt-1">
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-semibold text-emerald-400 flex-shrink-0">
              Stoch (14,3,3)
            </span>
            {stochValues !== null && (
              <>
                <span className="text-xs text-emerald-400 flex-shrink-0">
                  %K: {stochValues.k?.toFixed(2)}
                </span>
                <span className="text-xs text-rose-400 flex-shrink-0">
                  %D: {stochValues.d?.toFixed(2)}
                </span>
                <span
                  className={`text-xs flex-shrink-0 ${getStochColor(stochValues.k)}`}
                >
                  {getStochLabel(stochValues.k)}
                </span>
              </>
            )}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-emerald-400 rounded" />
                <span className="text-xs text-emerald-400">%K</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-rose-400 rounded" />
                <span className="text-xs text-rose-400">%D</span>
              </div>
              <span className="text-xs text-red-500 whitespace-nowrap">
                ── 80
              </span>
              <span className="text-xs text-green-500 whitespace-nowrap">
                ── 20
              </span>
            </div>
          </div>
          {stochWarning && (
            <div className="mx-1 mb-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                ⚠️ {stochWarning}
              </p>
            </div>
          )}
          <div
            ref={stochContainerRef}
            className="w-full border-t border-gray-100 dark:border-gray-800"
          />
        </div>
      )}

      {/* OBV Panel */}
      {showOBV && (
        <div className="mt-1">
          <div className="flex items-center gap-2 mb-1 px-1">
            <span
              className="text-xs font-semibold flex-shrink-0"
              style={{ color: "#fbbf24" }}
            >
              OBV
            </span>
            {obvValue !== null && (
              <>
                <span
                  className={`text-xs font-bold flex-shrink-0 ${getOBVColor(obvValue)}`}
                >
                  {formatOBV(obvValue)}
                </span>
                <span
                  className={`text-xs flex-shrink-0 ${getOBVColor(obvValue)}`}
                >
                  {getOBVTrend(obvValue)}
                </span>
              </>
            )}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-0.5 rounded"
                  style={{ backgroundColor: "#fbbf24" }}
                />
                <span className="text-xs" style={{ color: "#fbbf24" }}>
                  OBV
                </span>
              </div>
              <span className="text-gray-400 text-xs whitespace-nowrap hidden sm:inline">
                Rising = Buying pressure
              </span>
            </div>
          </div>
          <div
            ref={obvContainerRef}
            className="w-full border-t border-gray-100 dark:border-gray-800"
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
          <span className="text-gray-400 text-xs">Bullish</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-3 h-3 rounded-sm bg-red-500"></div>
          <span className="text-gray-400 text-xs">Bearish</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-3 h-1.5 rounded-sm bg-green-500 opacity-40"></div>
          <span className="text-gray-400 text-xs">Volume</span>
        </div>
        {MA_OPTIONS.filter((ma) => activeMAs.includes(ma.label)).map((ma) => (
          <div
            key={ma.label}
            className="flex items-center gap-1.5 flex-shrink-0"
          >
            <div
              className="w-6 h-0.5 rounded"
              style={{ backgroundColor: ma.color }}
            />
            <span className="text-xs" style={{ color: ma.color }}>
              {ma.label}
            </span>
          </div>
        ))}
        {showBB && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-6 h-0.5 rounded bg-sky-400" />
            <span className="text-xs text-sky-400">BB</span>
          </div>
        )}
        {showRSI && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div
              className="w-6 h-0.5 rounded"
              style={{ backgroundColor: "#e879f9" }}
            />
            <span className="text-xs" style={{ color: "#e879f9" }}>
              RSI
            </span>
          </div>
        )}
        {showMACD && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-6 h-0.5 rounded bg-blue-400" />
            <span className="text-xs text-blue-400">MACD</span>
          </div>
        )}
        {showStoch && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-6 h-0.5 rounded bg-emerald-400" />
            <span className="text-xs text-emerald-400">Stoch</span>
          </div>
        )}
        {showOBV && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div
              className="w-6 h-0.5 rounded"
              style={{ backgroundColor: "#fbbf24" }}
            />
            <span className="text-xs" style={{ color: "#fbbf24" }}>
              OBV
            </span>
          </div>
        )}
        <button
          onClick={fetchChartData}
          className="ml-auto text-xs text-gray-400 hover:text-green-400 transition flex items-center gap-1 flex-shrink-0"
        >
          🔄
        </button>
      </div>
    </div>
  );
};

export default CandlestickChart;
