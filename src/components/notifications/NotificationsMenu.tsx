import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  Megaphone,
  Receipt,
  PlaneTakeoff,
  FolderKanban,
  Clock,
  LifeBuoy,
  Inbox,
  Loader2,
  BellOff,
  FileCheck2,
  Settings2,
  MailOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { notificationsApi, type Notification } from "@/services/notifications.service";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Category meta — derived from notification.type / title
// ────────────────────────────────────────────────────────────

type FilterKey =
  | "all"
  | "unread"
  | "submission"
  | "system"
  | "announcement"
  | "salary"
  | "leave"
  | "project"
  | "attendance"
  | "support";

type CategoryKey = Exclude<FilterKey, "all" | "unread" | "system">;

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  cls: string;
  dot: string;
  match: RegExp;
}[] = [
  { key: "submission", label: "Submissions", short: "Submit", icon: FileCheck2, cls: "bg-violet-500/15 text-violet-600 dark:text-violet-300", dot: "bg-violet-500", match: /submission|approved|rejected|changes? requested|file\.uploaded|file uploaded|uploaded/i },
  { key: "announcement", label: "Announcements", short: "Announce", icon: Megaphone, cls: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300", dot: "bg-fuchsia-500", match: /announc|news|broadcast/i },
  { key: "salary", label: "Salary", short: "Salary", icon: Receipt, cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-500", match: /salary|payroll|payslip|slip/i },
  { key: "leave", label: "Leave", short: "Leave", icon: PlaneTakeoff, cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300", dot: "bg-amber-500", match: /leave|holiday|vacation|absence/i },
  { key: "project", label: "Projects", short: "Projects", icon: FolderKanban, cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300", dot: "bg-blue-500", match: /project|task|milestone|assign|completed/i },
  { key: "attendance", label: "Attendance", short: "Attend", icon: Clock, cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300", dot: "bg-cyan-500", match: /attend|check.?in|check.?out|clock/i },
  { key: "support", label: "Support", short: "Support", icon: LifeBuoy, cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300", dot: "bg-rose-500", match: /support|ticket|issue|help|resolved/i },
];

const DEFAULT_META = { icon: Bell, cls: "bg-muted text-foreground", dot: "bg-muted-foreground" };

const SYSTEM_RX = /password|profile\.updated|password\.changed|^system/i;

function categoryFor(n: Notification) {
  const hay = `${n.type ?? ""} ${n.title ?? ""} ${n.body ?? ""}`;
  for (const c of CATEGORIES) if (c.match.test(hay)) return c;
  return null;
}

function detectKey(n: Notification): CategoryKey | "system" | null {
  const hay = `${n.type ?? ""} ${n.title ?? ""} ${n.body ?? ""}`;
  if (SYSTEM_RX.test(hay)) return "system";
  return categoryFor(n)?.key ?? null;
}

// ────────────────────────────────────────────────────────────
// Grouping
// ────────────────────────────────────────────────────────────

type Group = "Today" | "Yesterday" | "Earlier";
function groupOf(iso: string): Group {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return "Earlier";
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export function NotificationsMenu({
  unread,
  onChanged,
}: {
  unread: number;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (p: number, replace = false) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await notificationsApi.list({ page: p, limit: PAGE_SIZE });
      setItems((prev) => (replace ? res.data : [...prev, ...res.data]));
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load when opening
  useEffect(() => {
    if (open) {
      void loadPage(1, true);
    }
  }, [open, loadPage]);

  // Infinite scroll observer
  useEffect(() => {
    if (!open) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && !loadingMore && !loading && page < totalPages) {
          void loadPage(page + 1);
        }
      },
      { root: scrollRef.current, rootMargin: "120px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [open, page, totalPages, loading, loadingMore, loadPage]);

  // Filter + group
  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "unread") return items.filter((n) => !n.read);
    return items.filter((n) => detectKey(n) === filter);
  }, [items, filter]);

  const grouped = useMemo(() => {
    const m = new Map<Group, Notification[]>([
      ["Today", []],
      ["Yesterday", []],
      ["Earlier", []],
    ]);
    for (const n of filtered) m.get(groupOf(n.createdAt))!.push(n);
    return [...m.entries()].filter(([, arr]) => arr.length > 0);
  }, [filtered]);

  const filterCounts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: items.length,
      unread: 0,
      submission: 0,
      system: 0,
      announcement: 0,
      salary: 0,
      leave: 0,
      project: 0,
      attendance: 0,
      support: 0,
    };
    for (const n of items) {
      if (!n.read) c.unread++;
      const k = detectKey(n);
      if (k) c[k]++;
    }
    return c;
  }, [items]);

  async function markAll() {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      onChanged();
    } catch {
      /* ignore */
    }
  }

  async function openItem(n: Notification) {
    try {
      if (!n.read) {
        await notificationsApi.markRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        onChanged();
      }
      if (n.link) {
        setOpen(false);
        navigate({ to: n.link as never });
      }
    } catch {
      /* ignore */
    }
  }

  async function markOne(e: React.MouseEvent, n: Notification) {
    e.stopPropagation();
    if (n.read) return;
    try {
      await notificationsApi.markRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      onChanged();
    } catch {
      /* ignore */
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-2xl transition-transform hover:scale-105 active:scale-95"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <motion.span
            key={unread}
            initial={unread > 0 ? { rotate: -12 } : false}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 12 }}
            className="inline-flex"
          >
            <Bell className="h-4 w-4" />
          </motion.span>
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-card"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[calc(100vw-1.5rem)] max-w-[400px] overflow-hidden rounded-2xl border-border/80 p-0 shadow-elevated sm:w-96"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Notifications</p>
              <p className="text-[10px] text-muted-foreground">
                {unread > 0 ? `${unread} unread` : "You're all caught up"}
              </p>
            </div>
          </div>
          <button
            onClick={markAll}
            disabled={unread === 0}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
          >
            <CheckCheck className="h-3 w-3" /> Mark all read
          </button>
        </div>

        {/* Filter chips */}
        <div className="border-b border-border bg-muted/30 px-2 py-2">
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              icon={Inbox}
              label="All"
              count={filterCounts.all}
              activeCls="bg-foreground text-background"
            />
            <FilterChip
              active={filter === "unread"}
              onClick={() => setFilter("unread")}
              icon={MailOpen}
              label="Unread"
              count={filterCounts.unread}
              activeCls="bg-primary text-primary-foreground"
            />
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c.key}
                active={filter === c.key}
                onClick={() => setFilter(c.key)}
                icon={c.icon}
                label={c.short}
                count={filterCounts[c.key]}
                activeCls={c.cls + " ring-1 ring-current/30"}
              />
            ))}
            <FilterChip
              active={filter === "system"}
              onClick={() => setFilter("system")}
              icon={Settings2}
              label="System"
              count={filterCounts.system}
              activeCls="bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-1 ring-current/30"
            />
          </div>
        </div>

        {/* List */}
        <div ref={scrollRef} className="max-h-[60vh] min-h-[200px] overflow-y-auto sm:max-h-96">
          {loading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4].map((i) => <NotificationSkeleton key={i} />)}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <AnimatePresence initial={false}>
              {grouped.map(([g, arr]) => (
                <motion.section
                  key={g}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-1"
                >
                  <div className="sticky top-0 z-10 flex items-center gap-2 bg-popover/95 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    <span>{g}</span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="tabular-nums">{arr.length}</span>
                  </div>
                  <ul>
                    {arr.map((n, idx) => (
                      <motion.li
                        key={n.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.015, 0.15) }}
                      >
                        <NotificationItem
                          notif={n}
                          onOpen={() => openItem(n)}
                          onMarkRead={(e) => markOne(e, n)}
                        />
                      </motion.li>
                    ))}
                  </ul>
                </motion.section>
              ))}

              {/* Sentinel & loader */}
              <div ref={sentinelRef} className="h-2" />
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading more…
                </div>
              )}
              {!loadingMore && page >= totalPages && filtered.length > 0 && (
                <p className="py-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  · End ·
                </p>
              )}
            </AnimatePresence>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  activeCls,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  activeCls: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1 text-[11px] font-medium transition-all",
        active ? activeCls : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      {count > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[9px] tabular-nums",
            active ? "bg-background/30" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function NotificationItem({
  notif,
  onOpen,
  onMarkRead,
}: {
  notif: Notification;
  onOpen: () => void;
  onMarkRead: (e: React.MouseEvent) => void;
}) {
  const cat = categoryFor(notif);
  const Icon = cat?.icon ?? DEFAULT_META.icon;
  const cls = cat?.cls ?? DEFAULT_META.cls;

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className={cn(
        "group relative flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
        !notif.read && "bg-primary/[0.04]",
      )}
    >
      {/* Unread strip */}
      {!notif.read && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-primary" aria-hidden />
      )}

      <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", cls)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className={cn("flex-1 truncate text-sm", !notif.read ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>
            {notif.title}
          </p>
          {!notif.read && (
            <button
              type="button"
              onClick={onMarkRead}
              className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-primary group-hover:opacity-100"
              aria-label="Mark as read"
              title="Mark as read"
            >
              <Check className="h-3 w-3" />
            </button>
          )}
        </div>
        {notif.body && (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            {notif.body}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          <span>{formatDistanceToNow(parseISO(notif.createdAt), { addSuffix: true })}</span>
          {cat && (
            <>
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", cat.dot)} />
                {cat.label}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/4 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-2.5 w-1/3 rounded" />
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterKey }) {
  const isFiltered = filter !== "all";
  return (
    <div className="grid place-items-center px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        {isFiltered ? <BellOff className="h-6 w-6" /> : <Inbox className="h-6 w-6" />}
      </div>
      <p className="mt-3 text-sm font-medium">
        {isFiltered ? "Nothing in this category" : "You're all caught up"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltered ? "Try a different filter to see more notifications." : "New notifications will appear here."}
      </p>
    </div>
  );
}
