/**
 * ID generation. Uses `crypto.randomUUID` when available (secure contexts and
 * modern browsers) and falls back to a timestamp + random suffix elsewhere.
 * IDs are stable and opaque on purpose — Google Sheets storage relies on IDs
 * rather than row numbers.
 */

const FALLBACK_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

function fallbackId(): string {
  let out = `${Date.now().toString(36)}-`;
  for (let i = 0; i < 3; i += 1) {
    let chunk = "";
    for (let j = 0; j < 8; j += 1) {
      chunk += FALLBACK_ALPHABET[Math.floor(Math.random() * FALLBACK_ALPHABET.length)];
    }
    out += chunk;
    if (i < 2) out += "-";
  }
  return out;
}

export function createId(prefix?: string): string {
  const raw =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : fallbackId();
  return prefix ? `${prefix}_${raw.replace(/-/g, "").slice(0, 20)}` : raw;
}

/** Deterministic, human-readable id for seeded records (categories, methods). */
export function stableId(namespace: string, value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `${namespace}_${Math.abs(hash).toString(36)}`;
}
