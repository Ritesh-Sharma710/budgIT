import { useEffect } from "react";
import { useSettings } from "@/state/hooks";

/**
 * Applies the persisted theme to <html>. "system" follows the OS setting live,
 * so a user who switches their laptop to dark mode sees the app follow.
 */
export function useThemeEffect(): void {
  const { theme } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };

    apply();
    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
    return undefined;
  }, [theme]);
}
