import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar } from "@/components/common/FilterBar";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import { MetricCard } from "@/components/common/MetricCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/store/hooks";
import {
  attendanceApi,
  type Attendance,
  type AttendanceStatus,
  type AttendanceSummary,
} from "@/services/attendance.service";

export const Route = createFileRoute("/_app/attendance")({
  component: AttendancePage,
});

const STATUS_TONE: Record<AttendanceStatus, StatusTone> = {
  present: "success",
  absent: "destructive",
  half_day: "warning",
  leave: "info",
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  half_day: "Half Day",
  leave: "On Leave",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const d = new Date();
  d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

function fmtTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AttendancePage() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const isManagerial = role === "super_admin" || role === "admin";

  const [tab, setTab] = useState<"today" | "history" | "all">("today");
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [daily, setDaily] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const [from, setFrom] = useState(firstOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<AttendanceStatus | "all">("all");

  async function loadToday() {
    try {
      const t = await attendanceApi.today();
      setTodayRecord(t);
    } catch {
      /* non-fatal */
    }
  }

  async function loadHistory() {
    try {
      const res = await attendanceApi.list({
        scope: "mine",
        from,
        to,
        limit: 100,
        status,
      });
      setHistory(res.data);
    } catch {
      toast.error("Failed to load attendance history");
    }
  }

  async function loadSummary() {
    try {
      const s = await attendanceApi.summary({ from, to });
      setSummary(s);
    } catch {
      /* non-fatal */
    }
  }

  async function loadDaily() {
    if (!isManagerial) return;
    try {
      const start = `${date}T00:00:00.000Z`;
      const end = `${date}T23:59:59.999Z`;
      const res = await attendanceApi.list({ from: start, to: end, limit: 200, status });
      setDaily(res.data);
    } catch {
      toast.error("Failed to load daily attendance");
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadToday(), loadHistory(), loadSummary(), loadDaily()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, date, status]);

  async function checkIn() {
    try {
      const r = await attendanceApi.checkIn();
      setTodayRecord(r);
      toast.success("Checked in");
      await loadHistory();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Check-in failed");
    }
  }

  async function checkOut() {
    try {
      const r = await attendanceApi.checkOut();
      setTodayRecord(r);
      toast.success("Checked out");
      await loadHistory();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Check-out failed");
    }
  }

  const monthly = useMemo(() => {
    if (!summary) return { present: 0, absent: 0, half_day: 0, leave: 0, hours: 0 };
    return summary.summary;
  }, [summary]);

  const historyCols: Column<Attendance>[] = [
    {
      key: "date",
      header: "Date",
      render: (a) => <span className="font-medium">{a.date.slice(0, 10)}</span>,
    },
    { key: "checkIn", header: "Check-in", render: (a) => fmtTime(a.checkIn) },
    { key: "checkOut", header: "Check-out", render: (a) => fmtTime(a.checkOut) },
    {
      key: "workingHours",
      header: "Hours",
      render: (a) => <span>{a.workingHours.toFixed(2)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (a) => <StatusBadge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</StatusBadge>,
    },
  ];

  const dailyCols: Column<Attendance>[] = [
    {
      key: "employee",
      header: "Employee",
      render: (a) => (
        <div>
          <div className="font-medium">{a.employee?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{a.employee?.employeeCode ?? a.employee?.email}</div>
        </div>
      ),
    },
    { key: "checkIn", header: "Check-in", render: (a) => fmtTime(a.checkIn) },
    { key: "checkOut", header: "Check-out", render: (a) => fmtTime(a.checkOut) },
    { key: "workingHours", header: "Hours", render: (a) => <span>{a.workingHours.toFixed(2)}</span> },
    {
      key: "status",
      header: "Status",
      render: (a) => <StatusBadge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</StatusBadge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track check-ins, working hours and monthly summaries."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "today" | "history" | "all")}>
        <TabsList className="mb-4">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">My History</TabsTrigger>
          {isManagerial && <TabsTrigger value="all">Daily Attendance</TabsTrigger>}
        </TabsList>

        <TabsContent value="today" className="mt-0 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today, {new Date().toLocaleDateString()}</p>
                <h3 className="mt-1 text-lg font-semibold">
                  {todayRecord
                    ? todayRecord.checkOut
                      ? "Day complete"
                      : todayRecord.checkIn
                        ? "Currently checked in"
                        : "Not checked in"
                    : "Not checked in"}
                </h3>
                <div className="mt-1 text-sm text-muted-foreground">
                  Check-in: <span className="font-medium text-foreground">{fmtTime(todayRecord?.checkIn)}</span>
                  {" · "}Check-out: <span className="font-medium text-foreground">{fmtTime(todayRecord?.checkOut)}</span>
                  {" · "}Hours: <span className="font-medium text-foreground">{todayRecord?.workingHours.toFixed(2) ?? "0.00"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => void checkIn()}
                  disabled={!!todayRecord?.checkIn}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" /> Check In
                </Button>
                <Button
                  onClick={() => void checkOut()}
                  disabled={!todayRecord?.checkIn || !!todayRecord?.checkOut}
                  variant="outline"
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" /> Check Out
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <MetricCard label="Present" value={String(monthly.present)} hint="this period" />
            <MetricCard label="Half Day" value={String(monthly.half_day)} hint="this period" />
            <MetricCard label="Absent" value={String(monthly.absent)} hint="this period" />
            <MetricCard label="On Leave" value={String(monthly.leave)} hint="this period" />
            <MetricCard label="Hours" value={monthly.hours.toFixed(1)} hint="logged" />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0 space-y-4">
          <FilterBar>
            <div className="flex items-center gap-2">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-40" />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus | "all")}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
          <DataTable
            columns={historyCols}
            data={history}
            rowKey={(r) => r.id}
            emptyState={
              <EmptyState
                icon={CalendarClock}
                title={loading ? "Loading…" : "No records"}
                description="No attendance records for the selected range."
              />
            }
          />
        </TabsContent>

        {isManagerial && (
          <TabsContent value="all" className="mt-0 space-y-4">
            <FilterBar>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-40" />
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus | "all")}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </FilterBar>
            <DataTable
              columns={dailyCols}
              data={daily}
              rowKey={(r) => r.id}
              emptyState={
                <EmptyState
                  icon={CalendarClock}
                  title={loading ? "Loading…" : "No attendance records"}
                  description="No records for the selected day."
                />
              }
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
