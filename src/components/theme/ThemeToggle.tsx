"use client";

import React, { useSyncExternalStore } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme, Theme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "icon" | "segmented";
  className?: string;
}

const emptySubscribe = () => () => {};

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return (
      <div className={cn("h-8 w-8 rounded-lg border border-stone-200 dark:border-stone-700 bg-transparent", className)} />
    );
  }

  if (variant === "segmented") {
    const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
      { value: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
      { value: "dark", label: "Dark", icon: <Moon className="h-3.5 w-3.5" /> },
      { value: "system", label: "System", icon: <Laptop className="h-3.5 w-3.5" /> },
    ];

    return (
      <div className={cn("inline-flex items-center rounded-xl bg-stone-100 dark:bg-stone-800/80 p-1 border border-stone-200/80 dark:border-stone-700", className)}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
              theme === opt.value
                ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // Icon toggle button (cycles light -> dark -> system)
  const handleToggle = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:border-stone-300 dark:hover:border-stone-600 transition-colors shadow-2xs",
        className
      )}
      title={`Current: ${theme} theme (Click to toggle)`}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Moon className="h-4 w-4 text-emerald-400" />
      ) : (
        <Sun className="h-4 w-4 text-amber-600" />
      )}
    </button>
  );
}
