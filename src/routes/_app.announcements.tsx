import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Megaphone, Plus, Send, Archive } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAppSelector } from "@/store/hooks";
import {
  announcementsApi,
  type Announcement,
  type AnnouncementPriority,
  type AnnouncementAudience,
} from "@/services/announcements.service";

export const Route = createFileRoute("/_app/announcements")({
  component: AnnouncementsPage,
});

function priorityTone(p: AnnouncementPriority) {
  return p === "critical" ? "destructive" : p === "high" ? "warning" : p === "low" ? "muted" : "info";
}

function AnnouncementsPage() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const canManage = role === "super_admin" || role === "admin";

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(canManage ? "all" : "published");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as AnnouncementPriority,
    audience: "all" as AnnouncementAudience,
  });

  async function load() {
    setLoading(true);
    try {
      const res = await announcementsApi.list({ search, status: statusFilter as never, limit: 50 });
      setItems(res.data);
    } catch (e) {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const visibleItems = useMemo(() => items, [items]);

  function openCreate() {
    setEditing(null);
    setForm({ title: "", description: "", priority: "medium", audience: "all" });
    setOpen(true);
  }
  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description,
      priority: a.priority,
      audience: a.audience,
    });
    setOpen(true);
  }
  async function submit() {
    try {
      if (editing) {
        await announcementsApi.update(editing.id, form);
        toast.success("Announcement updated");
      } else {
        await announcementsApi.create(form);
        toast.success("Announcement created");
      }
      setOpen(false);
      await load();
    } catch {
      toast.error("Action failed");
    }
  }
  async function publish(id: string) {
    try {
      await announcementsApi.publish(id);
      toast.success("Announcement published");
      await load();
    } catch {
      toast.error("Publish failed");
    }
  }
  async function archive(id: string) {
    try {
      await announcementsApi.archive(id);
      toast.success("Archived");
      await load();
    } catch {
      toast.error("Archive failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Broadcast company-wide updates and reach the right audiences."
        actions={
          canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" /> New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Title</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      rows={5}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={form.priority}
                        onValueChange={(v) => setForm({ ...form, priority: v as AnnouncementPriority })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Audience</Label>
                      <Select
                        value={form.audience}
                        onValueChange={(v) => setForm({ ...form, audience: v as AnnouncementAudience })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Everyone</SelectItem>
                          <SelectItem value="admins">Admins</SelectItem>
                          <SelectItem value="employees">Employees</SelectItem>
                          <SelectItem value="interns">Interns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={submit}>{editing ? "Save" : "Create"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        {canManage && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      ) : visibleItems.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Publish updates to keep your team informed." />
      ) : (
        <div className="grid gap-4">
          {visibleItems.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{a.title}</h3>
                    <StatusBadge tone={priorityTone(a.priority)}>{a.priority}</StatusBadge>
                    <Badge variant="secondary" className="text-[10px] capitalize">{a.audience}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{a.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{a.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {a.createdBy?.name ?? "System"} · {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                {canManage && (
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(a)}>Edit</Button>
                    {a.status === "draft" && (
                      <Button size="sm" onClick={() => publish(a.id)} className="gap-1">
                        <Send className="h-3 w-3" /> Publish
                      </Button>
                    )}
                    {a.status !== "archived" && (
                      <Button size="sm" variant="ghost" onClick={() => archive(a.id)} className="gap-1">
                        <Archive className="h-3 w-3" /> Archive
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
