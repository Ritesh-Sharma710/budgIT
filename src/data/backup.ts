/**
 * Backup, export, restore and migration.
 *
 * A single portable JSON document describes everything the user owns. That
 * document is what "Export data" downloads, what "Restore" consumes, and what
 * a future Google Sheets migration will read from and write to.
 */

import { db, TABLES, type TableName } from "./db";
import type {
  AppSettings,
  Category,
  CategoryBudget,
  GoalContribution,
  MonthlyBudget,
  PaymentMethod,
  RecurringRule,
  SavingsGoal,
  Transaction,
} from "@/domain/types";
import { SCHEMA_VERSION } from "@/domain/types";
import { nowISO } from "@/lib/date";
import { isTransactionLike } from "@/domain/validation";

export interface BackupData {
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  budgets: MonthlyBudget[];
  categoryBudgets: CategoryBudget[];
  goals: SavingsGoal[];
  goalContributions: GoalContribution[];
  recurring: RecurringRule[];
  settings: AppSettings[];
}

export interface BackupPayload {
  app: "budgIT";
  schemaVersion: number;
  exportedAt: string;
  counts: Partial<Record<TableName, number>>;
  data: BackupData;
}

const EMPTY_DATA: BackupData = {
  transactions: [],
  categories: [],
  paymentMethods: [],
  budgets: [],
  categoryBudgets: [],
  goals: [],
  goalContributions: [],
  recurring: [],
  settings: [],
};

export async function collectAll(): Promise<BackupData> {
  const [
    transactions,
    categories,
    paymentMethods,
    budgets,
    categoryBudgets,
    goals,
    goalContributions,
    recurring,
    settings,
  ] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.paymentMethods.toArray(),
    db.budgets.toArray(),
    db.categoryBudgets.toArray(),
    db.goals.toArray(),
    db.goalContributions.toArray(),
    db.recurring.toArray(),
    db.settings.toArray(),
  ]);

  return {
    transactions,
    categories,
    paymentMethods,
    budgets,
    categoryBudgets,
    goals,
    goalContributions,
    recurring,
    settings,
  };
}

export async function exportAll(): Promise<BackupPayload> {
  const data = await collectAll();
  const counts: Partial<Record<TableName, number>> = {};
  for (const name of TABLES) {
    counts[name] = data[name as keyof BackupData]?.length ?? 0;
  }
  return { app: "budgIT", schemaVersion: SCHEMA_VERSION, exportedAt: nowISO(), counts, data };
}

export function serializeBackup(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

export interface BackupValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  payload?: BackupPayload;
}

export function validateBackup(input: unknown): BackupValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["The file is not valid JSON."], warnings };
  }
  const raw = input as Partial<BackupPayload> & { data?: Partial<BackupData> };

  if (raw.app !== undefined && raw.app !== "budgIT") {
    warnings.push("This file was not created by budgIT. Import at your own risk.");
  }
  if (typeof raw.schemaVersion !== "number") {
    warnings.push("Missing schema version — assuming the current version.");
  } else if (raw.schemaVersion > SCHEMA_VERSION) {
    errors.push(
      `The backup uses schema v${raw.schemaVersion}, which is newer than this app (v${SCHEMA_VERSION}). Update the app first.`,
    );
  }

  const data = raw.data;
  if (!data || typeof data !== "object") {
    errors.push("The file is missing its `data` section.");
    return { ok: false, errors, warnings };
  }

  const normalized: BackupData = { ...EMPTY_DATA };
  for (const key of Object.keys(EMPTY_DATA) as (keyof BackupData)[]) {
    const value = (data as unknown as Record<string, unknown>)[key];
    if (value === undefined) {
      warnings.push(`No "${key}" section found — that data will be left untouched.`);
      continue;
    }
    if (!Array.isArray(value)) {
      errors.push(`"${key}" must be an array.`);
      continue;
    }
    (normalized[key] as unknown[]) = value;
  }

  const badTransactions = normalized.transactions.filter((t) => !isTransactionLike(t));
  if (badTransactions.length > 0) {
    errors.push(`${badTransactions.length} transaction(s) are missing required fields or have invalid dates.`);
  }

  // Referential sanity: warn (do not fail) about transactions pointing at unknown categories.
  const categoryIds = new Set(normalized.categories.map((c) => c.id));
  if (categoryIds.size > 0) {
    const orphans = normalized.transactions.filter((t) => !categoryIds.has(t.categoryId));
    if (orphans.length > 0) {
      warnings.push(`${orphans.length} transaction(s) reference categories that are not in this backup.`);
    }
  }

  const payload: BackupPayload = {
    app: "budgIT",
    schemaVersion: typeof raw.schemaVersion === "number" ? raw.schemaVersion : SCHEMA_VERSION,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : nowISO(),
    counts: raw.counts ?? {},
    data: normalized,
  };

  return { ok: errors.length === 0, errors, warnings, payload };
}

export type ImportStrategy = "merge" | "replace";

export interface ImportPreview {
  incoming: Partial<Record<TableName, number>>;
  current: Partial<Record<TableName, number>>;
  newRecords: number;
  updatedRecords: number;
  conflicts: { table: TableName; id: string }[];
  warnings: string[];
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}

/** Dry-run an import so the user can confirm before anything is written. */
export async function previewImport(payload: BackupPayload): Promise<ImportPreview> {
  const current = await collectAll();
  const conflicts: ImportPreview["conflicts"] = [];
  let newRecords = 0;
  let updatedRecords = 0;

  const tables: TableName[] = [...TABLES];

  for (const table of tables) {
    const incoming = payload.data[table as keyof BackupData] as { id: string; updatedAt?: string }[];
    if (!incoming?.length) continue;
    const existing = indexById(current[table as keyof BackupData] as { id: string; updatedAt?: string }[]);

    for (const record of incoming) {
      const match = existing.get(record.id);
      if (!match) {
        newRecords += 1;
      } else {
        updatedRecords += 1;
        if (match.updatedAt && record.updatedAt && match.updatedAt !== record.updatedAt) {
          conflicts.push({ table, id: record.id });
        }
      }
    }
  }

  const incomingCounts: Partial<Record<TableName, number>> = {};
  const currentCounts: Partial<Record<TableName, number>> = {};
  for (const table of tables) {
    incomingCounts[table] = (payload.data[table as keyof BackupData] as unknown[]).length;
    currentCounts[table] = (current[table as keyof BackupData] as unknown[]).length;
  }

  return {
    incoming: incomingCounts,
    current: currentCounts,
    newRecords,
    updatedRecords,
    conflicts,
    warnings:
      conflicts.length > 0
        ? [`${conflicts.length} record(s) already exist with different timestamps. The newer copy wins (last-write-wins).`]
        : [],
  };
}

export interface ImportResult {
  imported: Partial<Record<TableName, number>>;
  strategy: ImportStrategy;
}

/**
 * Apply a validated backup.
 * - `replace` wipes local data first (the user was warned and exported a rollback file).
 * - `merge` is last-write-wins on `updatedAt`, which is deterministic and never
 *   silently discards a newer record.
 */
export async function importAll(
  payload: BackupPayload,
  strategy: ImportStrategy = "merge",
): Promise<ImportResult> {
  const imported: Partial<Record<TableName, number>> = {};

  await db.transaction(
    "rw",
    [
      db.transactions,
      db.categories,
      db.paymentMethods,
      db.budgets,
      db.categoryBudgets,
      db.goals,
      db.goalContributions,
      db.recurring,
      db.settings,
    ],
    async () => {
      if (strategy === "replace") {
        await Promise.all(TABLES.map((name) => db.table(name).clear()));
      }

      const backup: BackupData = { ...EMPTY_DATA, ...payload.data };

      const mergeTable = async (tableName: TableName, rows: { id: string; updatedAt?: string }[]) => {
        if (!rows.length) return;
        if (strategy === "replace") {
          await db.table(tableName).bulkPut(rows);
          imported[tableName] = rows.length;
          return;
        }
        const existing = await db.table(tableName).toArray();
        const byId = indexById(existing as { id: string; updatedAt?: string }[]);
        const winners: { id: string }[] = [];
        for (const record of rows) {
          const match = byId.get(record.id);
          if (!match) winners.push(record);
          else if (!match.updatedAt || !record.updatedAt || record.updatedAt >= match.updatedAt) winners.push(record);
        }
        if (winners.length) await db.table(tableName).bulkPut(winners);
        imported[tableName] = winners.length;
      };

      await mergeTable("categories", backup.categories);
      await mergeTable("paymentMethods", backup.paymentMethods);
      await mergeTable("transactions", backup.transactions);
      await mergeTable("budgets", backup.budgets);
      await mergeTable("categoryBudgets", backup.categoryBudgets);
      await mergeTable("goals", backup.goals);
      await mergeTable("goalContributions", backup.goalContributions);
      await mergeTable("recurring", backup.recurring);
      await mergeTable("settings", backup.settings);
    },
  );

  return { imported, strategy };
}

/** Erase every locally stored financial record. */
export async function clearAll(): Promise<void> {
  await Promise.all(TABLES.map((name) => db.table(name).clear()));
}

export async function countsByTable(): Promise<Partial<Record<TableName, number>>> {
  const entries = await Promise.all(
    TABLES.map(async (name) => [name, await db.table(name).count()] as const),
  );
  return Object.fromEntries(entries) as Partial<Record<TableName, number>>;
}
