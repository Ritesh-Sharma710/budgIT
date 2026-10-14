import type { StorageMode, SyncStatus } from "@/domain/types";
import type { BackupPayload, ImportPreview, ImportResult, ImportStrategy } from "@/data/backup";
import type { TableName } from "@/data/db";

/**
 * The storage abstraction.
 *
 * Local-first (IndexedDB) and Google Sheets (user-owned) both implement this
 * shape, so pages never branch on "where is my data". Phase 5 wires up the
 * local adapter; the Google Sheets adapter slots in behind the same interface.
 */
export interface StorageAdapter {
  readonly mode: StorageMode;
  readonly label: string;
  readonly description: string;
  /** True when the adapter can be used in the current environment. */
  isAvailable(): boolean;

  /** Current sync state for the status indicator in the UI. */
  status(): Promise<StorageState>;

  exportAll(): Promise<BackupPayload>;
  previewImport(payload: BackupPayload): Promise<ImportPreview>;
  importAll(payload: BackupPayload, strategy?: ImportStrategy): Promise<ImportResult>;
  counts(): Promise<Partial<Record<TableName, number>>>;
  clearAll(): Promise<void>;
}

export interface StorageState {
  mode: StorageMode;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  message?: string;
}
