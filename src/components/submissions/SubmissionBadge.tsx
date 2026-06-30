import type { SubmissionStatus } from "@/services/tasks.service";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock3,
  XCircle,
  AlertTriangle,
  CircleDashed,
} from "lucide-react";

const META: Record<SubmissionStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  none: {
    label: "Not submitted",
    cls: "bg-muted text-muted-foreground border-border",
    Icon: CircleDashed,
  },
  pending_review: {
    label: "Pending review",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    Icon: Clock3,
  },
  approved: {
    label: "Approved",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    cls: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    Icon: XCircle,
  },
  changes_requested: {
    label: "Changes requested",
    cls: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    Icon: AlertTriangle,
  },
};

export function SubmissionBadge({
  status,
  className,
  showIcon = true,
}: {
  status: SubmissionStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const m = META[status] ?? META.none;
  const Icon = m.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        m.cls,
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {m.label}
    </span>
  );
}
