import { useLocation } from "react-router-dom";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthSelector } from "./month-selector";
import { ThemeToggle } from "./theme-toggle";
import { Brand } from "./sidebar";
import { findNavItem } from "./nav-items";
import { useUIStore } from "@/state/ui";

export function Topbar({ onAddTransaction }: { onAddTransaction: () => void }) {
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const location = useLocation();
  const current = findNavItem(location.pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu />
        </Button>

        <div className="lg:hidden">
          <Brand compact />
        </div>

        <div className="hidden min-w-0 flex-col lg:flex">
          <h1 className="truncate text-base font-semibold tracking-tight">{current?.label ?? "budgIT"}</h1>
          {current?.description ? (
            <p className="truncate text-xs text-muted-foreground">{current.description}</p>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <MonthSelector className="hidden sm:flex" />
          <Button size="sm" onClick={onAddTransaction} className="shrink-0">
            <Plus />
            <span className="hidden sm:inline">Add</span>
            <span className="sr-only sm:hidden">Add transaction</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
      <div className="px-3 pb-2.5 sm:hidden">
        <MonthSelector className="w-full justify-between" />
      </div>
    </header>
  );
}
