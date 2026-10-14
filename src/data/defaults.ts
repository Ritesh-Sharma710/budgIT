import type { AppSettings, Category, DashboardWidgetPref, PaymentMethod } from "@/domain/types";
import { SCHEMA_VERSION } from "@/domain/types";
import { DEFAULT_BUDGET_THRESHOLDS, DEFAULT_CATEGORIES, PAYMENT_METHODS, WIDGET_META } from "@/domain/constants";
import { nowISO } from "@/lib/date";

export function defaultDashboardLayout(): DashboardWidgetPref[] {
  return WIDGET_META.map((meta, index) => ({
    id: meta.id,
    visible: meta.defaultVisible,
    order: index,
    size: meta.defaultSize,
  }));
}

export function defaultSettings(): AppSettings {
  const now = nowISO();
  return {
    id: "app",
    currency: "INR",
    locale: "en-IN",
    theme: "system",
    storageMode: "local",
    budgetThresholds: [...DEFAULT_BUDGET_THRESHOLDS],
    countContributionsAsExpenses: false,
    hideTransfersFromReports: true,
    weekStartsOn: 1,
    onboardingCompleted: false,
    approximateMonthlyIncome: null,
    dashboard: defaultDashboardLayout(),
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function seedCategories(): Category[] {
  const now = nowISO();
  return DEFAULT_CATEGORIES.map((c, index) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    parentId: null,
    icon: c.icon,
    color: c.color,
    isSystem: true,
    archivedAt: null,
    order: index,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  }));
}

export function seedPaymentMethods(): PaymentMethod[] {
  const now = nowISO();
  return PAYMENT_METHODS.map((pm) => ({ ...pm, createdAt: now, updatedAt: now, schemaVersion: SCHEMA_VERSION }));
}
