import { expect, test, vi } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";

let pushPrices;
vi.mock("../services/socket", () => ({
  subscribeToSymbols: vi.fn(),
  unsubscribeFromSymbols: vi.fn(),
  onPriceUpdate: (fn) => { pushPrices = fn; return () => {}; },
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../services/api", () => ({
  getHoldings: () => Promise.resolve({ data: { holdings: [], summary: null, analytics: null } }),
  getTransactions: () => Promise.resolve({ data: { transactions: [] } }),
  getPositions: () => Promise.resolve({ data: {
    positions: [{ _id: "p1", symbol: "TCS", companyName: "TCS", quantity: 6, buyPrice: 2500.2,
      currentPrice: 2495, investedAmount: 15001.2, currentValue: 14970, profitLoss: -31.2,
      profitLossPercent: -0.21, marginPaid: 3000.24, date: "2026-11-23" }],
    summary: { totalInvested: 15001.2, totalCurrentValue: 14970, totalProfitLoss: -31.2, totalMarginUsed: 3000.24 },
  } }),
}));

import { subscribeToSymbols } from "../services/socket";
import Portfolio from "./Portfolio";

test("intraday positions get live prices like holdings do", async () => {
  render(<Portfolio />);
  fireEvent.click(await screen.findByText(/Positions \(1\)/));
  expect(subscribeToSymbols).toHaveBeenCalledWith(expect.arrayContaining(["TCS"]));
  act(() => pushPrices({ TCS: { currentPrice: 2510, change: 0, changePercent: 0 } }));
  await waitFor(() => expect(screen.getAllByText(/₹2,510\.00/).length).toBeGreaterThan(0));
  expect(screen.getAllByText(/₹58\.80/).length).toBeGreaterThan(0); // (2510 − 2500.20) × 6
});
