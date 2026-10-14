import { Toaster as SonnerToaster } from "sonner";
import { useIsMobile } from "@/hooks/use-media-query";
import { useSettings } from "@/state/hooks";

/**
 * Toast host.
 *
 * Positioned top-centre on phones (thumb-reachable is not a concern for a
 * passive notification, and it avoids being hidden behind the browser chrome or
 * the mobile tab bar) and bottom-right on larger screens. Toasts are always
 * announced to screen readers via sonner's aria-live region.
 */
export function Toaster() {
  const isMobile = useIsMobile();
  const { theme } = useSettings();

  return (
    <SonnerToaster
      position={isMobile ? "top-center" : "bottom-right"}
      theme={theme === "system" ? "system" : theme}
      richColors
      closeButton
      duration={4500}
      visibleToasts={isMobile ? 3 : 4}
      toastOptions={{
        classNames: {
          toast: "bg-card text-card-foreground border border-border shadow-lg",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
      style={{ "--width": isMobile ? "calc(100vw - 2rem)" : "380px" } as React.CSSProperties}
    />
  );
}
