import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warm" | "subtle";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-stone-900 text-stone-50 border-transparent",
    secondary: "bg-stone-100 text-stone-800 border-stone-200",
    outline: "border-stone-300 text-stone-700 bg-white",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warm: "bg-amber-50 text-amber-850 border-amber-200 text-amber-900",
    subtle: "bg-stone-100 text-stone-600 border-transparent",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
