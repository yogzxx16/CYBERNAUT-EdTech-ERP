import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  MapPin,
  Pencil,
  Trash2,
  Users as UsersIcon,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  PartyPopper,
  Briefcase,
  GraduationCap,
  Coffee,
  Megaphone,
  CircleDot,
  CalendarDays,
  LayoutGrid,
  List,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  addWeeks,
  isSameDay,
  isSameMonth,
  isToday,
  isAfter,
  parseISO,
  differenceInMinutes,
} from "date-fns";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { eventsApi, type Event, type EventStatus, type RSVPStatus } from "@/services/events.service";
import { usersApi, type AppUser } from "@/services/users.service";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/events")({
  component: EventsPage,
});

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

interface FormState {
  id?: string;
  title: string;
  description: string;
  venue: string;
  eventDate: string;
  endDate: string;
  participants: string[];
  status?: EventStatus;
}

const EMPTY: FormState = {
  title: "",
  description: "",
  venue: "",
  eventDate: "",
  endDate: "",
  participants: [],
};

function toLocalInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Color-coded categories — derived deterministically from title (UI-only).
const CATEGORIES = [
  { key: "meeting", label: "Meeting", icon: Briefcase, dot: "bg-blue-500", chip: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20", bar: "from-blue-500 to-blue-400" },
  { key: "celebration", label: "Celebration", icon: PartyPopper, dot: "bg-pink-500", chip: "bg-pink-500/10 text-pink-600 dark:text-pink-300 border-pink-500/20", bar: "from-pink-500 to-rose-400" },
  { key: "training", label: "Training", icon: GraduationCap, dot: "bg-violet-500", chip: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20", bar: "from-violet-500 to-fuchsia-400" },
  { key: "social", label: "Social", icon: Coffee, dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20", bar: "from-amber-500 to-orange-400" },
  { key: "announcement", label: "Announcement", icon: Megaphone, dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20", bar: "from-emerald-500 to-teal-400" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

function categoryFor(e: Event): (typeof CATEGORIES)[number] {
  const t = (e.title + " " + (e.description ?? "")).toLowerCase();
  if (/(birthday|anniversary|celebrat|party|festival|diwali|holi|christmas|holiday)/.test(t)) return CATEGORIES[1];
  if (/(training|workshop|learn|bootcamp|session|class|course)/.test(t)) return CATEGORIES[2];
  if (/(lunch|dinner|coffee|hangout|social|gathering|outing|trip)/.test(t)) return CATEGORIES[3];
  if (/(announce|all.?hands|town.?hall|update|launch|release)/.test(t)) return CATEGORIES[4];
  return CATEGORIES[0];
}

function statusMeta(s: EventStatus) {
  switch (s) {
    case "scheduled":
      return { label: "Scheduled", chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20" };
    case "ongoing":
      return { label: "Live now", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 animate-pulse" };
    case "completed":
      return { label: "Completed", chip: "bg-muted text-muted-foreground border-border" };
    case "cancelled":
      return { label: "Cancelled", chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20" };
  }
}

function rsvpChip(s: RSVPStatus) {
  if (s === "yes") return { label: "Going", icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" };
  if (s === "maybe") return { label: "Maybe", icon: HelpCircle, cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" };
  return { label: "Declined", icon: XCircle, cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20" };
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day" | "agenda";

function EventsPage() {
  const me = useAppSelector((s) => s.auth.user);
  const canManage = me?.role === "super_admin" || me?.role === "admin";
  const [items, setItems] = useState<Event[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [detail, setDetail] = useState<Event | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | "all">("all");
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(new Date());

  async function load() {
    setLoading(true);
    try {
      const res = await eventsApi.list({ limit: 100 });
      setItems(res.data);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    if (canManage) {
      usersApi.list({ limit: 200, status: "active" }).then((r) => setUsers(r.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(e: Event) {
    setForm({
      id: e.id,
      title: e.title,
      description: e.description ?? "",
      venue: e.venue ?? "",
      eventDate: toLocalInput(e.eventDate),
      endDate: e.endDate ? toLocalInput(e.endDate) : "",
      participants: e.participants.map((p) => p.id),
      status: e.status,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.title.trim() || !form.eventDate) {
      toast.error("Title and start date are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        venue: form.venue || undefined,
        eventDate: new Date(form.eventDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        participants: form.participants,
      };
      if (form.id) {
        await eventsApi.update(form.id, { ...payload, status: form.status });
        toast.success("Event updated");
      } else {
        await eventsApi.create(payload);
        toast.success("Event created");
      }
      setOpen(false);
      setForm(EMPTY);
      await load();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function rsvp(id: string, status: RSVPStatus) {
    try {
      const updated = await eventsApi.rsvp(id, status);
      toast.success(`RSVP: ${status}`);
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
      if (detail?.id === id) setDetail(updated);
    } catch {
      toast.error("RSVP failed");
    }
  }

  async function setStatus(e: Event, status: EventStatus) {
    try {
      const updated = await eventsApi.update(e.id, { status });
      toast.success(`Marked ${status}`);
      setItems((prev) => prev.map((x) => (x.id === e.id ? updated : x)));
      if (detail?.id === e.id) setDetail(updated);
    } catch {
      toast.error("Update failed");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await eventsApi.remove(deleteTarget.id);
      toast.success("Event deleted");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Delete failed");
    }
  }

  function myRSVP(e: Event): RSVPStatus | null {
    const r = e.rsvps.find((x) => x.user === me?.id);
    return r?.status ?? null;
  }
  function canEdit(e: Event) {
    if (canManage) return true;
    return e.organizer?.id === me?.id;
  }

  // Filtered events
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (categoryFilter !== "all" && categoryFor(e).key !== categoryFilter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q) ||
        (e.venue ?? "").toLowerCase().includes(q) ||
        (e.organizer?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter, categoryFilter]);

  // Upcoming widget — next 5 future events
  const upcoming = useMemo(() => {
    const now = new Date();
    return [...items]
      .filter((e) => isAfter(parseISO(e.eventDate), now) && e.status !== "cancelled")
      .sort((a, b) => +parseISO(a.eventDate) - +parseISO(b.eventDate))
      .slice(0, 5);
  }, [items]);

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const live = items.filter((e) => e.status === "ongoing").length;
    const upcomingCount = items.filter(
      (e) => isAfter(parseISO(e.eventDate), new Date()) && e.status === "scheduled"
    ).length;
    const myInvites = items.filter((e) => e.participants.some((p) => p.id === me?.id)).length;
    return { total, live, upcomingCount, myInvites };
  }, [items, me?.id]);

  // ─── Calendar grouping ───────────────────────────────────
  const eventsByDay = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of filtered) {
      const key = format(parseISO(e.eventDate), "yyyy-MM-dd");
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => +parseISO(a.eventDate) - +parseISO(b.eventDate));
    return m;
  }, [filtered]);

  function shiftCursor(dir: 1 | -1) {
    if (view === "month") setCursor((d) => addMonths(d, dir));
    else if (view === "week") setCursor((d) => addWeeks(d, dir));
    else if (view === "day") setCursor((d) => addDays(d, dir));
    else setCursor((d) => addMonths(d, dir));
  }

  const headerLabel = useMemo(() => {
    if (view === "month") return format(cursor, "MMMM yyyy");
    if (view === "week") {
      const ws = startOfWeek(cursor, { weekStartsOn: 1 });
      const we = endOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    if (view === "day") return format(cursor, "EEEE, MMMM d");
    return "Agenda";
  }, [cursor, view]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Plan, schedule and coordinate company events."
        actions={
          canManage && (
            <Button className="gap-2 shadow-soft" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New event
            </Button>
          )
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total events", value: stats.total, icon: CalendarDays, grad: "from-blue-500/15 to-cyan-500/10", iconCls: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
          { label: "Live now", value: stats.live, icon: CircleDot, grad: "from-emerald-500/15 to-teal-500/10", iconCls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
          { label: "Upcoming", value: stats.upcomingCount, icon: Sparkles, grad: "from-violet-500/15 to-fuchsia-500/10", iconCls: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
          { label: "My invites", value: stats.myInvites, icon: UsersIcon, grad: "from-amber-500/15 to-orange-500/10", iconCls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-4 shadow-soft",
              s.grad
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{s.value}</p>
              </div>
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", s.iconCls)}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, organizers, venues…"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EventStatus | "all")}>
            <SelectTrigger className="md:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(["scheduled", "ongoing", "completed", "cancelled"] as EventStatus[]).map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryKey | "all")}>
            <SelectTrigger className="md:w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || statusFilter !== "all" || categoryFilter !== "all") && (
            <Button
              variant="ghost"
              className="gap-2 text-muted-foreground"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setCategoryFilter("all");
              }}
            >
              <Filter className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main calendar/views */}
        <div className="min-w-0 space-y-4">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="month" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Month</TabsTrigger>
                <TabsTrigger value="week" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Week</TabsTrigger>
                <TabsTrigger value="day" className="gap-1.5"><CircleDot className="h-3.5 w-3.5" />Day</TabsTrigger>
                <TabsTrigger value="agenda" className="gap-1.5"><List className="h-3.5 w-3.5" />Agenda</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftCursor(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[180px] text-center text-sm font-semibold">{headerLabel}</div>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftCursor(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={view + cursor.toDateString()}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <TabsContent value="month" className="mt-4">
                  <MonthView cursor={cursor} eventsByDay={eventsByDay} onSelect={setDetail} loading={loading} />
                </TabsContent>
                <TabsContent value="week" className="mt-4">
                  <WeekView cursor={cursor} eventsByDay={eventsByDay} onSelect={setDetail} loading={loading} />
                </TabsContent>
                <TabsContent value="day" className="mt-4">
                  <DayView cursor={cursor} eventsByDay={eventsByDay} onSelect={setDetail} loading={loading} />
                </TabsContent>
                <TabsContent value="agenda" className="mt-4">
                  <AgendaView
                    events={filtered}
                    onSelect={setDetail}
                    onEdit={openEdit}
                    onDelete={(e) => setDeleteTarget(e)}
                    onRsvp={rsvp}
                    onCancel={(e) => setStatus(e, "cancelled")}
                    canEdit={canEdit}
                    myRSVP={myRSVP}
                    loading={loading}
                  />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <UpcomingWidget events={upcoming} onSelect={setDetail} loading={loading} />
          <CategoryLegend />
        </aside>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit event" : "Create event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Venue</Label>
              <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="datetime-local" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            {form.id && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EventStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["scheduled", "ongoing", "completed", "cancelled"] as EventStatus[]).map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Participants</Label>
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                {users.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No employees available.</p>
                ) : (
                  users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={form.participants.includes(u.id)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            participants: e.target.checked
                              ? [...f.participants, u.id]
                              : f.participants.filter((x) => x !== u.id),
                          }))
                        }
                      />
                      {u.name}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{form.id ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <EventDetailDialog
        event={detail}
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        mine={detail ? myRSVP(detail) : null}
        canEdit={detail ? canEdit(detail) : false}
        onRsvp={(s) => detail && rsvp(detail.id, s)}
        onEdit={() => {
          if (!detail) return;
          openEdit(detail);
          setDetail(null);
        }}
        onCancel={() => detail && setStatus(detail, "cancelled")}
        onDelete={() => {
          if (!detail) return;
          setDeleteTarget(detail);
          setDetail(null);
        }}
      />

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete event?"
        description={`"${deleteTarget?.title ?? ""}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Month view
// ────────────────────────────────────────────────────────────

function MonthView({
  cursor,
  eventsByDay,
  onSelect,
  loading,
}: {
  cursor: Date;
  eventsByDay: Map<string, Event[]>;
  onSelect: (e: Event) => void;
  loading: boolean;
}) {
  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthEnd = endOfMonth(cursor);
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let cur = gridStart;
  while (cur <= gridEnd) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {weekDays.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(d, cursor);
          const today = isToday(d);
          return (
            <div
              key={key}
              className={cn(
                "relative flex min-h-[88px] flex-col rounded-xl border p-1.5 transition-colors sm:min-h-[104px]",
                inMonth ? "border-border bg-background/60" : "border-border/50 bg-muted/30 text-muted-foreground/60",
                today && "border-primary/50 ring-1 ring-primary/30"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                    today ? "bg-primary text-primary-foreground" : ""
                  )}
                >
                  {format(d, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground">{dayEvents.length}</span>
                )}
              </div>
              <div className="mt-1 space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((e) => {
                  const cat = categoryFor(e);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelect(e)}
                      className={cn(
                        "block w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[10px] font-medium transition-transform hover:scale-[1.02]",
                        cat.chip,
                        e.status === "cancelled" && "line-through opacity-60"
                      )}
                    >
                      <span className="hidden sm:inline">{format(parseISO(e.eventDate), "HH:mm")} · </span>
                      {e.title}
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {loading && <p className="mt-3 text-center text-xs text-muted-foreground">Loading…</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Week view
// ────────────────────────────────────────────────────────────

function WeekView({
  cursor,
  eventsByDay,
  onSelect,
  loading,
}: {
  cursor: Date;
  eventsByDay: Map<string, Event[]>;
  onSelect: (e: Event) => void;
  loading: boolean;
}) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        const dayEvents = eventsByDay.get(key) ?? [];
        const today = isToday(d);
        return (
          <div
            key={key}
            className={cn(
              "rounded-2xl border bg-card p-3 shadow-soft",
              today ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {format(d, "EEE")}
                </p>
                <p className={cn("text-lg font-bold", today && "text-primary")}>{format(d, "d")}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{dayEvents.length} events</span>
            </div>
            <div className="space-y-2">
              {dayEvents.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                  No events
                </p>
              ) : (
                dayEvents.map((e) => <MiniEventCard key={e.id} event={e} onClick={() => onSelect(e)} />)
              )}
            </div>
          </div>
        );
      })}
      {loading && <p className="col-span-full text-center text-xs text-muted-foreground">Loading…</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Day view — timeline by hour
// ────────────────────────────────────────────────────────────

function DayView({
  cursor,
  eventsByDay,
  onSelect,
  loading,
}: {
  cursor: Date;
  eventsByDay: Map<string, Event[]>;
  onSelect: (e: Event) => void;
  loading: boolean;
}) {
  const key = format(cursor, "yyyy-MM-dd");
  const dayEvents = eventsByDay.get(key) ?? [];
  const hours = Array.from({ length: 14 }, (_, i) => 7 + i); // 7am–8pm

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="grid grid-cols-[56px_1fr] gap-2">
        {hours.map((h) => {
          const hourEvents = dayEvents.filter((e) => new Date(e.eventDate).getHours() === h);
          return (
            <FragmentRow key={h} hour={h}>
              {hourEvents.length === 0 ? (
                <div className="h-14 rounded-lg border border-dashed border-border/60" />
              ) : (
                <div className="space-y-2">
                  {hourEvents.map((e) => {
                    const cat = categoryFor(e);
                    return (
                      <button
                        key={e.id}
                        onClick={() => onSelect(e)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-xl border bg-background p-3 text-left shadow-sm transition hover:shadow-md",
                          "border-border"
                        )}
                      >
                        <div className={cn("h-10 w-1 shrink-0 rounded-full bg-gradient-to-b", cat.bar)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold">{e.title}</p>
                            <Badge variant="outline" className={cn("text-[10px]", statusMeta(e.status).chip)}>
                              {statusMeta(e.status).label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {format(parseISO(e.eventDate), "HH:mm")}
                            {e.endDate ? ` – ${format(parseISO(e.endDate), "HH:mm")}` : ""}
                            {e.venue ? ` · ${e.venue}` : ""}
                          </p>
                        </div>
                        <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                          <UsersIcon className="h-3 w-3" /> {e.rsvpCounts.total}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </FragmentRow>
          );
        })}
      </div>
      {dayEvents.length === 0 && !loading && (
        <EmptyState icon={CalendarIcon} title="No events today" description="Enjoy the quiet day." />
      )}
    </div>
  );
}

function FragmentRow({ hour, children }: { hour: number; children: React.ReactNode }) {
  const label = `${hour.toString().padStart(2, "0")}:00`;
  return (
    <>
      <div className="pt-2 text-right text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="border-l border-border pl-3">{children}</div>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Agenda view — grouped timeline
// ────────────────────────────────────────────────────────────

function AgendaView({
  events,
  onSelect,
  onEdit,
  onDelete,
  onRsvp,
  onCancel,
  canEdit,
  myRSVP,
  loading,
}: {
  events: Event[];
  onSelect: (e: Event) => void;
  onEdit: (e: Event) => void;
  onDelete: (e: Event) => void;
  onRsvp: (id: string, s: RSVPStatus) => void;
  onCancel: (e: Event) => void;
  canEdit: (e: Event) => boolean;
  myRSVP: (e: Event) => RSVPStatus | null;
  loading: boolean;
}) {
  const grouped = useMemo(() => {
    const m = new Map<string, Event[]>();
    const sorted = [...events].sort((a, b) => +parseISO(a.eventDate) - +parseISO(b.eventDate));
    for (const e of sorted) {
      const key = format(parseISO(e.eventDate), "yyyy-MM-dd");
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    return [...m.entries()];
  }, [events]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (grouped.length === 0) {
    return <EmptyState icon={CalendarIcon} title="No events match your filters" />;
  }

  return (
    <div className="space-y-6">
      {grouped.map(([day, evts]) => (
        <div key={day} className="relative pl-6">
          <div className="absolute left-0 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary/15 ring-4 ring-background">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <div className="absolute left-[9px] top-6 h-[calc(100%-12px)] w-px bg-border" />
          <p className="text-sm font-semibold">
            {format(parseISO(day), "EEEE, MMMM d")}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{evts.length} events</span>
          </p>
          <div className="mt-3 grid gap-3">
            {evts.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                mine={myRSVP(e)}
                canEdit={canEdit(e)}
                onSelect={() => onSelect(e)}
                onEdit={() => onEdit(e)}
                onDelete={() => onDelete(e)}
                onRsvp={(s) => onRsvp(e.id, s)}
                onCancel={() => onCancel(e)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Event card
// ────────────────────────────────────────────────────────────

function EventCard({
  event,
  mine,
  canEdit,
  onSelect,
  onEdit,
  onDelete,
  onRsvp,
  onCancel,
}: {
  event: Event;
  mine: RSVPStatus | null;
  canEdit: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRsvp: (s: RSVPStatus) => void;
  onCancel: () => void;
}) {
  const cat = categoryFor(event);
  const st = statusMeta(event.status);
  const Icon = cat.icon;
  const visible = event.participants.slice(0, 4);
  const extra = Math.max(0, event.participants.length - visible.length);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lg"
    >
      <div className={cn("absolute inset-y-0 left-0 w-1 bg-gradient-to-b", cat.bar)} />
      <div className="p-5 pl-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <button onClick={onSelect} className="min-w-0 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", cat.chip)}>
                <Icon className="h-3 w-3" /> {cat.label}
              </span>
              <Badge variant="outline" className={cn("text-[10px]", st.chip)}>{st.label}</Badge>
              {mine && (
                <Badge variant="outline" className={cn("text-[10px]", rsvpChip(mine).cls)}>
                  You: {rsvpChip(mine).label}
                </Badge>
              )}
            </div>
            <h3 className="mt-2 truncate text-lg font-semibold leading-tight">{event.title}</h3>
            {event.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(event.eventDate), "MMM d · HH:mm")}
                {event.endDate ? ` – ${format(parseISO(event.endDate), "HH:mm")}` : ""}
              </span>
              {event.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {event.venue}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="h-3 w-3" /> {event.rsvpCounts.total} attendees
              </span>
            </div>
          </button>
          <div className="flex shrink-0 -space-x-2">
            {visible.map((p) => (
              <Avatar key={p.id} className="h-7 w-7 border-2 border-card">
                <AvatarFallback className="text-[10px]">{initials(p.name)}</AvatarFallback>
              </Avatar>
            ))}
            {extra > 0 && (
              <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold">
                +{extra}
              </div>
            )}
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {(["yes", "maybe", "no"] as RSVPStatus[]).map((s) => {
              const chip = rsvpChip(s);
              const ChipIcon = chip.icon;
              const count = s === "yes" ? event.rsvpCounts.yes : s === "no" ? event.rsvpCounts.no : event.rsvpCounts.maybe;
              const active = mine === s;
              return (
                <Button
                  key={s}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => onRsvp(s)}
                  className="h-8 gap-1.5 px-2.5 text-xs"
                  disabled={event.status === "cancelled" || event.status === "completed"}
                >
                  <ChipIcon className="h-3 w-3" />
                  {chip.label}
                  <span className="ml-1 rounded-full bg-background/60 px-1.5 py-px text-[10px] tabular-nums">{count}</span>
                </Button>
              );
            })}
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 gap-1.5">
                <Pencil className="h-3 w-3" /> Edit
              </Button>
              {event.status !== "cancelled" && event.status !== "completed" && (
                <Button size="sm" variant="ghost" onClick={onCancel} className="h-8">
                  Cancel
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onDelete} className="h-8 text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MiniEventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  const cat = categoryFor(event);
  return (
    <button
      onClick={onClick}
      className={cn(
        "block w-full rounded-lg border bg-background p-2 text-left transition hover:scale-[1.02]",
        "border-border"
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", cat.dot)} />
        <p className="truncate text-xs font-semibold">{event.title}</p>
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        {format(parseISO(event.eventDate), "HH:mm")} · {event.rsvpCounts.yes} going
      </p>
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Upcoming widget & legend
// ────────────────────────────────────────────────────────────

function UpcomingWidget({
  events,
  onSelect,
  loading,
}: {
  events: Event[];
  onSelect: (e: Event) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Upcoming</h3>
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Nothing scheduled
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((e) => {
            const cat = categoryFor(e);
            return (
              <button
                key={e.id}
                onClick={() => onSelect(e)}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-background p-2.5 text-left transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg text-center", cat.chip)}>
                  <div className="text-[9px] font-semibold uppercase leading-none">
                    {format(parseISO(e.eventDate), "MMM")}
                  </div>
                  <div className="text-sm font-bold leading-none">{format(parseISO(e.eventDate), "d")}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{e.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {format(parseISO(e.eventDate), "HH:mm")}
                    {e.venue ? ` · ${e.venue}` : ""}
                  </p>
                </div>
                <div className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex">
                  <UsersIcon className="h-3 w-3" />
                  {e.rsvpCounts.total}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryLegend() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h3 className="mb-3 text-sm font-semibold">Categories</h3>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((c) => (
          <div key={c.key} className="flex items-center gap-2 text-xs">
            <span className={cn("h-2.5 w-2.5 rounded-full", c.dot)} />
            <span className="text-muted-foreground">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Detail dialog
// ────────────────────────────────────────────────────────────

function EventDetailDialog({
  event,
  open,
  onOpenChange,
  mine,
  canEdit,
  onRsvp,
  onEdit,
  onCancel,
  onDelete,
}: {
  event: Event | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mine: RSVPStatus | null;
  canEdit: boolean;
  onRsvp: (s: RSVPStatus) => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  if (!event) return null;
  const cat = categoryFor(event);
  const st = statusMeta(event.status);
  const Icon = cat.icon;
  const totalInvited = event.participants.length || event.rsvpCounts.total || 1;
  const pct = (n: number) => Math.round((n / totalInvited) * 100);
  const durationMin = event.endDate ? differenceInMinutes(parseISO(event.endDate), parseISO(event.eventDate)) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        {/* Hero */}
        <div className={cn("relative p-6 pb-5", `bg-gradient-to-br ${cat.bar} text-white`)}>
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                <Icon className="h-3 w-3" /> {cat.label}
              </span>
              <Badge variant="outline" className={cn("border-white/30 bg-white/15 text-white", st.chip.includes("animate-pulse") && "animate-pulse")}>
                {st.label}
              </Badge>
            </div>
            <DialogHeader className="mt-3 space-y-1">
              <DialogTitle className="text-2xl font-bold text-white">{event.title}</DialogTitle>
            </DialogHeader>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/90">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(parseISO(event.eventDate), "EEE, MMM d · HH:mm")}
                {event.endDate ? ` – ${format(parseISO(event.endDate), "HH:mm")}` : ""}
                {durationMin && durationMin > 0 ? ` (${Math.round(durationMin / 60 * 10) / 10}h)` : ""}
              </span>
              {event.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {event.venue}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {event.description && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</p>
              <p className="text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* RSVP breakdown */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attendance</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { s: "yes" as RSVPStatus, n: event.rsvpCounts.yes },
                { s: "maybe" as RSVPStatus, n: event.rsvpCounts.maybe },
                { s: "no" as RSVPStatus, n: event.rsvpCounts.no },
              ]).map(({ s, n }) => {
                const c = rsvpChip(s);
                return (
                  <div key={s} className={cn("rounded-xl border p-3", c.cls)}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{c.label}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{n}</p>
                    <p className="text-[10px] opacity-70">{pct(n)}% of invited</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Participants */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Participants · {event.participants.length}
            </p>
            <ScrollArea className="max-h-40">
              <div className="flex flex-wrap gap-2">
                {event.participants.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No participants invited.</p>
                ) : (
                  event.participants.map((p) => {
                    const r = event.rsvps.find((x) => x.user === p.id);
                    const status = r?.status;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-3"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">{initials(p.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{p.name}</span>
                        {status && (
                          <span className={cn("h-1.5 w-1.5 rounded-full", status === "yes" ? "bg-emerald-500" : status === "maybe" ? "bg-amber-500" : "bg-rose-500")} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Organizer */}
          {event.organizer && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(event.organizer.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Organizer</p>
                <p className="truncate text-sm font-medium">{event.organizer.name}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-muted/30 px-6 py-3">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {(["yes", "maybe", "no"] as RSVPStatus[]).map((s) => {
                const c = rsvpChip(s);
                const C = c.icon;
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={mine === s ? "default" : "outline"}
                    onClick={() => onRsvp(s)}
                    className="h-8 gap-1.5"
                    disabled={event.status === "cancelled" || event.status === "completed"}
                  >
                    <C className="h-3 w-3" /> {c.label}
                  </Button>
                );
              })}
            </div>
            {canEdit && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5"><Pencil className="h-3 w-3" /> Edit</Button>
                {event.status !== "cancelled" && event.status !== "completed" && (
                  <Button size="sm" variant="outline" onClick={onCancel}>Cancel event</Button>
                )}
                <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Silence unused import in some lint setups
void isSameDay;
