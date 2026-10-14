import { NavLink } from "react-router-dom";
import { BarChart3, LayoutDashboard, ReceiptText, Target, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Activity", icon: ReceiptText },
  { to: "/budgets", label: "Budgets", icon: Wallet },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/reports/monthly", label: "Reports", icon: BarChart3 },
];

/**
 * Thumb-reachable bottom navigation for phones. Hidden from desktop, respects
 * the iOS safe area, and marks the active route for assistive technology.
 */
export function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
                      >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("size-5", isActive && "stroke-[2.5]")} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
