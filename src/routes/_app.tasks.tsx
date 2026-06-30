import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ListChecks,
  Plus,
  LayoutGrid,
  Rows3,
  Pencil,
  Paperclip,
  MessageSquare,
  History,
  Link2,
  Trash2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { SearchBar } from "@/components/common/SearchBar";
import { FilterBar } from "@/components/common/FilterBar";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
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
  tasksApi,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskListParams,
} from "@/services/tasks.service";
import { projectsApi, type Project } from "@/services/projects.service";
import { SubmissionDialog } from "@/components/submissions/SubmissionDialog";
import { SubmissionBadge } from "@/components/submissions/SubmissionBadge";
import { SubmissionTimeline } from "@/components/submissions/SubmissionTimeline";
import { ReviewActions } from "@/components/submissions/ReviewActions";
import type { ReviewInput, SubmissionInput } from "@/services/tasks.service";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

const STATUS_OPTS: TaskStatus[] = ["pending", "in_progress", "review", "completed"];
const PRIORITY_OPTS: TaskPriority[] = ["low", "medium", "high", "critical"];

const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  pending: "muted",
  in_progress: "warning",
  review: "info",
  completed: "success",
};
const PRIORITY_TONE: Record<TaskPriority, StatusTone> = {
  low: "muted",
  medium: "info",
  high: "warning",
  critical: "destructive",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

type DueFilter = "all" | "today" | "overdue" | "tomorrow";
type OwnerFilter = "all" | "assigned_to_me" | "created_by_me";

interface FormState {
  id?: string;
  title: string;
  description?: string;
  project?: string;
  assignees: string[];
  dependencies: string[];
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  status: TaskStatus;
  remarks?: string;
}

const EMPTY: FormState = {
  title: "",
  priority: "medium",
  status: "pending",
  assignees: [],
  dependencies: [],
};

function fmt(s: string) {
  return s.replace(/_/g, " ");
}

function TasksPage() {
  const me = useAppSelector((s) => s.auth.user);
  const role = me?.role;
  const isManagerial = role === "super_admin" || role === "admin";

  const [items, setItems] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<"kanban" | "table">("kanban");

  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string>("all");
  const [priority, setPriority] = useState<TaskPriority | "all">("all");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Task | null>(null);
  const [comment, setComment] = useState("");
  const [attName, setAttName] = useState("");
  const [attUrl, setAttUrl] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  // Selected project (for assignee picker) — pulled from create form selection.
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === form.project) ?? null,
    [projects, form.project],
  );
  const projectMembers = useMemo(() => {
    if (!selectedProject) return [];
    const pm = selectedProject.projectManager;
    const members = selectedProject.members ?? selectedProject.assignedEmployees ?? [];
    const all = [...(pm ? [pm] : []), ...members];
    const seen = new Set<string>();
    return all.filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)));
  }, [selectedProject]);

  // Existing tasks in selected project — for dependency picker.
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  useEffect(() => {
    if (!form.project || !open) {
      setProjectTasks([]);
      return;
    }
    void tasksApi.list({ project: form.project, limit: 100 }).then((r) => setProjectTasks(r.data));
  }, [form.project, open]);

  const isPMOf = (p: Project | null | undefined) =>
    !!p && !!me?.id && p.projectManager?.id === me.id;
  const canCreateTaskInProject = (p: Project | null | undefined) =>
    !!p && (isManagerial || isPMOf(p));
  const canEditTaskMeta = (t: Task | null) => {
    if (!t || !me) return false;
    if (isManagerial) return true;
    const proj = projects.find((p) => p.id === t.project?.id);
    return isPMOf(proj);
  };
  const isAssigneeOf = (t: Task | null) =>
    !!t && !!me?.id && t.assignees.some((a) => a.id === me.id);
  const canSubmitTask = (t: Task | null) => {
    if (!t || !me) return false;
    if (t.submissionStatus === "pending_review") return false;
    return isAssigneeOf(t) || isManagerial;
  };
  const canReviewTask = (t: Task | null) => {
    if (!t || !me) return false;
    if (t.submissionStatus !== "pending_review") return false;
    if (isManagerial) return true;
    const proj = projects.find((p) => p.id === t.project?.id);
    return isPMOf(proj);
  };

  async function load() {
    setLoading(true);
    try {
      const params: TaskListParams = {
        limit: 100,
        search,
        project: projectId !== "all" ? projectId : undefined,
        priority,
        status,
        dueFilter: dueFilter === "all" ? undefined : dueFilter,
        mine: ownerFilter === "assigned_to_me" ? true : undefined,
        createdByMe: ownerFilter === "created_by_me" ? true : undefined,
      };
      const res = await tasksApi.list(params);
      setItems(res.data);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function loadMeta() {
    try {
      const p = await projectsApi.list({ limit: 100 });
      setProjects(p.data);
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, priority, status, dueFilter, ownerFilter]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    void loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm({ ...EMPTY, project: projectId !== "all" ? projectId : undefined });
    setOpen(true);
  }

  function openEdit(t: Task) {
    setForm({
      id: t.id,
      title: t.title,
      description: t.description,
      project: t.project?.id,
      assignees: t.assignees.map((a) => a.id),
      dependencies: t.dependencies.map((d) => d.id),
      priority: t.priority,
      status: t.status,
      startDate: t.startDate?.slice(0, 10),
      dueDate: t.dueDate?.slice(0, 10),
      remarks: t.remarks,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.title?.trim()) return toast.error("Title is required");
    if (!form.id && !form.project) return toast.error("Project is required");
    if (form.assignees.length === 0) return toast.error("At least one assignee is required");
    if (form.startDate && form.dueDate && form.dueDate < form.startDate) {
      return toast.error("Due date cannot be before start date");
    }
    setSaving(true);
    try {
      if (form.id) {
        await tasksApi.update(form.id, {
          title: form.title,
          description: form.description,
          assignees: form.assignees,
          dependencies: form.dependencies,
          priority: form.priority,
          status: form.status,
          startDate: form.startDate ?? null,
          dueDate: form.dueDate ?? null,
          remarks: form.remarks,
        });
        toast.success("Task updated");
      } else {
        await tasksApi.create({
          title: form.title,
          description: form.description,
          project: form.project!,
          assignees: form.assignees,
          dependencies: form.dependencies,
          priority: form.priority,
          status: form.status,
          startDate: form.startDate,
          dueDate: form.dueDate,
        });
        toast.success("Task created");
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

  async function changeStatus(t: Task, s: TaskStatus) {
    try {
      const updated = await tasksApi.updateStatus(t.id, s);
      setItems((xs) => xs.map((x) => (x.id === t.id ? updated : x)));
      if (detail?.id === t.id) setDetail(updated);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Update failed");
    }
  }

  async function postComment() {
    if (!detail || !comment.trim()) return;
    try {
      const updated = await tasksApi.addComment(detail.id, comment.trim());
      setDetail(updated);
      setComment("");
    } catch {
      toast.error("Failed to add comment");
    }
  }

  async function uploadAttachment() {
    if (!detail || !attName.trim() || !attUrl.trim()) return;
    try {
      const updated = await tasksApi.addAttachment(detail.id, attName.trim(), attUrl.trim());
      setDetail(updated);
      setAttName("");
      setAttUrl("");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Failed to upload attachment");
    }
  }

  async function deleteAttachment(attId: string) {
    if (!detail) return;
    try {
      const updated = await tasksApi.removeAttachment(detail.id, attId);
      setDetail(updated);
    } catch {
      toast.error("Failed to remove attachment");
    }
  }

  async function submitTaskDeliverables(input: SubmissionInput) {
    if (!detail) return;
    setSubmitting(true);
    try {
      const updated = await tasksApi.submit(detail.id, input);
      setDetail(updated);
      setItems((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
      setSubmitOpen(false);
      toast.success("Task submitted for review");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function reviewTaskSubmission(input: ReviewInput) {
    if (!detail) return;
    setReviewing(true);
    try {
      const updated = await tasksApi.review(detail.id, input);
      setDetail(updated);
      setItems((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(
        input.decision === "approve"
          ? "Submission approved"
          : input.decision === "reject"
            ? "Submission rejected"
            : "Changes requested",
      );
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Review failed");
    } finally {
      setReviewing(false);
    }
  }


  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      review: [],
      completed: [],
    };
    for (const t of items) map[t.status].push(t);
    return map;
  }, [items]);

  const tableCols: Column<Task>[] = [
    {
      key: "title",
      header: "Task",
      render: (t) => (
        <button onClick={() => setDetail(t)} className="text-left">
          <div className="font-medium text-foreground">{t.title}</div>
          <div className="text-xs text-muted-foreground">{t.project?.title ?? "—"}</div>
        </button>
      ),
    },
    {
      key: "assignees",
      header: "Assignees",
      render: (t) => (
        <span className="text-xs">
          {t.assignees.length === 0
            ? "Unassigned"
            : t.assignees
                .slice(0, 2)
                .map((a) => a.name)
                .join(", ") + (t.assignees.length > 2 ? ` +${t.assignees.length - 2}` : "")}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (t) => (
        <StatusBadge tone={PRIORITY_TONE[t.priority]}>{fmt(t.priority)}</StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t) => <StatusBadge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</StatusBadge>,
    },
    {
      key: "dueDate",
      header: "Due",
      render: (t) => (
        <span className="text-muted-foreground">{t.dueDate ? t.dueDate.slice(0, 10) : "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (t) =>
        canEditTaskMeta(t) ? (
          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null,
    },
  ];

  const showCreate =
    isManagerial || projects.some((p) => p.projectManager?.id === me?.id);

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Plan, assign and ship tasks across your projects."
        actions={
          <div className="flex gap-2">
            <div className="flex rounded-md border border-border">
              <Button
                variant={view === "kanban" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("kanban")}
                className="gap-2"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Kanban
              </Button>
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("table")}
                className="gap-2"
              >
                <Rows3 className="h-3.5 w-3.5" /> Table
              </Button>
            </div>
            {showCreate && (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" /> New Task
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tasks…" />
        <FilterBar>
          <Select value={ownerFilter} onValueChange={(v) => setOwnerFilter(v as OwnerFilter)}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tasks</SelectItem>
              <SelectItem value="assigned_to_me">Assigned to me</SelectItem>
              <SelectItem value="created_by_me">Created by me</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dueFilter} onValueChange={(v) => setDueFilter(v as DueFilter)}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any due</SelectItem>
              <SelectItem value="today">Due today</SelectItem>
              <SelectItem value="tomorrow">Due tomorrow</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="h-8 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority | "all")}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITY_OPTS.map((p) => (
                <SelectItem key={p} value={p}>
                  {fmt(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus | "all")}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      {view === "kanban" ? (
        items.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={loading ? "Loading…" : "No tasks yet"}
            description="Create your first task to start tracking work."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STATUS_OPTS.map((col) => (
              <div key={col} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{STATUS_LABEL[col]}</h3>
                  <StatusBadge tone={STATUS_TONE[col]}>{grouped[col].length}</StatusBadge>
                </div>
                <div className="space-y-2">
                  {grouped[col].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setDetail(t)}
                      className="block w-full rounded-xl border border-border bg-background p-3 text-left transition-shadow hover:shadow-soft"
                    >
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t.project?.title ?? "—"}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <StatusBadge tone={PRIORITY_TONE[t.priority]}>{fmt(t.priority)}</StatusBadge>
                        <span className="text-xs text-muted-foreground">
                          {t.assignees.length === 0
                            ? "Unassigned"
                            : t.assignees.length === 1
                            ? t.assignees[0].name
                            : `${t.assignees[0].name} +${t.assignees.length - 1}`}
                        </span>
                      </div>
                    </button>
                  ))}
                  {grouped[col].length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">No tasks</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <DataTable
          columns={tableCols}
          data={items}
          rowKey={(r) => r.id}
          emptyState={
            <EmptyState
              icon={ListChecks}
              title={loading ? "Loading…" : "No tasks"}
              description="No tasks match your filters."
            />
          }
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Task" : "New Task"}</DialogTitle>
            <DialogDescription>Configure assignment, priority and timeline.</DialogDescription>
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
            <div className="grid gap-2 sm:col-span-2">
              <Label>Project <span className="text-destructive">*</span></Label>
              <Select
                value={form.project ?? "__none"}
                onValueChange={(v) =>
                  setForm({ ...form, project: v === "__none" ? undefined : v, assignees: [], dependencies: [] })
                }
                disabled={!!form.id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select project</SelectItem>
                  {projects
                    .filter((p) => form.id || canCreateTaskInProject(p))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Assignees <span className="text-destructive">*</span></Label>
              {!form.project ? (
                <p className="text-xs text-muted-foreground">Select a project first.</p>
              ) : projectMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  This project has no members yet. Add members in the Projects page.
                </p>
              ) : (
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {projectMembers.map((u) => {
                    const checked = form.assignees.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 hover:bg-muted/40"
                      >
                        <div>
                          <div className="text-sm">{u.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {u.role.replace(/_/g, " ")} · {u.email}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const cur = new Set(form.assignees);
                            if (e.target.checked) cur.add(u.id);
                            else cur.delete(u.id);
                            setForm({ ...form, assignees: Array.from(cur) });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Dependencies</Label>
              {!form.project ? (
                <p className="text-xs text-muted-foreground">Select a project first.</p>
              ) : projectTasks.filter((pt) => pt.id !== form.id).length === 0 ? (
                <p className="text-xs text-muted-foreground">No other tasks in this project yet.</p>
              ) : (
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {projectTasks
                    .filter((pt) => pt.id !== form.id)
                    .map((pt) => {
                      const checked = form.dependencies.includes(pt.id);
                      return (
                        <label
                          key={pt.id}
                          className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 hover:bg-muted/40"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm">{pt.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {STATUS_LABEL[pt.status]}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const cur = new Set(form.dependencies);
                              if (e.target.checked) cur.add(pt.id);
                              else cur.delete(pt.id);
                              setForm({ ...form, dependencies: Array.from(cur) });
                            }}
                          />
                        </label>
                      );
                    })}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={form.priority ?? "medium"}
                onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {fmt(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status ?? "pending"}
                onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.startDate ? form.startDate.slice(0, 10) : ""}
                onChange={(e) => setForm({ ...form, startDate: e.target.value || undefined })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.dueDate ? form.dueDate.slice(0, 10) : ""}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value || undefined })}
              />
            </div>
            {form.id && (
              <div className="grid gap-2 sm:col-span-2">
                <Label>Remarks</Label>
                <Textarea
                  rows={2}
                  value={form.remarks ?? ""}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Saving…" : form.id ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{detail?.title}</SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="mt-6 space-y-4 text-sm">
              {/* Header summary */}
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={STATUS_TONE[detail.status]}>
                  {STATUS_LABEL[detail.status]}
                </StatusBadge>
                <StatusBadge tone={PRIORITY_TONE[detail.priority]}>
                  {fmt(detail.priority)} priority
                </StatusBadge>
                {detail.submissionStatus !== "none" && (
                  <SubmissionBadge status={detail.submissionStatus} />
                )}
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="flex w-full flex-wrap gap-1">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                  <TabsTrigger value="attachments">Attachments</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                {/* ---------- Overview ---------- */}
                <TabsContent value="overview" className="mt-4 space-y-5">
                  {detail.description ? (
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Description
                      </Label>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {detail.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">No description provided.</p>
                  )}

                  <div className="space-y-1">
                    <Row label="Project" value={detail.project?.title ?? "—"} />
                    <Row
                      label="Assignees"
                      value={
                        detail.assignees.length === 0
                          ? "Unassigned"
                          : detail.assignees.map((a) => a.name).join(", ")
                      }
                    />
                    <Row label="Priority" value={fmt(detail.priority)} />
                    <Row
                      label="Start"
                      value={detail.startDate ? detail.startDate.slice(0, 10) : "—"}
                    />
                    <Row
                      label="Due"
                      value={detail.dueDate ? detail.dueDate.slice(0, 10) : "—"}
                    />
                    {detail.completedAt && (
                      <Row label="Completed" value={detail.completedAt.slice(0, 10)} />
                    )}
                  </div>

                  {detail.dependencies.length > 0 && (
                    <div>
                      <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        <Link2 className="h-3.5 w-3.5" /> Dependencies
                      </Label>
                      <ul className="mt-2 space-y-1">
                        {detail.dependencies.map((d) => (
                          <li
                            key={d.id}
                            className="flex items-center justify-between rounded-md border border-border px-2 py-1.5"
                          >
                            <span className="truncate">{d.title}</span>
                            <StatusBadge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</StatusBadge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Quick status
                    </Label>
                    <Select
                      value={detail.status}
                      onValueChange={(v) => void changeStatus(detail, v as TaskStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {canEditTaskMeta(detail) && (
                    <Button variant="outline" className="w-full" onClick={() => openEdit(detail)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Task
                    </Button>
                  )}
                </TabsContent>

                {/* ---------- Comments ---------- */}
                <TabsContent value="comments" className="mt-4 space-y-3">
                  <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" /> Comments ({detail.comments.length})
                  </Label>
                  <ul className="space-y-2">
                    {detail.comments.map((c) => (
                      <li key={c.id} className="rounded-md border border-border p-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {c.user?.name ?? "Unknown"}
                          </span>
                          <span>{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{c.message}</p>
                      </li>
                    ))}
                    {detail.comments.length === 0 && (
                      <p className="text-xs text-muted-foreground">No comments yet.</p>
                    )}
                  </ul>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment…"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <Button size="sm" onClick={() => void postComment()} disabled={!comment.trim()}>
                      Post
                    </Button>
                  </div>
                </TabsContent>

                {/* ---------- Attachments ---------- */}
                <TabsContent value="attachments" className="mt-4 space-y-3">
                  <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" /> Attachments ({detail.attachments.length})
                  </Label>
                  <ul className="space-y-1">
                    {detail.attachments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-md border border-border px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <a
                            href={a.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-sm font-medium text-primary hover:underline"
                          >
                            {a.filename}
                          </a>
                          <div className="text-xs text-muted-foreground">
                            {a.uploadedBy?.name ?? "?"} ·{" "}
                            {new Date(a.uploadedAt).toLocaleString()}
                          </div>
                        </div>
                        {canEditTaskMeta(detail) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void deleteAttachment(a.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </li>
                    ))}
                    {detail.attachments.length === 0 && (
                      <p className="text-xs text-muted-foreground">No attachments yet.</p>
                    )}
                  </ul>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <Input
                      placeholder="Filename"
                      value={attName}
                      onChange={(e) => setAttName(e.target.value)}
                    />
                    <Input
                      placeholder="https://… file URL"
                      value={attUrl}
                      onChange={(e) => setAttUrl(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => void uploadAttachment()}
                      disabled={!attName.trim() || !attUrl.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </TabsContent>

                {/* ---------- Submission History ---------- */}
                <TabsContent value="submissions" className="mt-4">
                  <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold">Submission history</h4>
                        <p className="text-xs text-muted-foreground">
                          Every version of this task's submitted deliverables.
                        </p>
                      </div>
                      <SubmissionBadge status={detail.submissionStatus} />
                    </div>
                    {canSubmitTask(detail) && (
                      <Button onClick={() => setSubmitOpen(true)} className="w-full">
                        <Send className="mr-2 h-3.5 w-3.5" />
                        {detail.submissions.length === 0 ? "Submit Task" : "Resubmit"}
                      </Button>
                    )}
                    {canReviewTask(detail) && (
                      <ReviewActions onReview={reviewTaskSubmission} submitting={reviewing} />
                    )}
                    <SubmissionTimeline submissions={detail.submissions} />
                  </div>
                </TabsContent>

                {/* ---------- Review History ---------- */}
                <TabsContent value="reviews" className="mt-4">
                  <TaskReviewHistory submissions={detail.submissions} />
                </TabsContent>

                {/* ---------- Activity ---------- */}
                <TabsContent value="activity" className="mt-4 space-y-4">
                  <ActivityTimeline entity="task" entityId={detail.id} limit={30} title="Task activity" />
                  <div>
                    <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <History className="h-3.5 w-3.5" /> Lifecycle
                    </Label>
                    <ul className="mt-2 space-y-2">
                      {[...detail.history]
                        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                        .map((h) => (
                          <li
                            key={h.id}
                            className="flex items-start justify-between gap-2 rounded-md border border-border p-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium capitalize">
                                {h.action.replace(/_/g, " ")}
                              </div>
                              {h.details && (
                                <div className="text-xs text-muted-foreground">{h.details}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {h.by?.name ?? "System"}
                              </div>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {new Date(h.at).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      {detail.history.length === 0 && (
                        <p className="text-xs text-muted-foreground">No activity yet.</p>
                      )}
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <SubmissionDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit Task"
        description="Provide a repository, live URL, or upload your deliverable files for review."
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
        onSubmit={submitTaskDeliverables}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

/* -------------------- Task review history -------------------- */

function TaskReviewHistory({ submissions }: { submissions: Task["submissions"] }) {
  const entries = submissions
    .flatMap((s) =>
      (s.reviews ?? []).map((r) => ({
        version: s.version,
        reviewer: r.reviewer?.name ?? "Unknown",
        status: r.status,
        comment: r.comment ?? "",
        at: r.at,
      })),
    )
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-xs text-muted-foreground">
        No reviews recorded yet.
      </div>
    );
  }

  const TONE: Record<string, string> = {
    approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    rejected: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    changes_requested: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  };

  return (
    <ul className="space-y-2">
      {entries.map((e, i) => (
        <li
          key={i}
          className="rounded-2xl border border-border bg-card p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${TONE[e.status] ?? "bg-muted text-muted-foreground"}`}
            >
              {e.status.replace(/_/g, " ")}
            </span>
            <span className="text-xs font-medium">v{e.version}</span>
            <span className="text-xs text-muted-foreground">· {e.reviewer}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {new Date(e.at).toLocaleString()}
            </span>
          </div>
          {e.comment && (
            <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted-foreground">
              {e.comment}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
