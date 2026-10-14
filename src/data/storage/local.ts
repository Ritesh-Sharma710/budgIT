import type { StorageAdapter, StorageState } from "./types";
import { clearAll, countsByTable, exportAll, importAll, previewImport } from "@/data/backup";

/**
 * Local-first adapter backed by IndexedDB via Dexie.
 *
 * Nothing here ever touches the network — financial data stays on the device
 * and inside the current browser profile. `isAvailable` guards against
 * environments where IndexedDB is blocked (e.g. some private-browsing modes).
 */
export const localAdapter: StorageAdapter = {
  mode: "local",
  label: "This device",
  description: "Stored in your browser using IndexedDB. Private, offline-capable, and never uploaded.",

  isAvailable() {
    return typeof indexedDB !== "undefined";
  },

  async status(): Promise<StorageState> {
    return {
      mode: "local",
      syncStatus: "idle",
      lastSyncedAt: null,
      message: "Local data lives only in this browser profile on this device. Back it up to move it.",
    };
  },

  exportAll,
  previewImport,
  importAll,
  counts: countsByTable,
  clearAll,
};
