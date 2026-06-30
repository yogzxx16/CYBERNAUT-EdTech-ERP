import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            {last || !c.to ? (
              <span className="font-medium text-foreground">{c.label}</span>
            ) : (
              <Link to={c.to} className="hover:text-foreground">{c.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
