import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}

export function MetricCard({ label, value, delta, hint, icon: Icon, className }: MetricCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/8 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
              positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="truncate text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
