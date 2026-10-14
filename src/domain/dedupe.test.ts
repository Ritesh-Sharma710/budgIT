import { describe, expect, it } from "vitest";
import { dedupeHashFor, normalizeDescription, partitionDuplicates, transactionSignature } from "./dedupe";

const base = {
  date: "2026-03-01",
  type: "expense" as const,
  amount: 250,
  categoryId: "cat_food",
  description: "Coffee at Blue Tokai",
};

describe("description normalisation", () => {
  it("lowercases and strips punctuation and spacing noise", () => {
    expect(normalizeDescription("  Coffee   at BLUE Tokai!! ")).toBe("coffee at blue tokai");
  });
});

describe("transaction signatures", () => {
  it("is stable across casing and whitespace differences", () => {
    expect(transactionSignature(base)).toBe(
      transactionSignature({ ...base, description: "coffee at blue   tokai" }),
    );
  });

  it("differs when the amount differs", () => {
    expect(dedupeHashFor(base)).not.toBe(dedupeHashFor({ ...base, amount: 251 }));
  });

  it("produces the same hash for identical input", () => {
    expect(dedupeHashFor(base)).toBe(dedupeHashFor({ ...base }));
  });
});

describe("partitionDuplicates", () => {
  it("detects repeats inside a single import batch", () => {
    const { unique, duplicates } = partitionDuplicates([base, { ...base }, { ...base, amount: 300 }]);
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].matchesExisting).toBe(false);
  });

  it("detects rows that already exist in storage", () => {
    const existing = new Set([dedupeHashFor(base)]);
    const { unique, duplicates } = partitionDuplicates([base, { ...base, amount: 999 }], existing);
    expect(unique).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].matchesExisting).toBe(true);
  });

  it("does not flag genuinely different purchases", () => {
    const { unique, duplicates } = partitionDuplicates([
      base,
      { ...base, description: "Lunch at cafe", amount: 400 },
    ]);
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(0);
  });
});
