import { NavLink } from "react-router-dom";
import { HardDrive, PieChart } from "lucide-react";
import { NAV_SECTIONS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { useSettings } from "@/state/hooks";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <PieChart className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight">budgIT</span>
        {!compact ? <span className="block text-xs text-muted-foreground">Budget &amp; savings tracker</span> : null}
      </span>
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main navigation">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function SidebarFooter() {
  const { storageMode } = useSettings();
  return (
    <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-3 py-3">
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <HardDrive className="size-3.5" />
        {storageMode === "local" ? "On this device" : "Google Sheets"}
      </span>
      <ThemeToggle />
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Brand />
      </div>
      <SidebarNav />
      <SidebarFooter />
    </aside>
  );
}
