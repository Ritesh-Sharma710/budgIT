/**
 * Duplicate detection.
 *
 * Two transactions are considered the same when they share a date, type,
 * amount, category and a normalised description. That is strict enough to be
 * safe on CSV re-imports without flagging genuinely repeated purchases
 * (e.g. the same coffee bought twice on one day) as long as the description
 * differs — and we always ask the user before dropping rows.
 */

import type { Transaction } from "./types";

export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Deterministic 32-bit FNV-1a hash rendered as hex. */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function transactionSignature(tx: Pick<Transaction, "date" | "type" | "amount" | "categoryId" | "description">): string {
  return [
    tx.date,
    tx.type,
    tx.amount.toFixed(2),
    tx.categoryId,
    normalizeDescription(tx.description),
  ].join("|");
}

export function dedupeHashFor(tx: Pick<Transaction, "date" | "type" | "amount" | "categoryId" | "description">): string {
  return hash(transactionSignature(tx));
}

export interface DuplicateCheckResult<T> {
  unique: T[];
  duplicates: { row: T; hash: string; matchesExisting: boolean }[];
}

/**
 * Split incoming rows into unique vs duplicate. `existing` contains hashes of
 * records already stored; within-batch repeats are also detected.
 */
export function partitionDuplicates<T extends Pick<Transaction, "date" | "type" | "amount" | "categoryId" | "description">>(
  rows: T[],
  existingHashes: Set<string> = new Set(),
  existingSignatures: Set<string> = new Set(),
): DuplicateCheckResult<T> {
  const seenHashes = new Set<string>();
  const seenSignatures = new Set<string>();
  const unique: T[] = [];
  const duplicates: DuplicateCheckResult<T>["duplicates"] = [];

  for (const row of rows) {
    const signature = transactionSignature(row);
    const h = hash(signature);
    const isDup =
      existingHashes.has(h) ||
      existingSignatures.has(signature) ||
      seenHashes.has(h) ||
      seenSignatures.has(signature);

    if (isDup) {
      duplicates.push({ row, hash: h, matchesExisting: existingHashes.has(h) || existingSignatures.has(signature) });
    } else {
      seenHashes.add(h);
      seenSignatures.add(signature);
      unique.push(row);
    }
  }

  return { unique, duplicates };
}
