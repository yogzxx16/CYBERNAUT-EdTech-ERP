import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Receipt,
  Plus,
  Download,
  Search,
  TrendingUp,
  Wallet,
  Users as UsersIcon,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  FileText,
  Eye,
  Printer,
  X,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CircleDollarSign,
  Award,
  Minus,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/store/hooks";
import { salaryApi, type SalarySlip } from "@/services/salary.service";
import { usersApi, type AppUser } from "@/services/users.service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/salary-slips")({
  component: SalaryPage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function downloadSlipPDF(slip: SalarySlip) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  const html = `<!doctype html><html><head><title>${slip.slipNumber}</title>
  <style>
    *{box-sizing:border-box;}
    body{font-family:'Inter',-apple-system,sans-serif;color:#0F172A;margin:0;padding:48px;background:#F8FAFC;}
    .card{background:white;border-radius:24px;padding:40px;box-shadow:0 10px 40px rgba(15,23,42,0.08);max-width:780px;margin:0 auto;}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #E5E7EB;padding-bottom:20px;margin-bottom:24px;}
    h1{margin:0;color:#3B82F6;font-size:24px;letter-spacing:-0.02em;}
    .sub{color:#64748b;font-size:12px;margin-top:4px;}
    .slip-pill{background:linear-gradient(135deg,#3B82F6,#60a5fa);color:white;padding:6px 14px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.04em;}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
    .field{background:#F8FAFC;border-radius:12px;padding:12px 14px;}
    .field-label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:4px;}
    .field-value{font-size:14px;font-weight:600;color:#0F172A;}
    table{width:100%;border-collapse:collapse;margin-top:8px;}
    th,td{padding:12px 8px;text-align:left;font-size:13px;}
    th{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #E5E7EB;}
    tr.row{border-bottom:1px solid #F1F5F9;}
    .right{text-align:right;font-variant-numeric:tabular-nums;}
    .pos{color:#059669;font-weight:600;}
    .neg{color:#dc2626;font-weight:600;}
    .total{background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:16px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;margin-top:20px;}
    .total-label{font-size:12px;color:#1e40af;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;}
    .total-amt{font-size:28px;color:#1e3a8a;font-weight:800;letter-spacing:-0.02em;}
    .foot{margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;color:#94a3b8;font-size:11px;text-align:center;}
  </style></head><body>
  <div class="card">
    <div class="head">
      <div>
        <h1>Cybernaut Minutos</h1>
        <p class="sub">Salary Slip · ${MONTHS[slip.month - 1]} ${slip.year}</p>
      </div>
      <span class="slip-pill">${slip.slipNumber}</span>
    </div>
    <div class="grid">
      <div class="field"><div class="field-label">Employee</div><div class="field-value">${slip.employee?.name ?? ""}</div></div>
      <div class="field"><div class="field-label">Employee Code</div><div class="field-value">${slip.employee?.employeeCode ?? "—"}</div></div>
      <div class="field"><div class="field-label">Pay Period</div><div class="field-value">${MONTHS[slip.month - 1]} ${slip.year}</div></div>
      <div class="field"><div class="field-label">Generated</div><div class="field-value">${new Date(slip.generatedAt).toLocaleDateString()}</div></div>
    </div>
    <table>
      <tr><th>Description</th><th class="right">Amount</th></tr>
      <tr class="row"><td>Base Salary</td><td class="right">${formatCurrency(slip.baseSalary)}</td></tr>
      <tr class="row"><td>Working Days</td><td class="right">${slip.workingDays}</td></tr>
      <tr class="row"><td>Leave Days</td><td class="right">${slip.leaveDays}</td></tr>
      <tr class="row"><td>Leave Deduction</td><td class="right neg">- ${formatCurrency(slip.leaveDeduction)}</td></tr>
      <tr class="row"><td>Other Deductions</td><td class="right neg">- ${formatCurrency(slip.deductions)}</td></tr>
      <tr class="row"><td>Bonus</td><td class="right pos">+ ${formatCurrency(slip.bonus)}</td></tr>
    </table>
    <div class="total">
      <span class="total-label">Net Salary</span>
      <span class="total-amt">${formatCurrency(slip.netSalary)}</span>
    </div>
    ${slip.remarks ? `<p style="margin-top:20px;font-size:12px;color:#64748b;">Remarks: ${slip.remarks}</p>` : ""}
    <div class="foot">This is a computer-generated document. No signature required.</div>
  </div>
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}

function friendlyError(message: string | undefined): { title: string; detail: string; isDuplicate: boolean } {
  const msg = message ?? "Generation failed";
  const dup = /duplicate|already exists|already generated|unique/i.test(msg);
  if (dup) {
    return {
      title: "A slip already exists for this period",
      detail: "An earlier salary slip was already generated for this employee in the selected month. Pick a different month or review the existing slip in the history.",
      isDuplicate: true,
    };
  }
  if (/network|fetch|timeout/i.test(msg)) {
    return { title: "Network issue", detail: "We couldn't reach the server. Please check your connection and try again.", isDuplicate: false };
  }
  if (/employee/i.test(msg)) {
    return { title: "Employee details required", detail: msg, isDuplicate: false };
  }
  return { title: "We couldn't generate the slip", detail: msg, isDuplicate: false };
}

function SalaryPage() {
  const me = useAppSelector((s) => s.auth.user);
  const canGenerate = me?.role === "super_admin" || me?.role === "admin";

  const [items, setItems] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [open, setOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [search, setSearch] = useState("");
  const now = new Date();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [form, setForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    baseSalary: 0,
    workingDays: 22,
    leaveDays: 0,
    deductions: 0,
    bonus: 0,
    remarks: "",
  });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<{ title: string; detail: string; isDuplicate: boolean } | null>(null);
  const [preview, setPreview] = useState<SalarySlip | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (filterMonth !== "all") params.month = Number(filterMonth);
      if (filterYear) params.year = Number(filterYear);
      const res = await salaryApi.list(params as never);
      setItems(res.data);
    } catch {
      toast.error("Couldn't load salary slips. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const r = await usersApi.list({ limit: 500, role: "employee", status: "active" });
      const active = (r.data ?? []).filter((u) => u.role === "employee" && u.accountStatus === "active");
      setUsers(active);
    } catch (e) {
      console.error("Failed to load employees for salary dialog", e);
      toast.error("Failed to load employees");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth, filterYear]);

  useEffect(() => {
    if (canGenerate && open) void loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (canGenerate) void loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate]);

  const [employeeSearch, setEmployeeSearch] = useState("");
  const filteredEmployees = users.filter((u) => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      (u.employeeCode ?? "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });
  const selectedEmployee = users.find((u) => u.id === selectedEmployeeId) ?? null;

  // Derived analytics
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (s) =>
        s.slipNumber.toLowerCase().includes(q) ||
        (s.employee?.name ?? "").toLowerCase().includes(q) ||
        (s.employee?.employeeCode ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const summary = useMemo(() => {
    let totalNet = 0, totalGross = 0, totalBonus = 0, totalDeductions = 0;
    const empSet = new Set<string>();
    for (const s of filteredItems) {
      totalNet += s.netSalary;
      totalGross += s.baseSalary + s.bonus;
      totalBonus += s.bonus;
      totalDeductions += s.deductions + s.leaveDeduction;
      if (s.employee?.id) empSet.add(s.employee.id);
    }
    return {
      totalNet,
      totalGross,
      totalBonus,
      totalDeductions,
      employees: empSet.size,
      slips: filteredItems.length,
      avgNet: filteredItems.length ? totalNet / filteredItems.length : 0,
    };
  }, [filteredItems]);

  // 12-month trend (uses currently loaded items)
  const trend = useMemo(() => {
    const byKey = new Map<string, { period: string; net: number; gross: number; count: number }>();
    for (const s of items) {
      const key = `${s.year}-${String(s.month).padStart(2, "0")}`;
      const prev = byKey.get(key) ?? { period: `${MONTHS_SHORT[s.month - 1]} ${String(s.year).slice(2)}`, net: 0, gross: 0, count: 0 };
      prev.net += s.netSalary;
      prev.gross += s.baseSalary + s.bonus;
      prev.count += 1;
      byKey.set(key, prev);
    }
    return Array.from(byKey.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, v]) => v);
  }, [items]);

  const trendChange = useMemo(() => {
    if (trend.length < 2) return 0;
    const last = trend[trend.length - 1].net;
    const prev = trend[trend.length - 2].net;
    if (!prev) return 0;
    return ((last - prev) / prev) * 100;
  }, [trend]);

  // Top employees insight
  const topEarners = useMemo(() => {
    const byEmp = new Map<string, { name: string; code?: string; total: number; count: number }>();
    for (const s of filteredItems) {
      if (!s.employee) continue;
      const prev = byEmp.get(s.employee.id) ?? { name: s.employee.name, code: s.employee.employeeCode, total: 0, count: 0 };
      prev.total += s.netSalary;
      prev.count += 1;
      byEmp.set(s.employee.id, prev);
    }
    return Array.from(byEmp.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredItems]);

  function pickEmployee(u: AppUser) {
    const id = String(u.id ?? "").trim();
    if (!id) return;
    setSelectedEmployeeId(id);
    setForm((f) => ({ ...f, baseSalary: f.baseSalary || u.salary || 0 }));
    setGenError(null);
  }

  async function generate() {
    const employeeId = selectedEmployeeId.trim();
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      const payload = { ...form, employee: employeeId, employeeId };
      await salaryApi.generate(payload);
      toast.success("Slip generated successfully");
      setOpen(false);
      setEmployeeSearch("");
      setSelectedEmployeeId("");
      setForm((f) => ({ ...f, baseSalary: 0 }));
      await load();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      const friendly = friendlyError(err.response?.data?.message);
      setGenError(friendly);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(slip: SalarySlip) {
    setDownloadingId(slip.id);
    await new Promise((r) => setTimeout(r, 700));
    downloadSlipPDF(slip);
    setDownloadingId(null);
    toast.success("Salary slip prepared for download");
  }

  // Detect potential duplicate in dialog before submit
  const potentialDuplicate = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return items.find(
      (s) =>
        s.employee?.id === selectedEmployeeId &&
        s.month === form.month &&
        s.year === form.year,
    ) ?? null;
  }, [items, selectedEmployeeId, form.month, form.year]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary & Payroll"
        description="Monthly payroll history, insights and downloadable payslips."
        actions={
          canGenerate && (
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) setGenError(null);
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-md">
                  <Plus className="h-4 w-4" /> Generate Slip
                </Button>
              </DialogTrigger>
              <GenerateDialog
                users={users}
                employeeSearch={employeeSearch}
                setEmployeeSearch={setEmployeeSearch}
                filteredEmployees={filteredEmployees}
                pickEmployee={pickEmployee}
                selectedEmployee={selectedEmployee}
                selectedEmployeeId={selectedEmployeeId}
                form={form}
                setForm={setForm}
                generate={generate}
                generating={generating}
                error={genError}
                potentialDuplicate={potentialDuplicate}
                onClose={() => setOpen(false)}
              />
            </Dialog>
          )
        }
      />

      {/* Monthly Payroll Summary */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Wallet}
          label="Net Payroll"
          value={formatCurrency(summary.totalNet)}
          tone="primary"
          trendPct={trendChange}
          loading={loading}
        />
        <SummaryCard
          icon={CircleDollarSign}
          label="Gross Payroll"
          value={formatCurrency(summary.totalGross)}
          tone="success"
          loading={loading}
        />
        <SummaryCard
          icon={Award}
          label="Total Bonus"
          value={formatCurrency(summary.totalBonus)}
          tone="warning"
          loading={loading}
        />
        <SummaryCard
          icon={Minus}
          label="Deductions"
          value={formatCurrency(summary.totalDeductions)}
          tone="destructive"
          loading={loading}
        />
      </section>

      {/* Trend chart + Insights */}
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">Salary Trend</h3>
              <p className="text-xs text-muted-foreground">Net payroll over the last 12 months</p>
            </div>
            <Badge variant="outline" className={cn("gap-1 text-xs", trendChange >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {trendChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trendChange).toFixed(1)}% vs prev
            </Badge>
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : trend.length === 0 ? (
            <div className="grid h-64 place-items-center text-sm text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="mx-auto h-8 w-8 opacity-40" />
                <p className="mt-2">No payroll data for the trend yet</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                    formatter={(value: number) => [formatCurrency(value), "Net"]}
                  />
                  <Area type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#netArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Employee Insights</h3>
              <p className="text-xs text-muted-foreground">Top earners this period</p>
            </div>
            <Badge variant="outline" className="gap-1 text-xs">
              <UsersIcon className="h-3 w-3" /> {summary.employees}
            </Badge>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : topEarners.length === 0 ? (
            <div className="grid h-44 place-items-center text-center text-sm text-muted-foreground">
              <div>
                <UsersIcon className="mx-auto h-8 w-8 opacity-40" />
                <p className="mt-2">No employee data yet</p>
              </div>
            </div>
          ) : (
            <ol className="space-y-2">
              {topEarners.map((e, i) => (
                <motion.li
                  key={e.name + i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-2.5 transition-colors hover:bg-muted/60"
                >
                  <div className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                    i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                    i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                    i === 2 ? "bg-gradient-to-br from-orange-300 to-amber-500 text-white" :
                    "bg-muted text-muted-foreground",
                  )}>
                    {i + 1}
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-blue-500 text-xs font-semibold text-white">
                      {initials(e.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{e.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{e.code ?? `${e.count} slip${e.count === 1 ? "" : "s"}`}</div>
                  </div>
                  <div className="text-right text-sm font-bold tabular-nums text-foreground">
                    {formatCompact(e.total)}
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by employee, slip number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-xl pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" /> Filters
            </div>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-9 w-36 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="h-9 w-24 rounded-xl"
              placeholder="Year"
            />
          </div>
        </div>
      </section>

      {/* Salary history */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Salary History
          </h2>
          <Badge variant="outline" className="gap-1 text-xs">
            <FileText className="h-3 w-3" /> {filteredItems.length} slip{filteredItems.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8">
            <EmptyState
              icon={Receipt}
              title="No salary slips found"
              description={
                search
                  ? "No slips match your search. Try a different name or slip number."
                  : "Generate the first salary slip to start tracking payroll history."
              }
              action={
                canGenerate ? (
                  <Button onClick={() => setOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Generate Slip
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((s, i) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.2) }}
                >
                  <SalaryCard
                    slip={s}
                    onPreview={() => setPreview(s)}
                    onDownload={() => void handleDownload(s)}
                    downloading={downloadingId === s.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* PDF Preview */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {preview && (
            <SlipPreview
              slip={preview}
              onClose={() => setPreview(null)}
              onDownload={() => void handleDownload(preview)}
              downloading={downloadingId === preview.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SummaryCard({
  icon: Icon, label, value, tone, trendPct, loading,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone: "primary" | "success" | "warning" | "destructive";
  trendPct?: number;
  loading?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: "from-blue-500 to-indigo-500",
    success: "from-emerald-500 to-teal-500",
    warning: "from-amber-500 to-orange-500",
    destructive: "from-rose-500 to-red-500",
  };
  if (loading) return <Skeleton className="h-28 rounded-2xl" />;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={cn("absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-15 blur-2xl", styles[tone])} />
      <div className="relative flex items-start justify-between">
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm", styles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        {typeof trendPct === "number" && trendPct !== 0 && (
          <Badge variant="outline" className={cn("h-6 gap-1 text-[10px]", trendPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {trendPct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trendPct).toFixed(1)}%
          </Badge>
        )}
      </div>
      <div className="mt-3 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">{value}</div>
    </motion.div>
  );
}

function SalaryCard({
  slip, onPreview, onDownload, downloading,
}: {
  slip: SalarySlip;
  onPreview: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const gross = slip.baseSalary + slip.bonus;
  const totalDeductions = slip.deductions + slip.leaveDeduction;
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-1.5 bg-gradient-to-r from-primary via-blue-500 to-indigo-500" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onPreview} className="flex min-w-0 items-center gap-3 text-left">
            <Avatar className="h-10 w-10 ring-2 ring-background">
              <AvatarFallback className="bg-gradient-to-br from-primary to-blue-500 text-xs font-semibold text-white">
                {initials(slip.employee?.name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-semibold text-foreground group-hover:text-primary">
                {slip.employee?.name ?? "Unknown"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {slip.employee?.employeeCode ?? slip.employee?.email}
              </div>
            </div>
          </button>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 capitalize",
              slip.status === "finalized"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300",
            )}
          >
            {slip.status}
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {MONTHS[slip.month - 1]} {slip.year}
          <span>·</span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{slip.slipNumber}</code>
        </div>

        {/* Breakdown bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Breakdown</span>
            <span>{formatCurrency(gross)} gross</span>
          </div>
          <BreakdownBar base={slip.baseSalary} bonus={slip.bonus} deductions={totalDeductions} />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" /> Base {formatCompact(slip.baseSalary)}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Bonus {formatCompact(slip.bonus)}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Ded {formatCompact(totalDeductions)}
            </span>
          </div>
        </div>

        {/* Net */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/10 to-blue-500/10 px-3 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Net Salary</span>
          <span className="text-xl font-bold tracking-tight text-primary">{formatCurrency(slip.netSalary)}</span>
        </div>

        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1"
            onClick={onDownload}
            disabled={downloading}
          >
            {downloading ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5"
              >
                <motion.span
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <Download className="h-3.5 w-3.5" />
                </motion.span>
                Preparing…
              </motion.span>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" /> PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BreakdownBar({ base, bonus, deductions }: { base: number; bonus: number; deductions: number }) {
  const total = Math.max(base + bonus + deductions, 1);
  const segs = [
    { v: base, c: "bg-primary" },
    { v: bonus, c: "bg-emerald-500" },
    { v: deductions, c: "bg-rose-500" },
  ];
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
      {segs.map((s, i) => (
        <motion.div
          key={i}
          initial={{ width: 0 }}
          animate={{ width: `${(s.v / total) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.1 }}
          className={cn("h-full", s.c)}
        />
      ))}
    </div>
  );
}

function SlipPreview({
  slip, onClose, onDownload, downloading,
}: {
  slip: SalarySlip;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const gross = slip.baseSalary + slip.bonus;
  const totalDeductions = slip.deductions + slip.leaveDeduction;
  const data = [
    { name: "Base", value: slip.baseSalary, color: "hsl(var(--primary))" },
    { name: "Bonus", value: slip.bonus, color: "#10b981" },
    { name: "Deductions", value: totalDeductions, color: "#f43f5e" },
  ].filter((d) => d.value > 0);

  return (
    <>
      {/* Brand header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-indigo-600 px-6 py-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_50%)]" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-lg font-bold tracking-tight">Cybernaut Minutos</DialogTitle>
            <DialogDescription className="text-white/80">
              Salary Slip · {MONTHS[slip.month - 1]} {slip.year}
            </DialogDescription>
          </div>
        </div>
        <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
          <Sparkles className="h-3 w-3" />
          <code className="font-mono">{slip.slipNumber}</code>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        {/* Employee */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-gradient-to-br from-primary to-blue-500 text-sm font-semibold text-white">
              {initials(slip.employee?.name ?? "?")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{slip.employee?.name ?? "—"}</div>
            <div className="truncate text-xs text-muted-foreground">
              {slip.employee?.employeeCode ?? slip.employee?.email}
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 capitalize">{slip.status}</Badge>
        </div>

        {/* Donut + breakdown */}
        <div className="mt-5 grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="relative h-44">
            {data.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2} stroke="none">
                      {data.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Net</div>
                    <div className="text-sm font-bold text-foreground">{formatCompact(slip.netSalary)}</div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="space-y-2">
            <BreakdownRow label="Base Salary" value={slip.baseSalary} color="bg-primary" />
            <BreakdownRow label="Bonus" value={slip.bonus} color="bg-emerald-500" sign="+" />
            <BreakdownRow label="Leave Deduction" value={slip.leaveDeduction} color="bg-rose-500" sign="−" />
            <BreakdownRow label="Other Deductions" value={slip.deductions} color="bg-rose-400" sign="−" />
            <div className="my-2 h-px bg-border" />
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Gross</span>
              <span className="font-semibold">{formatCurrency(gross)}</span>
            </div>
          </div>
        </div>

        {/* Meta grid */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Meta label="Working Days" value={String(slip.workingDays)} />
          <Meta label="Leave Days" value={String(slip.leaveDays)} />
          <Meta label="Generated" value={new Date(slip.generatedAt).toLocaleDateString()} />
          <Meta label="Period" value={`${MONTHS_SHORT[slip.month - 1]} ${slip.year}`} />
        </div>

        {/* Net hero */}
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary/10 via-blue-500/10 to-indigo-500/10 p-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Net Salary</div>
            <div className="mt-1 text-3xl font-bold tracking-tight text-primary">{formatCurrency(slip.netSalary)}</div>
          </div>
          <CheckCircle2 className="h-10 w-10 text-primary/60" />
        </div>

        {slip.remarks && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Remarks</div>
            {slip.remarks}
          </div>
        )}
      </div>

      <DialogFooter className="border-t border-border bg-muted/20 px-6 py-3">
        <Button variant="outline" onClick={onClose} className="gap-1">
          Close
        </Button>
        <Button onClick={onDownload} disabled={downloading} className="gap-1.5">
          {downloading ? (
            <>
              <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>
                <Download className="h-4 w-4" />
              </motion.span>
              Preparing PDF…
            </>
          ) : (
            <>
              <Printer className="h-4 w-4" /> Download PDF
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

function BreakdownRow({ label, value, color, sign }: { label: string; value: number; color: string; sign?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
        {label}
      </span>
      <span className="font-semibold tabular-nums">
        {sign}{sign ? " " : ""}{formatCurrency(value)}
      </span>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function GenerateDialog({
  users, employeeSearch, setEmployeeSearch, filteredEmployees, pickEmployee, selectedEmployee, selectedEmployeeId,
  form, setForm, generate, generating, error, potentialDuplicate, onClose,
}: {
  users: AppUser[];
  employeeSearch: string;
  setEmployeeSearch: (v: string) => void;
  filteredEmployees: AppUser[];
  pickEmployee: (u: AppUser) => void;
  selectedEmployee: AppUser | null;
  selectedEmployeeId: string;
  form: {
    month: number; year: number; baseSalary: number; workingDays: number;
    leaveDays: number; deductions: number; bonus: number; remarks: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    month: number; year: number; baseSalary: number; workingDays: number;
    leaveDays: number; deductions: number; bonus: number; remarks: string;
  }>>;
  generate: () => void;
  generating: boolean;
  error: { title: string; detail: string; isDuplicate: boolean } | null;
  potentialDuplicate: SalarySlip | null;
  onClose: () => void;
}) {
  const previewNet = useMemo(() => {
    // Lightweight preview only — actual calc happens on backend
    const perDay = form.workingDays > 0 ? form.baseSalary / form.workingDays : 0;
    const leaveDed = perDay * form.leaveDays;
    return Math.max(form.baseSalary - leaveDed - form.deductions + form.bonus, 0);
  }, [form]);

  return (
    <DialogContent className="max-w-2xl p-0 overflow-hidden">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-indigo-600 px-6 py-5 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg">Generate Salary Slip</DialogTitle>
            <DialogDescription className="text-white/80">
              Select an employee, configure the period, and we'll do the math.
            </DialogDescription>
          </div>
        </div>
      </div>

      <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
        {error && (
          <div className={cn(
            "mb-4 flex items-start gap-3 rounded-2xl border p-3.5",
            error.isDuplicate
              ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
              : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200",
          )}>
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 text-sm">
              <div className="font-semibold">{error.title}</div>
              <div className="mt-0.5 text-xs opacity-90">{error.detail}</div>
            </div>
          </div>
        )}

        {potentialDuplicate && !error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 text-sm">
              <div className="font-semibold">Heads up — slip already exists</div>
              <div className="mt-0.5 text-xs">
                A slip for <span className="font-mono">{potentialDuplicate.slipNumber}</span> ({MONTHS[potentialDuplicate.month - 1]} {potentialDuplicate.year}) was already generated. Generating again may fail.
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Employee picker */}
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Employee
            </Label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or email…"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-border bg-card">
              {filteredEmployees.length === 0 ? (
                <div className="grid place-items-center p-6 text-center text-xs text-muted-foreground">
                  <UsersIcon className="h-6 w-6 opacity-40" />
                  <p className="mt-2">{users.length === 0 ? "No active employees found." : "No employees match your search."}</p>
                </div>
              ) : (
                filteredEmployees.map((u) => {
                  const active = selectedEmployeeId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); pickEmployee(u); }}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left text-sm transition-colors last:border-b-0",
                        active ? "bg-primary/10" : "hover:bg-muted/40",
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-blue-500 text-[10px] font-semibold text-white">
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{u.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{u.employeeCode ?? u.email}</div>
                      </div>
                      {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })
              )}
            </div>
            {selectedEmployee && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Selected:</span>
                <span className="font-medium text-foreground">{selectedEmployee.name}</span>
              </div>
            )}
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Month">
              <Select value={String(form.month)} onValueChange={(v) => setForm({ ...form, month: Number(v) })}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Year">
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className="h-10 rounded-xl" />
            </Field>
          </div>

          {/* Salary */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Base Salary">
              <Input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })} className="h-10 rounded-xl" />
            </Field>
            <Field label="Working Days">
              <Input type="number" value={form.workingDays} onChange={(e) => setForm({ ...form, workingDays: Number(e.target.value) })} className="h-10 rounded-xl" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Leave Days">
              <Input type="number" value={form.leaveDays} onChange={(e) => setForm({ ...form, leaveDays: Number(e.target.value) })} className="h-10 rounded-xl" />
            </Field>
            <Field label="Deductions">
              <Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })} className="h-10 rounded-xl" />
            </Field>
            <Field label="Bonus">
              <Input type="number" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) })} className="h-10 rounded-xl" />
            </Field>
          </div>

          <Field label="Remarks">
            <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="h-10 rounded-xl" placeholder="Optional note for this slip" />
          </Field>

          {/* Live preview */}
          <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5 px-4 py-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estimated Net</div>
              <div className="text-[11px] text-muted-foreground">Final amount is calculated by the server</div>
            </div>
            <div className="text-xl font-bold tracking-tight text-primary">{formatCurrency(previewNet)}</div>
          </div>
        </div>
      </div>

      <DialogFooter className="border-t border-border bg-muted/20 px-6 py-3">
        <Button variant="outline" onClick={onClose} disabled={generating}>Cancel</Button>
        <Button onClick={generate} disabled={generating || !selectedEmployeeId} className="gap-1.5">
          {generating ? (
            <>
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="h-4 w-4" />
              </motion.span>
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate Slip
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
