import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Pencil, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { SearchBar } from "@/components/common/SearchBar";
import { FilterBar } from "@/components/common/FilterBar";
import { StatusBadge } from "@/components/common/StatusBadge";
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
import { departmentsApi, type Department } from "@/services/departments.service";

export const Route = createFileRoute("/_app/departments")({
  component: DepartmentsPage,
});

type StatusFilter = "active" | "archived" | "all";

interface FormState {
  id?: string;
  name: string;
  code: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: "", code: "", description: "" };

function DepartmentsPage() {
  const [items, setItems] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Department | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  async function load() {
    setLoading(true);
    try {
      const res = await departmentsApi.list({ page, limit, search, status });
      setItems(res.data);
      setTotal(res.total);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Failed to load departments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void load();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setOpen(true);
  }
  function openEdit(d: Department) {
    setForm({ id: d.id, name: d.name, code: d.code, description: d.description ?? "" });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await departmentsApi.update(form.id, {
          name: form.name,
          code: form.code,
          description: form.description,
        });
        toast.success("Department updated");
      } else {
        await departmentsApi.create({
          name: form.name,
          code: form.code,
          description: form.description || undefined,
        });
        toast.success("Department created");
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

  async function archive(d: Department) {
    try {
      await departmentsApi.archive(d.id);
      toast.success("Department archived");
      setConfirmTarget(null);
      await load();
    } catch {
      toast.error("Archive failed");
    }
  }
  async function restore(d: Department) {
    try {
      await departmentsApi.restore(d.id);
      toast.success("Department restored");
      await load();
    } catch {
      toast.error("Restore failed");
    }
  }

  const columns: Column<Department>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "code", header: "Code", render: (r) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.code}</code> },
    { key: "description", header: "Description", render: (r) => <span className="text-muted-foreground">{r.description || "—"}</span> },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge tone={r.status === "active" ? "success" : "muted"}>
          {r.status === "active" ? "Active" : "Archived"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {r.status === "active" ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmTarget(r)}>
              <Archive className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => void restore(r)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organise teams and business units across your company."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Department
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search departments…" />
        <FilterBar>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
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
            icon={Building2}
            title={loading ? "Loading…" : "No departments yet"}
            description="Create your first department to start organising your workspace."
            action={
              !loading ? (
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" /> New Department
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Department" : "New Department"}</DialogTitle>
            <DialogDescription>
              Department names and codes must be unique across the organisation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="dept-name">Name</Label>
              <Input
                id="dept-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Engineering"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dept-code">Code</Label>
              <Input
                id="dept-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="ENG"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dept-desc">Description</Label>
              <Textarea
                id="dept-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Saving…" : form.id ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!confirmTarget}
        onOpenChange={(v) => !v && setConfirmTarget(null)}
        title="Archive department?"
        description={`"${confirmTarget?.name}" will be archived. It can be restored later — departments are never permanently deleted.`}
        confirmLabel="Archive"
        destructive
        onConfirm={() => confirmTarget && void archive(confirmTarget)}
      />
    </div>
  );
}
