import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AlertProps {
  children: ReactNode;
  type?: "error" | "success" | "warning" | "info";
  className?: string;
}

export function Alert({ children, type = "info", className }: AlertProps) {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-800",
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const icons = {
    error: "✕",
    success: "✓",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        styles[type],
        className
      )}
    >
      <span className="font-bold mt-0.5 shrink-0">{icons[type]}</span>
      <span>{children}</span>
    </div>
  );
}
