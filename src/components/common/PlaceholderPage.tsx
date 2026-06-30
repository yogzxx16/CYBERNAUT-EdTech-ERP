import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import type { LucideIcon } from "lucide-react";

export interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function PlaceholderPage({
  title,
  description,
  icon,
  emptyTitle = "Nothing here yet",
  emptyDescription = "This module is part of the foundation. Functionality will be wired in a later iteration.",
}: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-2xl border border-border bg-card p-10 shadow-soft">
        <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
      </div>
    </div>
  );
}
