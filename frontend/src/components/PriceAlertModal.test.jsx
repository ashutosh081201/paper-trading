import { expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../services/api", () => ({
  getAlerts: vi.fn(() => Promise.resolve({ data: { alerts: [] } })),
  createAlert: vi.fn(() => Promise.resolve({})),
  deleteAlert: vi.fn(),
}));

import { createAlert } from "../services/api";
import PriceAlertModal from "./PriceAlertModal";

const quote = { symbol: "SBIN", companyName: "SBI", currentPrice: 1146 };

test.each([
  ["▲ Above", "1100"],
  ["▼ Below", "1200"],
])("an alert that is already met right now is refused (%s %s)", async (side, price) => {
  render(<PriceAlertModal quote={quote} onClose={() => {}} />);
  fireEvent.click(screen.getByText(side));
  const input = screen.getByRole("spinbutton");
  fireEvent.change(input, { target: { value: price } });
  fireEvent.submit(input.closest("form"));
  await waitFor(() => expect(screen.getByText(/already/i)).toBeTruthy());
  expect(createAlert).not.toHaveBeenCalled();
});
