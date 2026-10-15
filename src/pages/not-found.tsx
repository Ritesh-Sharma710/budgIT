import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-sm">
        <Compass className="size-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you are looking for doesn't exist or has moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link to="/">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
