import { useEffect, useState, useMemo } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity as ActivityIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FilePlus2,
  FolderPlus,
  FolderCheck,
  ClipboardList,
  UserPlus,
  Clock,
  Receipt,
  PlaneTakeoff,
  Calendar,
  Megaphone,
  MessageSquare,
  LifeBuoy,
  Upload,
  Loader2,
  Inbox,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { activitiesApi, type Activity } from "@/services/activities.service";

const ACTION_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; cls: string }
> = {
  "project.create": { icon: FolderPlus, label: "Created project", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
  "project.update": { icon: FolderPlus, label: "Updated project", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
  "project.complete": { icon: FolderCheck, label: "Completed project", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  "task.create": { icon: ClipboardList, label: "Created task", cls: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" },
  "task.assign": { icon: UserPlus, label: "Assigned task", cls: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" },
  "task.complete": { icon: CheckCircle2, label: "Completed task", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  "submission.create": { icon: FilePlus2, label: "Submitted", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  "submission.approve": { icon: CheckCircle2, label: "Approved submission", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  "submission.reject": { icon: XCircle, label: "Rejected submission", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
  "submission.changes_requested": { icon: AlertCircle, label: "Requested changes", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  "attendance.mark": { icon: Clock, label: "Attendance", cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" },
  "leave.approve": { icon: PlaneTakeoff, label: "Leave", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  "salary.generate": { icon: Receipt, label: "Salary slip", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  "event.create": { icon: Calendar, label: "Event", cls: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300" },
  "announcement.publish": { icon: Megaphone, label: "Announcement", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  "discussion.post": { icon: MessageSquare, label: "Discussion", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  "ticket.resolve": { icon: LifeBuoy, label: "Ticket resolved", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
  "attachment.upload": { icon: Upload, label: "Uploaded files", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
};

function initials(name?: string) {
  if (!name) return "·";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "·";
}

export interface ActivityTimelineProps {
  /** Show activities scoped to a single entity (e.g. project, task, user). */
  entity?: string;
  entityId?: string;
  /** Show global feed, optionally filtered by actor user id. */
  actor?: string;
  limit?: number;
  className?: string;
  emptyMessage?: string;
  title?: string;
}

export function ActivityTimeline({
  entity,
  entityId,
  actor,
  limit = 20,
  className,
  emptyMessage = "No activity yet",
  title,
}: ActivityTimelineProps) {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const res =
          entity && entityId
            ? await activitiesApi.forEntity(entity, entityId, { limit })
            : await activitiesApi.list({ limit, actor });
        if (!cancelled) setItems(res.items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load activity");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [entity, entityId, actor, limit]);

  const grouped = useMemo(() => items, [items]);

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card/50 p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <ActivityIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold leading-tight">{title ?? "Activity"}</h3>
          <p className="text-[10px] text-muted-foreground">
            {loading ? "Loading…" : `${items.length} recent event${items.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-2.5 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Inbox className="h-5 w-5" />
          </div>
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <ol className="relative space-y-3 border-l border-border/60 pl-4">
          <AnimatePresence initial={false}>
            {grouped.map((a, idx) => {
              const meta = ACTION_META[a.action] ?? {
                icon: ActivityIcon,
                label: a.action,
                cls: "bg-muted text-foreground",
              };
              const Icon = meta.icon;
              const name = a.actor?.name ?? a.actorName ?? "System";
              return (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                  className="relative"
                >
                  <span
                    className={cn(
                      "absolute -left-[22px] top-1 grid h-6 w-6 place-items-center rounded-full ring-2 ring-card",
                      meta.cls,
                    )}
                    aria-hidden
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      {a.actor?.avatarUrl ? (
                        <AvatarImage src={a.actor.avatarUrl} alt={name} />
                      ) : null}
                      <AvatarFallback className="text-[10px] font-medium">
                        {initials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm font-semibold text-foreground">{name}</span>
                        {(a.actor?.role ?? a.actorRole) && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase tracking-wide">
                            {(a.actor?.role ?? a.actorRole)!.replace(/_/g, " ")}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{meta.label}</span>
                      </div>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {a.summary}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/80">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDistanceToNow(parseISO(a.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}

export default ActivityTimeline;
