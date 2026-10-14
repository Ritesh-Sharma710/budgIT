import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ensureSeeded, recurringRepo } from "@/data/repositories";
import { currentMonthKey } from "@/lib/date";

/**
 * One-time client bootstrap: seed default categories / payment methods /
 * settings, then materialise any recurring rules that are due this month.
 * Runs once per page load and is safe to repeat.
 */
export function useBootstrap(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureSeeded();
        const generated = await recurringRepo.generateForMonth(currentMonthKey());
        if (generated > 0 && !cancelled) {
          toast.info(`${generated} recurring transaction${generated === 1 ? "" : "s"} added for this month.`);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error("Could not open the local database. Storage may be blocked in this browser mode.");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
