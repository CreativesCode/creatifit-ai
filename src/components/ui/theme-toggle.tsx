"use client";
import { useTheme } from "next-themes";
import { Button } from "./button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(nextTheme)}
      className="px-3 py-2"
    >
      {nextTheme === "dark" ? (
        <>
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </>
      ) : (
        <>
          <Sun className="h-4 w-4 mr-2" />
          Light
        </>
      )}
    </Button>
  );
}
