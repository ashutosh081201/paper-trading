import { expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let chartMounts = 0;
vi.mock("../components/charts/CandlestickChart", async () => {
  const { useEffect } = await import("react");
  return { default: function Chart() { useEffect(() => { chartMounts++; }, []); return <div>chart</div>; } };
});
vi.mock("../components/charts/ComparisonChart", () => ({ default: () => null }));
vi.mock("../components/PriceAlertModal", () => ({ default: () => null }));
vi.mock("../components/StockNotes", () => ({ default: () => null }));
vi.mock("../components/OrderForm", () => ({
  default: ({ onSuccess }) => <button onClick={onSuccess}>finish order</button>,
}));
vi.mock("../services/socket", () => ({
  subscribeToSymbols: vi.fn(), unsubscribeFromSymbols: vi.fn(), onPriceUpdate: () => () => {},
}));
vi.mock("react-router-dom", () => ({ useParams: () => ({ symbol: "TCS" }), useNavigate: () => vi.fn() }));
vi.mock("../services/api", () => ({
  getStockSentiment: vi.fn(),
  getQuote: vi.fn(() => Promise.resolve({ data: { quote: {
    symbol: "TCS", companyName: "TCS", currentPrice: 2500, change: 1, changePercent: 0.1,
    previousClose: 2499, dayHigh: 2510, dayLow: 2490, volume: 1,
  } } })),
}));

import StockDetail from "./StockDetail";

test("placing an order keeps the chart (range, indicators) instead of reloading the page", async () => {
  render(<StockDetail />);
  await screen.findByText("chart");
  fireEvent.click(screen.getAllByText("Buy")[0]);
  fireEvent.click(screen.getByText("finish order"));
  await waitFor(() => expect(screen.getByText("chart")).toBeTruthy());
  await new Promise((r) => setTimeout(r, 50));
  expect(chartMounts).toBe(1);
});
