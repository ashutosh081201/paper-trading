import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const notify = vi.fn();
vi.mock("../context/NotificationContext", () => ({ useNotification: () => ({ notify }) }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { funds: 100000 }, updateFunds: vi.fn() }),
}));
vi.mock("../services/api", () => ({
  getMe: vi.fn(() => Promise.resolve({ data: { user: { funds: 100000 } } })),
  buyStock: vi.fn(),
  sellStock: vi.fn(),
  createLimitOrder: vi.fn(),
}));

import { buyStock, sellStock } from "../services/api";
import OrderForm from "./OrderForm";

const quote = { symbol: "TCS", companyName: "TCS", currentPrice: 2500, change: 0 };
const submit = (orderType) => {
  render(<OrderForm quote={quote} orderType={orderType} onClose={() => {}} onSuccess={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText("Enter quantity"), { target: { value: "10" } });
  fireEvent.submit(screen.getByPlaceholderText("Enter quantity").closest("form"));
};

beforeEach(() => vi.clearAllMocks());

describe("order confirmation shows the price the order actually filled at", () => {
  // The price on screen can be a tick old; the server fills at its own live price.
  test("buy", async () => {
    buyStock.mockResolvedValue({ data: { currentPrice: 2500.2, amountDeducted: 25002, remainingFunds: 74998 } });
    submit("buy");
    await waitFor(() => expect(notify).toHaveBeenCalled());
    expect(notify.mock.calls[0][0]).toContain("at ₹2,500.20");
    expect(notify.mock.calls[0][0]).toContain("₹25,002.00");
  });

  test("sell", async () => {
    sellStock.mockResolvedValue({ data: { currentPrice: 2495.6, profitLoss: -46, remainingFunds: 1 } });
    submit("sell");
    await waitFor(() => expect(notify).toHaveBeenCalled());
    expect(notify.mock.calls[0][0]).toContain("at ₹2,495.60");
  });
});
