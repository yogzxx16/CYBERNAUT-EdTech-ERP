import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Check,
  X,
  Ban,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Filter,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sun,
  Heart,
  Coffee,
  Baby,
  CircleMinus,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchBar } from "@/components/common/SearchBar";
import { FilterBar } from "@/components/common/FilterBar";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/store/hooks";
import {
  leavesApi,
  type CreateLeaveInput,
  type Leave,
  type LeaveStatus,
  type LeaveType,
} from "@/services/leaves.service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/leave-requests")({
  component: LeaveRequestsPage,
});

const LEAVE_TYPES: LeaveType[] = ["casual", "sick", "earned", "unpaid", "maternity", "paternity"];

const STATUS_TONE: Record<LeaveStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "muted",
};

const TYPE_META: Record<
  LeaveType,
  { icon: typeof Sun; label: string; color: string; bg: string; ring: string; quota: number }
> = {
  casual: { icon: Coffee, label: "Casual", color: "text-amber-600 dark:text-amber-300", bg: "from-amber-500 to-orange-500", ring: "ring-amber-400/30", quota: 12 },
  sick: { icon: Heart, label: "Sick", color: "text-rose-600 dark:text-rose-300", bg: "from-rose-500 to-pink-500", ring: "ring-rose-400/30", quota: 10 },
  earned: { icon: Sun, label: "Earned", color: "text-emerald-600 dark:text-emerald-300", bg: "from-emerald-500 to-teal-500", ring: "ring-emerald-400/30", quota: 15 },
  unpaid: { icon: CircleMinus, label: "Unpaid", color: "text-slate-600 dark:text-slate-300", bg: "from-slate-500 to-slate-600", ring: "ring-slate-400/30", quota: 30 },
  maternity: { icon: Baby, label: "Maternity", color: "text-fuchsia-600 dark:text-fuchsia-300", bg: "from-fuchsia-500 to-pink-500", ring: "ring-fuchsia-400/30", quota: 180 },
  paternity: { icon: Baby, label: "Paternity", color: "text-violet-600 dark:text-violet-300", bg: "from-violet-500 to-indigo-500", ring: "ring-violet-400/30", quota: 15 },
};

function fmt(s: string) {
  return s.replace(/_/g, " ");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function LeaveRequestsPage() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const isManagerial = role === "super_admin" || role === "admin";

  const [tab, setTab] = useState<"mine" | "approvals">("mine");
  const [mine, setMine] = useState<Leave[]>([]);
  const [pending, setPending] = useState<Leave[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeaveStatus | "all">("all");
  const [leaveType, setLeaveType] = useState<LeaveType | "all">("all");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateLeaveInput>({
    leaveType: "casual",
    reason: "",
    startDate: "",
    endDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<Leave | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Leave | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detail, setDetail] = useState<Leave | null>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  async function loadMine() {
    try {
      const res = await leavesApi.list({
        scope: "mine",
        limit: 100,
        search: search || undefined,
        status,
        leaveType,
      });
      setMine(res.data);
    } catch {
      toast.error("Failed to load your requests");
    }
  }

  async function loadPending() {
    if (!isManagerial) return;
    try {
      const res = await leavesApi.list({ status: "pending", limit: 100, search: search || undefined });
      setPending(res.data);
    } catch {
      toast.error("Failed to load approvals");
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadMine(), loadPending()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, leaveType]);

  useEffect(() => {
    const t = setTimeout(() => void loadAll(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const daysBetween = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const s = new Date(form.startDate);
    const e = new Date(form.endDate);
    if (e < s) return 0;
    return Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  }, [form.startDate, form.endDate]);

  // Derived analytics
  const usedByType = useMemo(() => {
    const map: Record<LeaveType, number> = {
      casual: 0, sick: 0, earned: 0, unpaid: 0, maternity: 0, paternity: 0,
    };
    for (const l of mine) {
      if (l.status === "approved") map[l.leaveType] += l.numberOfDays;
    }
    return map;
  }, [mine]);

  const totals = useMemo(() => {
    let approved = 0, pendingCount = 0, rejected = 0, totalDays = 0;
    for (const l of mine) {
      if (l.status === "approved") { approved += 1; totalDays += l.numberOfDays; }
      else if (l.status === "pending") pendingCount += 1;
      else if (l.status === "rejected") rejected += 1;
    }
    return { approved, pendingCount, rejected, totalDays };
  }, [mine]);

  const chartData = useMemo(() =>
    LEAVE_TYPES.map((t) => ({
      type: TYPE_META[t].label,
      used: usedByType[t],
      remaining: Math.max(TYPE_META[t].quota - usedByType[t], 0),
    })), [usedByType]);

  // Calendar approved leaves (mine + approvals view if managerial)
  const calendarLeaves = useMemo(() => {
    const pool = isManagerial ? [...mine, ...pending] : mine;
    return pool.filter((l) => l.status === "approved");
  }, [mine, pending, isManagerial]);

  async function submit() {
    if (!form.reason.trim() || !form.startDate || !form.endDate) {
      toast.error("Reason and dates are required");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("End date must be on or after start date");
      return;
    }
    setSaving(true);
    try {
      await leavesApi.create(form);
      toast.success("Leave request submitted");
      setOpen(false);
      setForm({ leaveType: "casual", reason: "", startDate: "", endDate: "" });
      await loadAll();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Submission failed");
    } finally {
      setSaving(false);
    }
  }

  async function approve(l: Leave) {
    try {
      await leavesApi.decide(l.id, "approved");
      toast.success("Approved");
      await loadAll();
      if (detail?.id === l.id) setDetail(null);
    } catch {
      toast.error("Approval failed");
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    try {
      await leavesApi.decide(rejectTarget.id, "rejected", rejectReason || undefined);
      toast.success("Rejected");
      setRejectTarget(null);
      setRejectReason("");
      await loadAll();
      if (detail) setDetail(null);
    } catch {
      toast.error("Reject failed");
    }
  }

  async function cancel(l: Leave) {
    try {
      await leavesApi.cancel(l.id);
      toast.success("Request cancelled");
      setConfirmCancel(null);
      await loadAll();
    } catch {
      toast.error("Cancel failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        description="Track balances, request time off, and review approvals."
        actions={
          <Button onClick={() => setOpen(true)} className="gap-2 shadow-md">
            <Plus className="h-4 w-4" /> New Request
          </Button>
        }
      />

      {/* Balance cards */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Leave Balance
          </h2>
          <Badge variant="outline" className="gap-1 text-xs">
            <Sparkles className="h-3 w-3" /> Auto-calculated
          </Badge>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {LEAVE_TYPES.map((t, i) => {
              const meta = TYPE_META[t];
              const used = usedByType[t];
              const remaining = Math.max(meta.quota - used, 0);
              const pct = Math.min(100, (used / meta.quota) * 100);
              const Icon = meta.icon;
              return (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={cn("absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-20 blur-xl", meta.bg)} />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className={cn("grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm", meta.bg)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {meta.quota}d
                      </span>
                    </div>
                    <div className="mt-3 text-xs font-medium text-muted-foreground">{meta.label}</div>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">{remaining}</span>
                      <span className="text-xs text-muted-foreground">days left</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={cn("h-full rounded-full bg-gradient-to-r", meta.bg)}
                      />
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      {used} used of {meta.quota}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick stats */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill icon={Clock} label="Pending" value={totals.pendingCount} tone="warning" loading={loading} />
        <StatPill icon={CheckCircle2} label="Approved" value={totals.approved} tone="success" loading={loading} />
        <StatPill icon={XCircle} label="Rejected" value={totals.rejected} tone="destructive" loading={loading} />
        <StatPill icon={TrendingUp} label="Days off (approved)" value={totals.totalDays} tone="info" loading={loading} />
      </section>

      {/* Analytics + Calendar */}
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Leave Analytics</h3>
              <p className="text-xs text-muted-foreground">Used vs remaining balance per leave type</p>
            </div>
            <Badge variant="outline" className="gap-1 text-xs">
              <TrendingUp className="h-3 w-3" /> This year
            </Badge>
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap={18}>
                  <defs>
                    <linearGradient id="usedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="type" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                  />
                  <Bar dataKey="used" stackId="a" fill="url(#usedGrad)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="remaining" stackId="a" radius={[8, 8, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--muted))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <LeaveCalendar
          month={calMonth}
          onPrev={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
          onNext={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
          leaves={calendarLeaves}
          loading={loading}
        />
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Filter className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <SearchBar value={search} onChange={setSearch} placeholder="Search by reason…" />
            </div>
          </div>
          <FilterBar>
            <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType | "all")}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {fmt(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as LeaveStatus | "all")}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
        </div>
      </section>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "mine" | "approvals")}>
        <TabsList className="mb-4">
          <TabsTrigger value="mine" className="gap-2">
            My Requests
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{mine.length}</Badge>
          </TabsTrigger>
          {isManagerial && (
            <TabsTrigger value="approvals" className="gap-2">
              Pending Approvals
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{pending.length}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mine" className="mt-0">
          {loading ? (
            <TimelineSkeleton />
          ) : mine.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No requests yet"
              description="Submit your first leave request to get started."
              action={
                <Button onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> New Request
                </Button>
              }
            />
          ) : (
            <LeaveTimeline
              leaves={mine}
              onCancel={(l) => setConfirmCancel(l)}
              onSelect={setDetail}
            />
          )}
        </TabsContent>

        {isManagerial && (
          <TabsContent value="approvals" className="mt-0">
            {loading ? (
              <ApprovalsGridSkeleton />
            ) : pending.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up"
                description="No pending approvals — every request has been actioned."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {pending.map((l) => (
                  <ApprovalCard
                    key={l.id}
                    leave={l}
                    onApprove={() => void approve(l)}
                    onReject={() => setRejectTarget(l)}
                    onOpen={() => setDetail(l)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* New Request Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[color:var(--brand-accent,theme(colors.primary.DEFAULT))] text-primary-foreground shadow-md">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>New Leave Request</DialogTitle>
                <DialogDescription>
                  Number of days is calculated automatically.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Leave type</Label>
              <div className="grid grid-cols-3 gap-2">
                {LEAVE_TYPES.map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  const active = form.leaveType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, leaveType: t })}
                      className={cn(
                        "group flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                        active
                          ? "border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      <span className={cn("grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-white", meta.bg)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Start date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">End date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" /> Duration
              </span>
              <span className="text-lg font-bold text-primary">
                {daysBetween} <span className="text-sm font-medium text-muted-foreground">day(s)</span>
              </span>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason</Label>
              <Textarea
                rows={3}
                placeholder="Briefly describe the reason for your leave…"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="rounded-xl resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving} className="gap-2">
              {saving ? "Submitting…" : (<>Submit Request <Check className="h-4 w-4" /></>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!confirmCancel}
        onOpenChange={(v) => !v && setConfirmCancel(null)}
        title="Cancel leave request?"
        description="Cancelling will withdraw your pending request. You can submit a new one later."
        confirmLabel="Cancel Request"
        destructive
        onConfirm={() => confirmCancel && void cancel(confirmCancel)}
      />

      <Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason — it will be visible to the employee.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Reason</Label>
            <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void reject()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-xl">
          {detail && <LeaveDetail leave={detail} onApprove={() => void approve(detail)} onReject={() => setRejectTarget(detail)} canDecide={isManagerial && detail.status === "pending"} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatPill({
  icon: Icon, label, value, tone, loading,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  tone: "warning" | "success" | "destructive" | "info";
  loading?: boolean;
}) {
  const styles: Record<string, string> = {
    warning: "from-amber-500 to-orange-500",
    success: "from-emerald-500 to-teal-500",
    destructive: "from-rose-500 to-red-500",
    info: "from-sky-500 to-blue-500",
  };
  if (loading) return <Skeleton className="h-20 rounded-2xl" />;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm", styles[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold tabular-nums text-foreground">{value}</div>
      </div>
    </div>
  );
}

function LeaveTimeline({
  leaves, onCancel, onSelect,
}: {
  leaves: Leave[];
  onCancel: (l: Leave) => void;
  onSelect: (l: Leave) => void;
}) {
  // Group by month
  const groups = useMemo(() => {
    const m = new Map<string, Leave[]>();
    for (const l of [...leaves].sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate))) {
      const k = new Date(l.startDate).toLocaleDateString(undefined, { month: "long", year: "numeric" });
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(l);
    }
    return Array.from(m.entries());
  }, [leaves]);

  return (
    <div className="space-y-8">
      {groups.map(([month, list]) => (
        <div key={month}>
          <div className="mb-3 flex items-center gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{month}</h4>
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{list.length} request{list.length === 1 ? "" : "s"}</span>
          </div>
          <ol className="relative space-y-3 border-l-2 border-dashed border-border pl-6">
            {list.map((l, i) => {
              const meta = TYPE_META[l.leaveType];
              const Icon = meta.icon;
              return (
                <motion.li
                  key={l.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="relative"
                >
                  <span className={cn("absolute -left-[33px] grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br text-white shadow-sm ring-4 ring-background", meta.bg)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <button
                    onClick={() => onSelect(l)}
                    className="group block w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold capitalize text-foreground">{meta.label} Leave</span>
                          <StatusBadge tone={STATUS_TONE[l.status]}>{fmt(l.status)}</StatusBadge>
                          <Badge variant="outline" className="gap-1 text-xs">
                            <CalendarDays className="h-3 w-3" /> {l.numberOfDays} day{l.numberOfDays === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{l.reason}</p>
                        {l.rejectionReason && (
                          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-rose-200/60 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                            <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                            <span><span className="font-medium">Manager:</span> {l.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                      {l.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); onCancel(l); }}
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

function ApprovalCard({
  leave, onApprove, onReject, onOpen,
}: {
  leave: Leave;
  onApprove: () => void;
  onReject: () => void;
  onOpen: () => void;
}) {
  const meta = TYPE_META[leave.leaveType];
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={cn("h-1 bg-gradient-to-r", meta.bg)} />
      <div className="p-4">
        <button onClick={onOpen} className="flex w-full items-start gap-3 text-left">
          <Avatar className="h-10 w-10 ring-2 ring-background">
            <AvatarFallback className={cn("bg-gradient-to-br text-white text-xs font-semibold", meta.bg)}>
              {initials(leave.employee?.name ?? "?")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-foreground">{leave.employee?.name ?? "—"}</div>
            <div className="truncate text-xs text-muted-foreground">{leave.employee?.employeeCode ?? leave.employee?.email}</div>
          </div>
          <Badge variant="outline" className={cn("gap-1 capitalize", meta.color)}>
            <Icon className="h-3 w-3" /> {meta.label}
          </Badge>
        </button>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">From</div>
            <div className="font-medium">{fmtDate(leave.startDate)}</div>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">To · {leave.numberOfDays}d</div>
            <div className="font-medium">{fmtDate(leave.endDate)}</div>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{leave.reason}</p>

        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={onApprove} className="flex-1 gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} className="flex-1 gap-1">
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function LeaveCalendar({
  month, onPrev, onNext, leaves, loading,
}: {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  leaves: Leave[];
  loading?: boolean;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const today = new Date();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const leavesByDay = useMemo(() => {
    const map = new Map<string, Leave[]>();
    for (const l of leaves) {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cur <= last) {
        if (cur.getFullYear() === year && cur.getMonth() === m) {
          const key = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(l);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [leaves, year, m]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Approved Leaves</h3>
          <p className="text-xs text-muted-foreground">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={i} className="aspect-square" />;
              const key = `${cell.getFullYear()}-${cell.getMonth()}-${cell.getDate()}`;
              const items = leavesByDay.get(key) ?? [];
              const isToday =
                cell.getDate() === today.getDate() &&
                cell.getMonth() === today.getMonth() &&
                cell.getFullYear() === today.getFullYear();
              const meta = items[0] ? TYPE_META[items[0].leaveType] : null;
              return (
                <div
                  key={i}
                  className={cn(
                    "relative aspect-square rounded-lg p-1 text-xs transition-colors",
                    items.length > 0
                      ? "bg-gradient-to-br text-white shadow-sm " + (meta?.bg ?? "")
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
                    isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                  )}
                  title={items.map((l) => `${l.employee?.name ?? "You"} — ${fmt(l.leaveType)}`).join("\n")}
                >
                  <span className="font-semibold">{cell.getDate()}</span>
                  {items.length > 1 && (
                    <span className="absolute bottom-0.5 right-0.5 rounded-full bg-white/30 px-1 text-[9px] font-bold">
                      +{items.length - 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
            {LEAVE_TYPES.slice(0, 4).map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full bg-gradient-to-br", TYPE_META[t].bg)} />
                {TYPE_META[t].label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LeaveDetail({
  leave, onApprove, onReject, canDecide,
}: {
  leave: Leave;
  onApprove: () => void;
  onReject: () => void;
  canDecide: boolean;
}) {
  const meta = TYPE_META[leave.leaveType];
  const Icon = meta.icon;
  const steps = [
    {
      label: "Submitted",
      done: true,
      at: fmtDateTime(leave.createdAt),
      by: leave.employee?.name,
      icon: Plus,
      tone: "bg-primary",
    },
    {
      label: leave.status === "pending" ? "Awaiting Approval" : leave.status === "approved" ? "Approved" : leave.status === "rejected" ? "Rejected" : "Cancelled",
      done: leave.status !== "pending",
      at: leave.approvedAt ? fmtDateTime(leave.approvedAt) : (leave.status === "cancelled" ? fmtDateTime(leave.updatedAt) : "Pending"),
      by: leave.approvedBy?.name,
      icon: leave.status === "approved" ? CheckCircle2 : leave.status === "rejected" ? XCircle : leave.status === "cancelled" ? Ban : Clock,
      tone: leave.status === "approved" ? "bg-emerald-500" : leave.status === "rejected" ? "bg-rose-500" : leave.status === "cancelled" ? "bg-slate-400" : "bg-amber-500 animate-pulse",
    },
  ];

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <div className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md", meta.bg)}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg">{meta.label} Leave</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={STATUS_TONE[leave.status]}>{fmt(leave.status)}</StatusBadge>
              <span>·</span>
              <span>{leave.numberOfDays} day{leave.numberOfDays === 1 ? "" : "s"}</span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {leave.employee && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={cn("bg-gradient-to-br text-white text-xs font-semibold", meta.bg)}>
                {initials(leave.employee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{leave.employee.name}</div>
              <div className="truncate text-xs text-muted-foreground">{leave.employee.email}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</div>
            <div className="mt-1 font-semibold">{fmtDate(leave.startDate)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">To</div>
            <div className="mt-1 font-semibold">{fmtDate(leave.endDate)}</div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reason</div>
          <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm leading-relaxed">{leave.reason}</p>
        </div>

        {/* Approval timeline */}
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Approval Progress</div>
          <ol className="relative space-y-3 border-l-2 border-dashed border-border pl-5">
            {steps.map((s, i) => (
              <li key={i} className="relative">
                <span className={cn("absolute -left-[26px] grid h-5 w-5 place-items-center rounded-full text-white ring-4 ring-background", s.tone)}>
                  <s.icon className="h-3 w-3" />
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.at}</span>
                </div>
                {s.by && <div className="text-xs text-muted-foreground">by {s.by}</div>}
              </li>
            ))}
          </ol>
        </div>

        {/* Manager comments */}
        {leave.rejectionReason && (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Manager Comment</div>
            <div className="flex items-start gap-2 rounded-xl border border-rose-200/60 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{leave.rejectionReason}</span>
            </div>
          </div>
        )}
      </div>

      {canDecide && (
        <DialogFooter>
          <Button variant="outline" onClick={onReject} className="gap-1">
            <X className="h-4 w-4" /> Reject
          </Button>
          <Button onClick={onApprove} className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
            <Check className="h-4 w-4" /> Approve
          </Button>
        </DialogFooter>
      )}
    </>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function ApprovalsGridSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-56 rounded-2xl" />
      ))}
    </div>
  );
}
