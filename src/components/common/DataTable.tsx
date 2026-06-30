import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyState?: ReactNode;
  rowKey?: (row: T, index: number) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  emptyState,
  rowKey,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-10">{emptyState}</div>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-muted/30">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => (
              <tr
                key={rowKey?.(row, i) ?? i}
                className="group transition-colors hover:bg-accent/40 focus-within:bg-accent/40"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn("px-4 py-3.5 align-middle text-foreground", c.className)}
                  >
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
