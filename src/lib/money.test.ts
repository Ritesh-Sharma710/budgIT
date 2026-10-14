import { describe, expect, it } from "vitest";
import {
  changePercent,
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  parseAmount,
  roundCurrency,
  safeDivide,
  savingsRate,
  sum,
} from "./money";

describe("rounding and summation", () => {
  it("avoids floating point drift", () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
    expect(sum([0.1, 0.2, 0.3])).toBe(0.6);
  });

  it("sums empty and invalid input safely", () => {
    expect(sum([])).toBe(0);
    expect(sum([Number.NaN, 5])).toBe(5);
    expect(roundCurrency(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("rounds to two decimals", () => {
    expect(roundCurrency(1234.567)).toBe(1234.57);
    expect(roundCurrency(-0.005)).toBe(-0.01);
  });
});

describe("savings rate", () => {
  it("returns null when income is zero", () => {
    expect(savingsRate(1000, 0)).toBeNull();
    expect(savingsRate(0, 0)).toBeNull();
  });

  it("handles negative savings", () => {
    expect(savingsRate(-500, 10000)).toBe(-5);
  });

  it("computes a normal rate", () => {
    expect(savingsRate(2500, 10000)).toBe(25);
  });
});

describe("formatting", () => {
  it("formats INR with Indian digit grouping", () => {
    const formatted = formatCurrency(1234567.5, { currency: "INR", locale: "en-IN" });
    expect(formatted).toContain("12,34,567.50");
    expect(formatted).toContain("₹");
  });

  it("formats other currencies", () => {
    expect(formatCurrency(1000, { currency: "USD", locale: "en-US" })).toBe("$1,000.00");
  });

  it("formats signed amounts including a negative sign", () => {
    expect(formatSignedCurrency(500, { currency: "INR", locale: "en-IN" })).toContain("+");
    expect(formatSignedCurrency(-500, { currency: "INR", locale: "en-IN" })).toContain("−");
    expect(formatSignedCurrency(0, { currency: "INR", locale: "en-IN" })).not.toContain("+");
  });

  it("handles compact notation for large values", () => {
    const compact = formatCurrency(1500000, { currency: "INR", locale: "en-IN", compact: true });
    expect(compact.length).toBeLessThan(10);
  });

  it("guards percentages against NaN", () => {
    expect(formatPercent(Number.NaN)).toBe("—");
    expect(formatPercent(12.345)).toBe("12.3%");
  });
});

describe("parsing", () => {
  it("parses formatted strings", () => {
    expect(parseAmount("₹1,20,000.50")).toBe(120000.5);
    expect(parseAmount("12 000")).toBe(12000);
    expect(parseAmount("abc")).toBe(0);
    expect(parseAmount(42)).toBe(42);
  });
});

describe("helpers", () => {
  it("divides safely", () => {
    expect(safeDivide(10, 2)).toBe(5);
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, 0, -1)).toBe(-1);
  });

  it("computes percentage change with a zero guard", () => {
    expect(changePercent(150, 100)).toBe(50);
    expect(changePercent(0, 0)).toBe(0);
    expect(changePercent(10, 0)).toBeNull();
  });
});
