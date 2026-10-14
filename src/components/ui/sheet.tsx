import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Slide-over panel. Used for the mobile navigation drawer and for filters on
 * small screens. Escape closes it and focus is trapped while open.
 */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & { side?: "left" | "right" | "bottom" }
>(({ className, children, side = "left", ...props }, ref) => (
  <SheetPrimitive.Portal>
    <SheetPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      )}
    />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex flex-col gap-0 border-border bg-card text-card-foreground shadow-lg transition ease-in-out",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        side === "left" && "inset-y-0 left-0 h-full w-[17rem] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        side === "right" && "inset-y-0 right-0 h-full w-[19rem] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        side === "bottom" && "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Close"
      >
        <X className="size-4" />
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

export const SheetTitle = SheetPrimitive.Title;
export const SheetDescription = SheetPrimitive.Description;
