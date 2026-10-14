import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarRange,
  Database,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  Settings as SettingsIcon,
  Target,
  Wallet,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  description: string;
  /** Shown in the mobile tab bar. */
  primary?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        to: "/",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Your month at a glance",
        primary: true,
      },
      {
        to: "/transactions",
        label: "Transactions",
        shortLabel: "Transactions",
        icon: ReceiptText,
        description: "Record and review activity",
        primary: true,
      },
      {
        to: "/budgets",
        label: "Budgets",
        icon: Wallet,
        description: "Plan and track monthly limits",
        primary: true,
      },
      {
        to: "/goals",
        label: "Savings Goals",
        shortLabel: "Goals",
        icon: Target,
        description: "Fund what matters",
        primary: true,
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        to: "/reports/monthly",
        label: "Monthly Report",
        shortLabel: "Monthly",
        icon: CalendarRange,
        description: "Month-level breakdown",
      },
      {
        to: "/reports/annual",
        label: "Annual Report",
        shortLabel: "Annual",
        icon: BarChart3,
        description: "The whole year in one view",
      },
    ],
  },
  {
    title: "Data & settings",
    items: [
      {
        to: "/data",
        label: "Google Sheets & Data",
        shortLabel: "Data",
        icon: Database,
        description: "Storage, backup and import/export",
      },
      {
        to: "/settings",
        label: "Settings",
        icon: SettingsIcon,
        description: "Categories, currency and preferences",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export const MOBILE_TAB_ITEMS: NavItem[] = [
  ...ALL_NAV_ITEMS.filter((item) => item.primary),
  { to: "/reports/monthly", label: "Reports", icon: BarChart3, description: "Monthly and annual reports" },
];

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") return ALL_NAV_ITEMS[0];
  return (
    ALL_NAV_ITEMS.find((item) => item.to !== "/" && pathname.startsWith(item.to)) ?? undefined
  );
}

export const QUICK_ADD_ICON = PiggyBank;
