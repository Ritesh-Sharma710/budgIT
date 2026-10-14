import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { settingsRepo } from "@/data/repositories";
import { useSettings } from "@/state/hooks";
import type { Theme } from "@/domain/types";
import { toast } from "sonner";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

export function ThemeToggle() {
  const { theme } = useSettings();
  const Active = theme === "dark" ? Moon : theme === "light" ? Sun : Laptop;

  const setTheme = async (next: Theme) => {
    await settingsRepo.patch({ theme: next });
    toast.success(`Theme set to ${next}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Theme: ${theme}. Change theme`}>
          <Active />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => void setTheme(option.value)}>
            <option.icon />
            {option.label}
            {theme === option.value ? <span className="ml-auto text-xs text-muted-foreground">Active</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
