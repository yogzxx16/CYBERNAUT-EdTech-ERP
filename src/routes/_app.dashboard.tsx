import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Building2,
  ShieldCheck,
  UserCheck,
  ArrowUpRight,
  FolderKanban,
  ListChecks,
  ClipboardCheck,
  CalendarClock,
  Cake,
  CalendarDays,
  Inbox,
  Activity,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppSelector } from "@/store/hooks";
import {
  statsApi,
  type DashboardOverview,
  type DashboardCharts,
  type MeSummary,
  type DashboardAnalytics,
} from "@/services/stats.service";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, parseISO } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const PIE_COLORS = ["#3B82F6", "#19D2D9", "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#0EA5E9"];

function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [stats, setStats] = useState<DashboardOverview | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [meSummary, setMeSummary] = useState<MeSummary | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const isManagerial = user?.role === "super_admin" || user?.role === "admin";

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      statsApi.overview(),
      statsApi.charts(),
      statsApi.meSummary(),
      statsApi.analytics(),
    ])
      .then(([o, c, m, a]) => {
        if (!mounted) return;
        if (o.status === "fulfilled") setStats(o.value);
        if (c.status === "fulfilled") setCharts(c.value);
        if (m.status === "fulfilled") setMeSummary(m.value);
        if (a.status === "fulfilled") setAnalytics(a.value);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const fmt = (n?: number) => (loading ? "…" : (n ?? 0).toLocaleString());

  const leaveBalance = meSummary?.leaveBalance;
  const leavePct = useMemo(() => {
    if (!leaveBalance || !leaveBalance.quota) return 0;
    return Math.min(100, Math.round((leaveBalance.used / leaveBalance.quota) * 100));
  }, [leaveBalance]);

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-[color:var(--brand-accent)]/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> {todayStr}
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, <span className="text-primary">{user?.name?.split(" ")[0] ?? "there"}</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Here's a snapshot of your workspace — tasks, approvals, attendance and more.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2 rounded-2xl">
              <Link to="/tasks">My Tasks <ListChecks className="h-4 w-4" /></Link>
            </Button>
            <Button asChild className="gap-2 rounded-2xl shadow-soft">
              <Link to="/projects">Projects <ArrowUpRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <SectionTitle icon={Activity} label="Operations" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard tone="primary" icon={FolderKanban} label="Active Projects" value={fmt(stats?.activeProjects)} hint="in progress" />
        <StatCard tone="warning" icon={ListChecks} label="Pending Tasks" value={fmt(stats?.pendingTasks)} hint="not yet completed" />
        <StatCard tone="info" icon={ClipboardCheck} label="Pending Leaves" value={fmt(stats?.pendingLeaves)} hint="awaiting review" />
        <StatCard tone="success" icon={CalendarClock} label="Today's Attendance" value={fmt(stats?.todayAttendance)} hint="check-ins logged" />
      </div>

      {/* My Workspace */}
      <SectionTitle icon={Inbox} label="My Workspace" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard tone="primary" icon={ListChecks} label="My Open Tasks" value={fmt(meSummary?.myPendingTasks)} hint="assigned to you" />
        <StatCard tone="info" icon={ClipboardCheck} label="My Pending Leaves" value={fmt(meSummary?.myPendingLeaves)} hint="awaiting decision" />

        {/* Leave balance card with ring */}
        <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-elevated">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leave Balance</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {leaveBalance ? leaveBalance.remaining : "…"}
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  /{leaveBalance?.quota ?? "—"}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{leaveBalance?.used ?? 0} used this year</p>
            </div>
            <RingProgress value={leavePct} />
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[color:var(--brand-accent)] transition-all"
              style={{ width: `${leavePct}%` }}
            />
          </div>
        </div>

        <StatCard
          tone="warning"
          icon={Inbox}
          label="Pending Approvals"
          value={fmt((meSummary?.pendingApprovals.leaves ?? 0) + (meSummary?.pendingApprovals.tickets ?? 0))}
          hint={isManagerial ? "leaves + tickets" : "in your team"}
        />
      </div>

      {/* Task widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TaskWidget title="My overdue tasks" icon={AlertTriangle} tone="destructive" tasks={meSummary?.myOverdueTasks ?? []} emptyHint="Nothing overdue. Nice." />
        <TaskWidget title="Due today" icon={Clock3} tone="warning" tasks={meSummary?.myDueToday ?? []} emptyHint="Nothing due today." />
        <TaskWidget title="Upcoming deadlines" icon={CalendarDays} tone="info" tasks={meSummary?.myUpcomingDeadlines ?? []} emptyHint="No deadlines in the next week." />
        <TaskWidget title="Recently completed" icon={CheckCircle2} tone="success" tasks={meSummary?.myRecentCompleted ?? []} showCompleted emptyHint="No completions yet." />
      </div>

      {/* My tasks / Events / Birthdays */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PanelCard
          title="My open tasks"
          icon={ListChecks}
          action={<LinkButton to="/tasks">View all</LinkButton>}
        >
          {meSummary && meSummary.myOpenTasks.length > 0 ? (
            <ul className="divide-y divide-border">
              {meSummary.myOpenTasks.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <PriorityDot priority={t.priority} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.project ?? "—"}</p>
                    </div>
                  </div>
                  {t.dueDate && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {new Date(t.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint label="No open tasks. Great job!" />
          )}
        </PanelCard>

        <PanelCard
          title="Upcoming events"
          icon={CalendarDays}
          action={<LinkButton to="/events">View all</LinkButton>}
        >
          {meSummary && meSummary.upcomingEvents.length > 0 ? (
            <ul className="space-y-2.5">
              {meSummary.upcomingEvents.slice(0, 5).map((e) => {
                const d = new Date(e.eventDate);
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-background/40 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <div className="text-center leading-none">
                        <p className="text-[9px] font-semibold uppercase">{d.toLocaleString(undefined, { month: "short" })}</p>
                        <p className="text-base font-bold">{d.getDate()}</p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{e.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {e.venue ? ` · ${e.venue}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyHint label="No events scheduled." />
          )}
        </PanelCard>

        <PanelCard title="Upcoming birthdays" icon={Cake} iconTone="pink">
          {(() => {
            const valid = (meSummary?.upcomingBirthdays ?? []).filter(
              (b) => b.dob && !Number.isNaN(new Date(b.dob).getTime()),
            );
            if (valid.length === 0) return <EmptyHint label="No upcoming birthdays." />;
            return (
              <ul className="space-y-2">
                {valid.slice(0, 5).map((b) => {
                  const d = new Date(b.dob as string);
                  const initials = b.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
                  return (
                    <li
                      key={b.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-2.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-xs font-semibold text-white">
                        {initials}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{b.name}</span>
                      <Badge variant="secondary" className="rounded-full text-[10px]">
                        {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </PanelCard>
      </div>

      {/* Organization */}
      <SectionTitle icon={Building2} label="Organization" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard tone="primary" icon={Users} label="Total Users" value={fmt(stats?.totalUsers)} hint="in your workspace" />
        <StatCard tone="success" icon={UserCheck} label="Active Users" value={fmt(stats?.activeUsers)} hint="status active" />
        <StatCard tone="info" icon={Building2} label="Departments" value={fmt(stats?.totalDepartments)} hint={`${fmt(stats?.activeDepartments)} active`} />
        <StatCard tone="warning" icon={ShieldCheck} label="Roles" value={fmt(stats?.totalRoles)} hint="system + custom" />
      </div>

      {/* Charts */}
      <SectionTitle icon={TrendingUp} label="Insights" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Department Distribution" subtitle="Headcount by department">
          {charts && charts.departmentDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={charts.departmentDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {charts.departmentDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <ChartEmpty />}
        </ChartCard>

        <ChartCard title="Project Status" subtitle="Distribution across statuses">
          {charts && charts.projectStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.projectStatus} barSize={36}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                <Bar dataKey="value" fill="url(#barGrad)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty />}
        </ChartCard>

        <ChartCard title="Attendance — Last 7 Days" subtitle="Daily check-ins">
          {charts && charts.attendanceSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={charts.attendanceSeries}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2.5} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <ChartEmpty />}
        </ChartCard>

        <ChartCard title="Leave Trends — Last 6 Months" subtitle="Status breakdown by month">
          {charts && charts.leaveSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.leaveSeries} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pending" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="approved" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="rejected" stackId="a" fill="#EF4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty />}
        </ChartCard>
      </div>

      {/* ============================ Analytics ============================ */}
      {analytics?.employee && (
        <>
          <SectionTitle icon={ListChecks} label="My Performance" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard tone="warning" icon={Clock3} label="Pending Tasks" value={fmt(analytics.employee.pendingTasks)} hint="open & in progress" />
            <StatCard tone="success" icon={CheckCircle2} label="Approved Tasks" value={fmt(analytics.employee.approvedTasks)} hint="latest submission approved" />
            <StatCard tone="destructive" icon={AlertTriangle} label="Rejected" value={fmt(analytics.employee.rejectedTasks)} hint="submissions rejected" />
            <StatCard tone="info" icon={ClipboardCheck} label="Changes Requested" value={fmt(analytics.employee.changesRequested)} hint="awaiting your update" />
            <StatCard tone="primary" icon={TrendingUp} label="Avg Completion" value={analytics.employee.completedCount > 0 ? `${analytics.employee.avgCompletionHours}h` : "—"} hint={`${analytics.employee.completedCount} completed`} />
          </div>
          <PanelCard title="My recent activity" icon={Activity} subtitle="Your latest actions">
            <RecentActivityList items={analytics.employee.recentActivity} empty="No activity from you yet." />
          </PanelCard>
        </>
      )}

      {isManagerial && analytics?.manager && (
        <>
          <SectionTitle icon={ClipboardCheck} label="Manager Review" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard tone="warning" icon={Inbox} label="Awaiting Review" value={fmt(analytics.manager.tasksAwaitingReview)} hint="tasks + projects" />
            <StatCard tone="destructive" icon={AlertTriangle} label="Overdue Reviews" value={fmt(analytics.manager.overdueReviews)} hint=">3 days pending" />
            <StatCard tone="info" icon={Clock3} label="Avg Review Time" value={analytics.manager.reviewedCount > 0 ? `${analytics.manager.avgReviewHours}h` : "—"} hint={`${analytics.manager.reviewedCount} reviewed`} />
            <StatCard tone="success" icon={TrendingUp} label="Project Completion" value={`${analytics.manager.projectCompletionAvg}%`} hint="avg across active" />
          </div>
          <PanelCard title="Recent submissions" icon={ClipboardCheck} subtitle="Latest items submitted for review">
            {analytics.manager.recentSubmissions.length === 0 ? (
              <EmptyHint label="No submissions yet." />
            ) : (
              <ul className="divide-y divide-border">
                {analytics.manager.recentSubmissions.map((s) => (
                  <li key={`${s.kind}-${s.id}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full text-[10px] uppercase">{s.kind}</Badge>
                        <p className="truncate text-sm font-medium">{s.title}</p>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {s.submittedBy ?? "—"}{s.project ? ` · ${s.project}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SubmissionStatusBadge status={s.status} />
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(parseISO(s.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>
        </>
      )}

      {isManagerial && analytics?.admin && (
        <>
          <SectionTitle icon={ShieldCheck} label="Workspace Analytics" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard tone="primary" icon={ClipboardCheck} label="Submissions" value={fmt(analytics.admin.totalSubmissions)} hint="total this workspace" />
            <StatCard tone="success" icon={CheckCircle2} label="Approval %" value={`${analytics.admin.approvalPct}%`} hint={`${analytics.admin.approvedCount} approved`} />
            <StatCard tone="destructive" icon={AlertTriangle} label="Rejected %" value={`${analytics.admin.rejectedPct}%`} hint={`${analytics.admin.rejectedCount} rejected`} />
            <StatCard tone="warning" icon={Clock3} label="Pending %" value={`${analytics.admin.pendingPct}%`} hint={`${analytics.admin.pendingCount} pending`} />
            <StatCard tone="info" icon={TrendingUp} label="Avg Approval" value={analytics.admin.approvedReviewed > 0 ? `${analytics.admin.avgApprovalHours}h` : "—"} hint={`${analytics.admin.approvedReviewed} approved`} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard tone="success" icon={UserCheck} label="Attendance" value={`${analytics.admin.attendancePct}%`} hint="last 30 days" />
            <StatCard tone="primary" icon={Building2} label="Departments tracked" value={fmt(analytics.admin.departmentProductivity.length)} hint="with completed tasks" />
            <StatCard tone="info" icon={CalendarDays} label="Leaves this period" value={fmt(analytics.admin.leaveSeries.reduce((s, m) => s + m.pending + m.approved + m.rejected, 0))} hint="last 6 months" />
            <StatCard tone="warning" icon={Receipt} label="Payroll Records" value={fmt(analytics.admin.salaryDistribution.reduce((s, d) => s + d.count, 0))} hint="across departments" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Department Productivity" subtitle="Completed tasks · last 30 days">
              {analytics.admin.departmentProductivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.admin.departmentProductivity} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                    <Bar dataKey="value" fill="#19D2D9" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartEmpty />}
            </ChartCard>
            <ChartCard title="Salary Distribution" subtitle="Net payroll by department">
              {analytics.admin.salaryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={analytics.admin.salaryDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {analytics.admin.salaryDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toLocaleString()} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <ChartEmpty />}
            </ChartCard>
            <ChartCard title="Leave Trends" subtitle="Approvals across the last 6 months">
              {analytics.admin.leaveSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.admin.leaveSeries} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="pending" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="approved" stackId="a" fill="#10B981" />
                    <Bar dataKey="rejected" stackId="a" fill="#EF4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartEmpty />}
            </ChartCard>
            <ChartCard title="Workspace Activity" subtitle="Latest events across the platform">
              <RecentActivityList items={analytics.admin.recentActivity} empty="No activity yet." />
            </ChartCard>
          </div>
        </>
      )}

      {/* Recent Activity */}
      <PanelCard title="Recent Activity" icon={Activity} subtitle="Latest events across your workspace">
        {charts && charts.recentActivities.length > 0 ? (
          <ol className="relative space-y-4 border-l border-border pl-5">
            {charts.recentActivities.map((a) => {
              const initials = a.actorName?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
              return (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[27px] top-1 grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary ring-4 ring-card">
                    {initials}
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.summary}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{a.actorName}</span>
                        <span className="mx-1.5">·</span>
                        <Badge variant="secondary" className="rounded-full text-[10px]">{a.action}</Badge>
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyHint label="No recent activity yet." />
        )}
      </PanelCard>
    </div>
  );
}

/* -------------------- Helpers -------------------- */

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 24px -8px rgba(0,0,0,0.15)",
};

function SectionTitle({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</h3>
      <div className="ml-2 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

type Tone = "primary" | "success" | "warning" | "info" | "destructive";

const TONE: Record<Tone, { bg: string; text: string; ring: string; bar: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20", bar: "from-primary to-[color:var(--brand-accent)]" },
  success: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20", bar: "from-emerald-500 to-teal-400" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20", bar: "from-amber-500 to-orange-400" },
  info:    { bg: "bg-sky-500/10",   text: "text-sky-600 dark:text-sky-400",     ring: "ring-sky-500/20",    bar: "from-sky-500 to-blue-400" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/20", bar: "from-rose-500 to-red-400" },
};

function StatCard({
  icon: Icon, label, value, hint, tone = "primary",
}: { icon: LucideIcon; label: string; value: string; hint?: string; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", t.bar)} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn("grid h-10 w-10 place-items-center rounded-2xl ring-1 transition-transform group-hover:scale-110", t.bg, t.text, t.ring)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PanelCard({
  title, subtitle, icon: Icon, iconTone, action, children,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconTone?: "pink";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const iconClasses = iconTone === "pink"
    ? "bg-pink-500/10 text-pink-500"
    : "bg-primary/10 text-primary";
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className={cn("grid h-9 w-9 place-items-center rounded-2xl", iconClasses)}>
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Badge variant="secondary" className="rounded-full text-[10px]">Live</Badge>
      </div>
      {children}
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">
      No data available yet.
    </div>
  );
}

function LinkButton({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Button asChild size="sm" variant="ghost" className="h-7 gap-1 rounded-xl px-2 text-xs">
      <Link to={to}>{children} <ArrowUpRight className="h-3 w-3" /></Link>
    </Button>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function PriorityDot({ priority }: { priority?: string }) {
  const cls =
    priority === "urgent" || priority === "high"
      ? "bg-destructive"
      : priority === "medium"
        ? "bg-amber-500"
        : "bg-emerald-500";
  return <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", cls)} title={priority} />;
}

function RingProgress({ value }: { value: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={r} fill="none"
          stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-foreground">{value}%</span>
    </div>
  );
}

function TaskWidget({
  title, icon: Icon, tone, tasks, emptyHint, showCompleted,
}: {
  title: string;
  icon: LucideIcon;
  tone: Tone;
  tasks: import("@/services/stats.service").MeTaskMini[];
  emptyHint: string;
  showCompleted?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={cn("grid h-9 w-9 place-items-center rounded-2xl ring-1", t.bg, t.text, t.ring)}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto rounded-full text-[10px]">{tasks.length}</Badge>
      </div>
      {tasks.length === 0 ? (
        <EmptyHint label={emptyHint} />
      ) : (
        <ul className="space-y-2">
          {tasks.slice(0, 4).map((task) => (
            <li
              key={task.id}
              className="flex items-start justify-between gap-2 rounded-2xl border border-border bg-background/40 p-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 items-start gap-2">
                <PriorityDot priority={task.priority} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{task.project ?? "—"}</p>
                </div>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-muted-foreground">
                {showCompleted && task.completedAt
                  ? new Date(task.completedAt).toLocaleDateString()
                  : task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Analytics helpers ---------- */

type RecentActivityItem = {
  id: string;
  action: string;
  summary: string;
  actorName: string;
  actorRole?: string | null;
  createdAt: string;
};

function RecentActivityList({ items, empty }: { items: RecentActivityItem[]; empty: string }) {
  if (!items || items.length === 0) return <EmptyHint label={empty} />;
  return (
    <ol className="space-y-3">
      {items.map((a) => {
        const initials =
          a.actorName?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
        return (
          <li
            key={a.id}
            className="flex items-start gap-3 rounded-2xl border border-border bg-background/40 p-3"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">{a.actorName}</span>
                {a.actorRole && (
                  <Badge variant="secondary" className="rounded-full px-1.5 text-[9px] uppercase">
                    {a.actorRole.replace(/_/g, " ")}
                  </Badge>
                )}
                <Badge variant="outline" className="rounded-full text-[9px]">{a.action}</Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.summary}</p>
            </div>
            <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
              {formatDistanceToNow(parseISO(a.createdAt), { addSuffix: true })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SubmissionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
    rejected: { label: "Rejected", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
    pending_review: { label: "Pending", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
    changes_requested: { label: "Changes", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
    none: { label: "—", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status] ?? map.none;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", m.cls)}>
      {m.label}
    </span>
  );
}
