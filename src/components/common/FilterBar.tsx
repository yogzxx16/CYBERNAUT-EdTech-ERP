import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FilterBarProps {
  children?: ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-soft">
      <Button variant="outline" size="sm" className="gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
      </Button>
      <div className="h-5 w-px bg-border" />
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
