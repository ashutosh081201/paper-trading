import { expect, test } from "vitest";
import { displaySymbol } from "./displaySymbol";

test("strips the index caret only", () => {
  expect(displaySymbol("^NSEI")).toBe("NSEI");
  expect(displaySymbol("M&M")).toBe("M&M");
  expect(displaySymbol(undefined)).toBe("");
});
