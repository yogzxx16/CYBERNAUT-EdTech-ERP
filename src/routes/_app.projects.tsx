import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Plus,
  Pencil,
  Archive,
  UserPlus,
  X,
  Calendar as CalendarIcon,
  Crown,
  Users as UsersIcon,
  Activity as ActivityIcon,
  CheckCircle2,
  CircleDot,
  Search,
  Send,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { SearchBar } from "@/components/common/SearchBar";
import { FilterBar } from "@/components/common/FilterBar";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { tasksApi, type Task as ProjectTask } from "@/services/tasks.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/store/hooks";
import {
  projectsApi,
  type Project,
  type ProjectPriority,
  type ProjectStatus,
  type CreateProjectInput,
} from "@/services/projects.service";
import { departmentsApi, type Department } from "@/services/departments.service";
import { usersApi, type AppUser } from "@/services/users.service";
import { SubmissionDialog } from "@/components/submissions/SubmissionDialog";
import { SubmissionBadge } from "@/components/submissions/SubmissionBadge";
import { SubmissionTimeline } from "@/components/submissions/SubmissionTimeline";
import { ReviewActions } from "@/components/submissions/ReviewActions";
import type { ReviewInput, SubmissionInput } from "@/services/tasks.service";

export const Route = createFileRoute("/_app/projects")({
  component: ProjectsPage,
});

const STATUS_TONE: Record<ProjectStatus, StatusTone> = {
  planning: "info",
  in_progress: "warning",
  on_hold: "muted",
  completed: "success",
  archived: "muted",
};

const PRIORITY_TONE: Record<ProjectPriority, StatusTone> = {
  low: "muted",
  medium: "info",
  high: "warning",
  critical: "destructive",
};

const STATUS_OPTS: ProjectStatus[] = ["planning", "in_progress", "on_hold", "completed", "archived"];
const PRIORITY_OPTS: ProjectPriority[] = ["low", "medium", "high", "critical"];

interface FormState extends Partial<CreateProjectInput> {
  id?: string;
}

const EMPTY: FormState = { title: "", priority: "medium", status: "planning", assignedEmployees: [] };

function fmtLabel(s: string) {
  return s.replace(/_/g, " ");
}

function ProjectsPage() {
  const me = useAppSelector((s) => s.auth.user);
  const role = me?.role;
  const isManagerial = role === "super_admin" || role === "admin";

  const [items, setItems] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [priority, setPriority] = useState<ProjectPriority | "all">("all");
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Project | null>(null);
  const [detail, setDetail] = useState<Project | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSel, setAssignSel] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const isSuperAdmin = role === "super_admin";
  const isPMOf = (p: Project | null) => !!p && !!me?.id && p.projectManager?.id === me.id;
  const isMemberOf = (p: Project | null) =>
    !!p && !!me?.id && p.members.some((m) => m.id === me.id);
  const canManageMembers = (p: Project | null) =>
    !!p && (isManagerial || isPMOf(p));
  const canSubmitProject = (p: Project | null) => {
    if (!p || !me) return false;
    if (p.submissionStatus === "pending_review") return false;
    return isManagerial || isPMOf(p) || isMemberOf(p);
  };
  const canReviewProject = (p: Project | null) => {
    if (!p || !me) return false;
    if (p.submissionStatus !== "pending_review") return false;
    return isManagerial || isPMOf(p);
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  async function load() {
    setLoading(true);
    try {
      const res = await projectsApi.list({ page, limit, search, status, priority });
      setItems(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function loadMeta() {
    try {
      const [d, u] = await Promise.all([
        departmentsApi.list({ status: "active", limit: 100 }),
        // Everyone needs the user list for member display / picking.
        usersApi.list({ limit: 500, status: "active" }),
      ]);
      setDepartments(d.data);
      setUsers((u.data as AppUser[]) ?? []);
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, priority]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void load();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    void loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(p: Project) {
    setForm({
      id: p.id,
      title: p.title,
      description: p.description,
      department: p.department?.id,
      projectManager: p.projectManager?.id,
      assignedEmployees: p.assignedEmployees.map((m) => m.id),
      priority: p.priority,
      status: p.status === "archived" ? "planning" : p.status,
      startDate: p.startDate?.slice(0, 10),
      endDate: p.endDate?.slice(0, 10),
      completionPercentage: p.completionPercentage,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.projectManager) {
      toast.error("Project Manager is required");
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      toast.error("End date cannot be before start date");
      return;
    }
    setSaving(true);
    try {
      const payload: CreateProjectInput = {
        title: form.title!,
        description: form.description,
        department: form.department || undefined,
        projectManager: form.projectManager,
        assignedEmployees: form.assignedEmployees ?? [],
        priority: form.priority,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate,
        ...(isSuperAdmin ? { completionPercentage: form.completionPercentage } : {}),
      };
      if (form.id) {
        await projectsApi.update(form.id, payload);
        toast.success("Project updated");
      } else {
        await projectsApi.create(payload);
        toast.success("Project created");
      }
      setOpen(false);
      await load();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function archive(p: Project) {
    try {
      await projectsApi.archive(p.id);
      toast.success("Project archived");
      setConfirmTarget(null);
      await load();
    } catch {
      toast.error("Archive failed");
    }
  }

  async function changeProgress(p: Project, value: number) {
    try {
      const updated = await projectsApi.updateProgress(p.id, value);
      setItems((xs) => xs.map((x) => (x.id === p.id ? updated : x)));
      if (detail?.id === p.id) setDetail(updated);
    } catch {
      toast.error("Progress update failed");
    }
  }

  async function changeStatus(p: Project, value: ProjectStatus) {
    try {
      const updated = await projectsApi.updateStatus(p.id, value);
      setItems((xs) => xs.map((x) => (x.id === p.id ? updated : x)));
      if (detail?.id === p.id) setDetail(updated);
      toast.success("Status updated");
    } catch {
      toast.error("Status update failed");
    }
  }

  async function doAssign() {
    if (!detail || assignSel.length === 0) return;
    try {
      const updated = await projectsApi.assignMembers(detail.id, assignSel);
      setDetail(updated);
      setItems((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
      setAssignOpen(false);
      setAssignSel([]);
      toast.success("Members assigned");
    } catch {
      toast.error("Assign failed");
    }
  }

  async function submitProjectDeliverables(input: SubmissionInput) {
    if (!detail) return;
    setSubmitting(true);
    try {
      const updated = await projectsApi.submit(detail.id, input);
      setDetail(updated);
      setItems((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
      setSubmitOpen(false);
      toast.success("Project submitted for review");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function reviewProjectSubmission(input: ReviewInput) {
    if (!detail) return;
    setReviewing(true);
    try {
      const updated = await projectsApi.review(detail.id, input);
      setDetail(updated);
      setItems((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(
        input.decision === "approve"
          ? "Project approved"
          : input.decision === "reject"
            ? "Project rejected"
            : "Changes requested",
      );
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Review failed");
    } finally {
      setReviewing(false);
    }
  }

  async function removeMember(p: Project, userId: string) {
    try {
      const updated = await projectsApi.removeMember(p.id, userId);
      setDetail(updated);
      setItems((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
      toast.success("Member removed");
    } catch {
      toast.error("Remove failed");
    }
  }

  const columns: Column<Project>[] = [
    {
      key: "title",
      header: "Project",
      render: (p) => (
        <button onClick={() => setDetail(p)} className="flex items-start gap-3 text-left">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FolderKanban className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">{p.title}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{p.department?.name ?? "No department"}</span>
              <span>·</span>
              <AvatarCluster members={p.assignedEmployees} max={4} />
            </div>
          </div>
        </button>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (p) => (
        <StatusBadge tone={PRIORITY_TONE[p.priority]}>{fmtLabel(p.priority)}</StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <StatusBadge tone={STATUS_TONE[p.status]}>{fmtLabel(p.status)}</StatusBadge>
      ),
    },
    {
      key: "completionPercentage",
      header: "Progress",
      render: (p) => (
        <div className="min-w-[140px]">
          <Progress value={p.completionPercentage} className="h-2" />
          <div className="mt-1 text-xs text-muted-foreground">{p.completionPercentage}%</div>
        </div>
      ),
    },
    {
      key: "endDate",
      header: "Due",
      render: (p) => (
        <span className="text-muted-foreground">{p.endDate ? p.endDate.slice(0, 10) : "—"}</span>
      ),
    },
    ...(isManagerial
      ? [
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (p: Project) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {p.status !== "archived" && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmTarget(p)}>
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Plan, track and ship work across teams and departments."
        actions={
          isManagerial ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> New Project
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects…" />
        <FilterBar>
          <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus | "all")}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {fmtLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v as ProjectPriority | "all")}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITY_OPTS.map((p) => (
                <SelectItem key={p} value={p}>
                  {fmtLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        data={items}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            icon={FolderKanban}
            title={loading ? "Loading…" : "No projects yet"}
            description={
              isManagerial
                ? "Spin up your first project to start tracking work."
                : "You don't have any project assignments yet."
            }
            action={
              !loading && isManagerial ? (
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" /> New Project
                </Button>
              ) : undefined
            }
          />
        }
      />

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Project" : "New Project"}</DialogTitle>
            <DialogDescription>
              Configure project scope, ownership and timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>Title</Label>
              <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Department</Label>
              <Select
                value={form.department ?? "__none"}
                onValueChange={(v) => setForm({ ...form, department: v === "__none" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>
                Project Manager <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.projectManager ?? ""}
                onValueChange={(v) =>
                  setForm({ ...form, projectManager: v === "__none" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.role === "admin" || u.role === "super_admin")
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={form.priority ?? "medium"}
                onValueChange={(v) => setForm({ ...form, priority: v as ProjectPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {fmtLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status ?? "planning"}
                onValueChange={(v) => setForm({ ...form, status: v as ProjectStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.filter((s) => s !== "archived").map((s) => (
                    <SelectItem key={s} value={s}>
                      {fmtLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate ? form.startDate.slice(0, 10) : ""}
                onChange={(e) => setForm({ ...form, startDate: e.target.value || undefined })}
              />
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.endDate ? form.endDate.slice(0, 10) : ""}
                onChange={(e) => setForm({ ...form, endDate: e.target.value || undefined })}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4" /> Project Members
                </Label>
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {(form.assignedEmployees ?? []).length} selected
                </Badge>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, code, or role…"
                  className="pl-9"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>
              <MemberPicker
                users={users.filter((u) => u.id !== form.projectManager && u.role !== "super_admin")}
                query={memberSearch}
                selected={form.assignedEmployees ?? []}
                onToggle={(id, checked) => {
                  const cur = new Set(form.assignedEmployees ?? []);
                  if (checked) cur.add(id);
                  else cur.delete(id);
                  setForm({ ...form, assignedEmployees: Array.from(cur) });
                }}
              />
            </div>

            {isSuperAdmin && (
              <div className="grid gap-2 sm:col-span-2">
                <Label>
                  Progress override: {form.completionPercentage ?? 0}%
                </Label>
                <p className="text-xs text-muted-foreground">
                  Progress is auto-calculated from completed tasks. Use this slider only when a manual override is necessary.
                </p>
                <Input
                  type="range"
                  min={0}
                  max={100}
                  value={form.completionPercentage ?? 0}
                  onChange={(e) =>
                    setForm({ ...form, completionPercentage: Number(e.target.value) })
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Saving…" : form.id ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!confirmTarget}
        onOpenChange={(v) => !v && setConfirmTarget(null)}
        title="Archive project?"
        description={`"${confirmTarget?.title}" will be moved to archive. Members will keep historical access.`}
        confirmLabel="Archive"
        destructive
        onConfirm={() => confirmTarget && void archive(confirmTarget)}
      />

      <Sheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{detail?.title}</SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="mt-6 space-y-4 text-sm">
              {/* Header summary (always visible) */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={STATUS_TONE[detail.status]}>{fmtLabel(detail.status)}</StatusBadge>
                <StatusBadge tone={PRIORITY_TONE[detail.priority]}>
                  {fmtLabel(detail.priority)} priority
                </StatusBadge>
                {detail.department && (
                  <StatusBadge tone="muted">{detail.department.name}</StatusBadge>
                )}
                {detail.submissionStatus !== "none" && (
                  <SubmissionBadge status={detail.submissionStatus} />
                )}
              </div>
              {detail.description && (
                <p className="text-muted-foreground">{detail.description}</p>
              )}

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="flex w-full flex-wrap gap-1">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="members">Members</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>

                {/* ---------- Overview ---------- */}
                <TabsContent value="overview" className="mt-4 space-y-6">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Progress
                    </Label>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={detail.completionPercentage} className="h-2 flex-1" />
                      <span className="w-10 text-right text-xs font-medium">
                        {detail.completionPercentage}%
                      </span>
                    </div>
                    {isSuperAdmin ? (
                      <Input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={detail.completionPercentage}
                        onChange={(e) => void changeProgress(detail, Number(e.target.value))}
                        className="mt-3"
                      />
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Auto-calculated from approved task submissions.
                      </p>
                    )}
                  </div>

                  {/* Latest submission quick links */}
                  <LatestSubmissionLinks submission={detail.latestSubmission} />

                  {isManagerial && (
                    <div className="grid gap-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Status
                      </Label>
                      <Select
                        value={detail.status}
                        onValueChange={(v) => void changeStatus(detail, v as ProjectStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {fmtLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5" /> Timeline
                    </h4>
                    <ul className="space-y-3 text-sm">
                      <TimelineItem
                        label="Created"
                        date={detail.createdAt}
                        note={detail.startDate ? `Starts ${detail.startDate.slice(0, 10)}` : undefined}
                      />
                      <TimelineItem label="Last updated" date={detail.updatedAt} />
                      {detail.endDate && (
                        <TimelineItem
                          label="Target end"
                          date={detail.endDate}
                          note={
                            new Date(detail.endDate) < new Date() && detail.status !== "completed"
                              ? "Overdue"
                              : undefined
                          }
                        />
                      )}
                    </ul>
                  </div>
                </TabsContent>

                {/* ---------- Members ---------- */}
                <TabsContent value="members" className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Members ({detail.members.length})
                    </Label>
                    {canManageMembers(detail) && (
                      <Button size="sm" variant="outline" onClick={() => { setAssignSel([]); setAssignSearch(""); setAssignOpen(true); }} className="gap-2">
                        <UserPlus className="h-3.5 w-3.5" /> Add members
                      </Button>
                    )}
                  </div>
                  {detail.projectManager && (
                    <div className="mb-2 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                      <MemberAvatar member={detail.projectManager} ring />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="truncate">{detail.projectManager.name}</span>
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <div className="truncate text-xs text-muted-foreground">Project Manager</div>
                      </div>
                      <Badge className="rounded-full bg-primary/10 text-[10px] text-primary hover:bg-primary/10">
                        Lead
                      </Badge>
                    </div>
                  )}
                  <ul className="space-y-2">
                    {detail.members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 px-3 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <MemberAvatar member={m} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{m.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                        </div>
                        <Badge variant="secondary" className="rounded-full text-[10px] capitalize">
                          {m.role.replace(/_/g, " ")}
                        </Badge>
                        {canManageMembers(detail) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 rounded-xl p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => void removeMember(detail, m.id)}
                            title="Remove member"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </li>
                    ))}
                    {detail.members.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
                        No team members assigned yet.
                      </div>
                    )}
                  </ul>
                </TabsContent>

                {/* ---------- Tasks ---------- */}
                <TabsContent value="tasks" className="mt-4">
                  <ProjectTasksList projectId={detail.id} />
                </TabsContent>

                {/* ---------- Deliverables ---------- */}
                <TabsContent value="deliverables" className="mt-4">
                  <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold">Deliverables</h4>
                      </div>
                      <SubmissionBadge status={detail.submissionStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submit the project for final review when work is complete. Reviewers can approve,
                      reject, or request changes.
                    </p>
                    {canSubmitProject(detail) && (
                      <Button onClick={() => setSubmitOpen(true)} className="w-full">
                        <Send className="mr-2 h-3.5 w-3.5" />
                        {detail.submissions.length === 0 ? "Submit Deliverables" : "Resubmit"}
                      </Button>
                    )}
                    {canReviewProject(detail) && (
                      <ReviewActions onReview={reviewProjectSubmission} submitting={reviewing} />
                    )}
                    <SubmissionTimeline submissions={detail.submissions} />
                  </div>
                </TabsContent>

                {/* ---------- Activity ---------- */}
                <TabsContent value="activity" className="mt-4 space-y-4">
                  <ActivityTimeline entity="project" entityId={detail.id} limit={30} title="Project activity" />
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <ActivityIcon className="h-3.5 w-3.5" /> Lifecycle
                    </h4>
                    <ProjectActivity project={detail} />
                  </div>
                </TabsContent>

                {/* ---------- Statistics ---------- */}
                <TabsContent value="stats" className="mt-4">
                  <ProjectStats project={detail} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>


      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Add Project Members
            </DialogTitle>
            <DialogDescription>
              Search and select people to add to this project. Members can view it and update assigned tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, code, or role…"
              className="pl-9"
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
            />
          </div>
          {assignSel.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {users
                .filter((u) => assignSel.includes(u.id))
                .map((u) => (
                  <Badge key={u.id} variant="secondary" className="gap-1 rounded-full pl-1 pr-2">
                    <Avatar className="h-4 w-4">
                      {u.profileImage && <AvatarImage src={u.profileImage} alt={u.name} />}
                      <AvatarFallback className="bg-primary text-[8px] text-primary-foreground">
                        {initials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px]">{u.name}</span>
                    <button
                      onClick={() => setAssignSel((s) => s.filter((x) => x !== u.id))}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          )}
          <MemberPicker
            users={users.filter(
              (u) =>
                !detail?.members.some((m) => m.id === u.id) &&
                u.id !== detail?.projectManager?.id &&
                u.role !== "super_admin",
            )}
            query={assignSearch}
            selected={assignSel}
            onToggle={(id, checked) =>
              setAssignSel((s) => (checked ? [...s, id] : s.filter((x) => x !== id)))
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void doAssign()} disabled={assignSel.length === 0}>
              Add {assignSel.length || ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubmissionDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit Project Deliverables"
        description="Provide the repository, live URL, documentation, or uploaded files for review."
        initial={
          detail?.latestSubmission &&
          (detail.latestSubmission.status === "changes_requested" ||
            detail.latestSubmission.status === "rejected")
            ? {
                repoUrl: detail.latestSubmission.repoUrl,
                liveUrl: detail.latestSubmission.liveUrl,
                docsUrl: detail.latestSubmission.docsUrl,
                notes: detail.latestSubmission.notes,
              }
            : undefined
        }
        submitting={submitting}
        onSubmit={submitProjectDeliverables}
      />
    </div>
  );
}

/* -------------------- Helpers -------------------- */

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
}

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  employee: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  intern: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

function roleBadgeClass(role: string) {
  return ROLE_BADGE[role] ?? "bg-muted text-muted-foreground border-border";
}

function MemberAvatar({
  member,
  ring,
}: {
  member: { id: string; name: string; profileImage?: string };
  ring?: boolean;
}) {
  return (
    <Avatar className={cn("h-9 w-9 shrink-0", ring && "ring-2 ring-primary/30")}>
      {member.profileImage && <AvatarImage src={member.profileImage} alt={member.name} />}
      <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
        {initials(member.name)}
      </AvatarFallback>
    </Avatar>
  );
}

function AvatarCluster({
  members,
  max = 4,
}: {
  members: Array<{ id: string; name: string }>;
  max?: number;
}) {
  const visible = members.slice(0, max);
  const remainder = members.length - visible.length;
  if (members.length === 0) {
    return <span className="text-xs text-muted-foreground">No members</span>;
  }
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((m) => (
          <Avatar key={m.id} className="h-6 w-6 ring-2 ring-card">
            <AvatarFallback className="bg-primary/10 text-[9px] font-semibold text-primary">
              {initials(m.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {remainder > 0 && (
          <div className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-card">
            +{remainder}
          </div>
        )}
      </div>
      <span className="ml-2 text-[11px] text-muted-foreground">
        {members.length} {members.length === 1 ? "member" : "members"}
      </span>
    </div>
  );
}

function MemberPicker({
  users,
  query,
  selected,
  onToggle,
}: {
  users: AppUser[];
  query: string;
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  const q = query.trim().toLowerCase();
  const list = users.filter((u) => {
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.employeeCode ?? "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });
  const sel = new Set(selected);
  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-xs text-muted-foreground">
        No matching users.
      </div>
    );
  }
  return (
    <div className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-border bg-background/40 p-1.5">
      {list.map((u) => {
        const checked = sel.has(u.id);
        return (
          <label
            key={u.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors",
              checked ? "bg-primary/8 ring-1 ring-primary/20" : "hover:bg-muted/50",
            )}
          >
            <Avatar className="h-9 w-9 shrink-0">
              {u.profileImage && <AvatarImage src={u.profileImage} alt={u.name} />}
              <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                {initials(u.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{u.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {u.employeeCode ?? u.email}
              </div>
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                roleBadgeClass(u.role),
              )}
            >
              {u.role.replace(/_/g, " ")}
            </span>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onToggle(u.id, e.target.checked)}
              className="ml-1 h-4 w-4 cursor-pointer accent-primary"
            />
          </label>
        );
      })}
    </div>
  );
}

function ProjectActivity({ project }: { project: Project }) {
  const entries: { id: string; label: string; date: string; icon: typeof CircleDot; note?: string }[] = [
    {
      id: "created",
      label: "Project created",
      date: project.createdAt,
      icon: CircleDot,
      note: project.projectManager ? `Owned by ${project.projectManager.name}` : undefined,
    },
    {
      id: "members",
      label: `${project.members.length} member${project.members.length === 1 ? "" : "s"} on team`,
      date: project.updatedAt,
      icon: UsersIcon,
    },
    {
      id: "progress",
      label: `Progress at ${project.completionPercentage}%`,
      date: project.updatedAt,
      icon: ActivityIcon,
    },
    {
      id: "status",
      label: `Status: ${project.status.replace(/_/g, " ")}`,
      date: project.updatedAt,
      icon: project.status === "completed" ? CheckCircle2 : CircleDot,
    },
  ];
  return (
    <ol className="relative space-y-3 border-l border-border pl-5">
      {entries.map((e) => {
        const Icon = e.icon;
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[27px] top-0.5 grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary ring-4 ring-card">
              <Icon className="h-3 w-3" />
            </span>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{e.label}</p>
                {e.note && <p className="text-[11px] text-muted-foreground">{e.note}</p>}
              </div>
              <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
                {new Date(e.date).toLocaleDateString()}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TimelineItem({ label, date, note }: { label: string; date: string; note?: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
        <CalendarIcon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1">
        <div className="font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">
          {date.slice(0, 10)}
          {note ? ` · ${note}` : ""}
        </div>
      </div>
    </li>
  );
}


/* -------------------- Project detail helpers -------------------- */

function LatestSubmissionLinks({ submission }: { submission: Project["latestSubmission"] }) {
  if (!submission || (!submission.repoUrl && !submission.liveUrl && !submission.docsUrl)) {
    return null;
  }
  const items: { label: string; url?: string }[] = [
    { label: "Repository", url: submission.repoUrl },
    { label: "Live Demo", url: submission.liveUrl },
    { label: "Documentation", url: submission.docsUrl },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Latest submission
      </h4>
      <ul className="space-y-1.5 text-sm">
        {items.map((it) =>
          it.url ? (
            <li key={it.label} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{it.label}</span>
              <a
                href={it.url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-primary hover:underline"
              >
                {it.url}
              </a>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}

function ProjectTasksList({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    tasksApi
      .list({ project: projectId, limit: 50 })
      .then((res) => mounted && setTasks(res.data))
      .catch(() => mounted && setTasks([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [projectId]);

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading tasks…</p>;
  }
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-xs text-muted-foreground">
        No tasks linked to this project yet.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li
          key={t.id}
          className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-background/40 px-3 py-2.5"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{t.title}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <Badge variant="secondary" className="rounded-full text-[10px] capitalize">
                {t.status.replace(/_/g, " ")}
              </Badge>
              {t.submissionStatus !== "none" && <SubmissionBadge status={t.submissionStatus} />}
              {t.dueDate && <span>Due {t.dueDate.slice(0, 10)}</span>}
            </div>
          </div>
          <span className="shrink-0 text-[11px] uppercase text-muted-foreground">{t.priority}</span>
        </li>
      ))}
    </ul>
  );
}

function ProjectStats({ project }: { project: Project }) {
  const subs = project.submissions ?? [];
  const counts = {
    total: subs.length,
    approved: subs.filter((s) => s.status === "approved").length,
    rejected: subs.filter((s) => s.status === "rejected").length,
    pending: subs.filter((s) => s.status === "pending_review").length,
    changes: subs.filter((s) => s.status === "changes_requested").length,
  };
  const latest = project.latestSubmission;
  const reviewCount = subs.reduce((n, s) => n + (s.reviews?.length ?? 0), 0);
  const attachmentCount = subs.reduce((n, s) => n + (s.attachments?.length ?? 0), 0);

  const stats: { label: string; value: string | number }[] = [
    { label: "Members", value: project.members.length + (project.projectManager ? 1 : 0) },
    { label: "Progress", value: `${project.completionPercentage}%` },
    { label: "Submission attempts", value: counts.total },
    { label: "Approved", value: counts.approved },
    { label: "Rejected", value: counts.rejected },
    { label: "Pending review", value: counts.pending },
    { label: "Changes requested", value: counts.changes },
    { label: "Total reviews", value: reviewCount },
    { label: "Attachments", value: attachmentCount },
    { label: "Latest version", value: latest ? `v${latest.version}` : "—" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl border border-border bg-card p-3"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {s.label}
          </div>
          <div className="mt-1 text-lg font-bold tracking-tight">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
