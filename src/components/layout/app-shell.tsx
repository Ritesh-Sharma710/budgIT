import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, SidebarFooter, SidebarNav, Brand } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileTabBar } from "./mobile-tab-bar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog";
import { useUIStore } from "@/state/ui";

export function AppShell() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" aria-describedby={undefined}>
          <div className="border-b border-sidebar-border px-4 py-4">
            <Brand />
            <SheetTitle className="sr-only">Navigation</SheetTitle>
          </div>
          <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          <SidebarFooter />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onAddTransaction={() => setAddOpen(true)} />
        <main className="flex-1 px-3 py-4 pb-24 sm:px-4 sm:py-5 lg:px-6 lg:pb-8">
          <Outlet />
        </main>
        <MobileTabBar />
      </div>

      <TransactionDialog open={addOpen} onOpenChange={setAddOpen} />
      <OnboardingDialog />
    </div>
  );
}
