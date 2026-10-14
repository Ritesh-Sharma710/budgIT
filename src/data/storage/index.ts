import type { StorageMode } from "@/domain/types";
import type { StorageAdapter } from "./types";
import { localAdapter } from "./local";

/**
 * Adapter registry. Adding Google Sheets in Phase 6 means registering one more
 * adapter here — no page or component needs to change.
 */
const adapters: Record<StorageMode, StorageAdapter> = {
  local: localAdapter,
  // Placeholder until Phase 6 wires up OAuth + the Sheets API.
  "google-sheets": {
    mode: "google-sheets",
    label: "Google Sheets",
    description: "Store records in a spreadsheet you own. Requires signing in with Google.",
    isAvailable: () => false,
    async status() {
      return {
        mode: "google-sheets",
        syncStatus: "offline",
        lastSyncedAt: null,
        message: "Google Sheets storage is not enabled in this build yet.",
      };
    },
    exportAll: localAdapter.exportAll,
    previewImport: localAdapter.previewImport,
    importAll: localAdapter.importAll,
    counts: localAdapter.counts,
    clearAll: localAdapter.clearAll,
  },
};

export function getStorageAdapter(mode: StorageMode): StorageAdapter {
  return adapters[mode] ?? localAdapter;
}

export const storageAdapters = adapters;
export type { StorageAdapter, StorageState } from "./types";
