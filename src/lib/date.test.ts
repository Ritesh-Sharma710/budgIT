import { describe, expect, it } from "vitest";
import {
  addMonths,
  daysBetween,
  daysInMonth,
  eachMonthBetween,
  isValidISODate,
  isValidMonthKey,
  monthEnd,
  monthKeyOf,
  monthLabel,
  monthStart,
  monthsBetween,
  monthsInYear,
  nextMonth,
  previousMonth,
  toISODate,
  toMonthKey,
} from "./date";

describe("date parsing and validation", () => {
  it("validates ISO dates including leap years", () => {
    expect(isValidISODate("2026-02-28")).toBe(true);
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("2026-1-1")).toBe(false);
    expect(isValidISODate("")).toBe(false);
  });

  it("validates month keys", () => {
    expect(isValidMonthKey("2026-01")).toBe(true);
    expect(isValidMonthKey("2026-00")).toBe(false);
    expect(isValidMonthKey("2026-12")).toBe(true);
  });

  it("never shifts a date through UTC", () => {
    // Midnight local time must round-trip to the same calendar date.
    const d = new Date(2026, 0, 1, 0, 0, 0);
    expect(toISODate(d)).toBe("2026-01-01");
    const late = new Date(2026, 0, 1, 23, 59, 59);
    expect(toISODate(late)).toBe("2026-01-01");
  });
});

describe("month arithmetic", () => {
  it("moves across year boundaries", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(nextMonth("2026-12")).toBe("2027-01");
    expect(addMonths("2026-01", -13)).toBe("2024-12");
    expect(addMonths("2026-06", 18)).toBe("2027-12");
  });

  it("builds month keys with zero padding", () => {
    expect(monthKeyOf(2026, 3)).toBe("2026-03");
  });

  it("computes differences in whole months", () => {
    expect(monthsBetween("2026-01", "2026-12")).toBe(11);
    expect(monthsBetween("2026-12", "2026-01")).toBe(-11);
    expect(monthsBetween("2026-01", "2027-01")).toBe(12);
  });

  it("lists the months of a year", () => {
    expect(monthsInYear(2026)).toHaveLength(12);
    expect(monthsInYear(2026)[0]).toBe("2026-01");
    expect(monthsInYear(2026)[11]).toBe("2026-12");
  });

  it("enumerates a range inclusively", () => {
    expect(eachMonthBetween("2025-11", "2026-02")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("month boundaries", () => {
  it("knows leap-year month lengths", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("returns inclusive start and end dates", () => {
    expect(monthStart("2026-02")).toBe("2026-02-01");
    expect(monthEnd("2026-02")).toBe("2026-02-28");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
    expect(monthEnd("2026-11")).toBe("2026-11-30");
  });

  it("extracts the month key from a date", () => {
    expect(toMonthKey("2026-07-14")).toBe("2026-07");
  });

  it("labels months", () => {
    expect(monthLabel("2026-03")).toBe("March 2026");
    expect(monthLabel("2026-03", { short: true })).toBe("Mar 2026");
  });
});

describe("day math", () => {
  it("counts days across a year boundary", () => {
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
  });
});
