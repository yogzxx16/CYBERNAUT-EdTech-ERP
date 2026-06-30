import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users as UsersIcon,
  Plus,
  Pencil,
  UserX,
  UserCheck,
  Copy,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Building2,
  Calendar,
  IdCard,
  Shield,
  Briefcase,
  MapPin,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { SearchBar } from "@/components/common/SearchBar";
import { FilterBar } from "@/components/common/FilterBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usersApi,
  type AccountStatus,
  type AppUser,
  type AppUserRole,
  type CreateUserInput,
} from "@/services/users.service";
import { departmentsApi, type Department } from "@/services/departments.service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

const ROLE_OPTS: { value: AppUserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "employee", label: "Employee" },
  { value: "intern", label: "Intern" },
];

const ROLE_STYLES: Record<AppUserRole, { badge: string; ring: string; label: string }> = {
  super_admin: {
    badge: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent",
    ring: "ring-amber-400/40",
    label: "Super Admin",
  },
  admin: {
    badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent",
    ring: "ring-violet-400/40",
    label: "Admin",
  },
  employee: {
    badge: "bg-primary/10 text-primary border-primary/20",
    ring: "ring-primary/30",
    label: "Employee",
  },
  intern: {
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
    ring: "ring-emerald-400/30",
    label: "Intern",
  },
};

const DEPT_PALETTE = [
  "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300",
  "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300",
  "bg-amber-500/10 text-amber-800 border-amber-500/20 dark:text-amber-300",
  "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300",
  "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-300",
  "bg-pink-500/10 text-pink-700 border-pink-500/20 dark:text-pink-300",
  "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-300",
];

function deptColor(id?: string | null) {
  if (!id) return "bg-muted text-muted-foreground border-border";
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return DEPT_PALETTE[hash % DEPT_PALETTE.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

const AVATAR_GRADIENTS = [
  "from-sky-500 to-indigo-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-violet-500 to-fuchsia-500",
  "from-cyan-500 to-blue-500",
];

function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

interface FormState extends Partial<CreateUserInput> {
  id?: string;
  designation?: string;
  address?: string;
  bio?: string;
}

const EMPTY: FormState = { firstName: "", lastName: "", role: "employee", dob: "" };

function statusTone(s: AccountStatus) {
  if (s === "active") return "success" as const;
  if (s === "suspended") return "destructive" as const;
  return "warning" as const;
}

function UserAvatar({
  user,
  size = "md",
  ring = false,
}: {
  user: Pick<AppUser, "name" | "profileImage" | "role">;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: boolean;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-xl",
  };
  return (
    <Avatar
      className={cn(
        sizes[size],
        ring && `ring-2 ring-offset-2 ring-offset-background ${ROLE_STYLES[user.role].ring}`,
      )}
    >
      {user.profileImage ? <AvatarImage src={user.profileImage} alt={user.name} /> : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br font-semibold text-white",
          avatarGradient(user.name || "?"),
        )}
      >
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}

function RoleBadge({ role }: { role: AppUserRole }) {
  const s = ROLE_STYLES[role];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", s.badge)}>
      <Shield className="h-3 w-3" />
      {s.label}
    </Badge>
  );
}

function DepartmentBadge({ id, name }: { id?: string | null; name?: string }) {
  if (!name) return <span className="text-xs text-muted-foreground">No department</span>;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", deptColor(id))}>
      <Building2 className="h-3 w-3" />
      {name}
    </Badge>
  );
}

function UsersPage() {
  const [items, setItems] = useState<AppUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AppUserRole | "all">("all");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [department, setDepartment] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  const filteredItems = useMemo(() => {
    if (department === "all") return items;
    if (department === "__none") return items.filter((u) => !u.department);
    return items.filter((u) => u.department === department);
  }, [items, department]);

  async function load() {
    setLoading(true);
    try {
      const res = await usersApi.list({ page, limit, search, role, status });
      setItems(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    try {
      const res = await departmentsApi.list({ status: "active", limit: 100 });
      setDepartments(res.data);
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, role, status]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void load();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    void loadDepartments();
  }, []);

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(u: AppUser) {
    setForm({
      id: u.id,
      firstName: u.firstName ?? u.name.split(" ")[0] ?? "",
      lastName: u.lastName ?? u.name.split(" ").slice(1).join(" "),
      phone: u.phone,
      dob: u.dob ? u.dob.slice(0, 10) : "",
      joiningDate: u.joiningDate ? u.joiningDate.slice(0, 10) : undefined,
      department: u.department ?? undefined,
      role: u.role,
      salary: u.salary,
      designation: u.designation,
      address: u.address,
      bio: u.bio,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.role) {
      toast.error("First name, last name and role are required");
      return;
    }
    if (!form.id && !form.dob) {
      toast.error("Date of birth is required");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await usersApi.update(form.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          dob: form.dob || undefined,
          joiningDate: form.joiningDate || undefined,
          department: form.department || undefined,
          role: form.role,
          salary: form.salary,
          designation: form.designation,
          address: form.address,
          bio: form.bio,
        } as Partial<CreateUserInput>);
        toast.success("User updated");
        setOpen(false);
      } else {
        const created = await usersApi.create({
          firstName: form.firstName!,
          lastName: form.lastName!,
          phone: form.phone,
          dob: form.dob!,
          joiningDate: form.joiningDate,
          department: form.department,
          role: form.role!,
          salary: form.salary,
        });
        toast.success(`User created — ${created.email}`);
        setTempPassword(created.tempPassword);
        setOpen(false);
      }
      await load();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(u: AppUser) {
    try {
      if (u.accountStatus === "suspended") {
        await usersApi.activate(u.id);
        toast.success("User activated");
      } else {
        await usersApi.suspend(u.id);
        toast.success("User suspended");
      }
      await load();
      if (profile?.id === u.id) setProfile(null);
    } catch {
      toast.error("Action failed");
    }
  }

  const columns: Column<AppUser>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => (
        <button onClick={() => setProfile(u)} className="flex items-center gap-3 text-left">
          <UserAvatar user={u} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{u.name}</div>
            <div className="truncate text-xs text-muted-foreground">{u.email}</div>
          </div>
        </button>
      ),
    },
    {
      key: "employeeCode",
      header: "Code",
      render: (u) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{u.employeeCode ?? "—"}</code>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: "department",
      header: "Department",
      render: (u) => (
        <DepartmentBadge id={u.department} name={u.department ? deptName.get(u.department) : undefined} />
      ),
    },
    {
      key: "accountStatus",
      header: "Status",
      render: (u) => (
        <StatusBadge tone={statusTone(u.accountStatus)}>
          {u.accountStatus === "active" ? "Active" : u.accountStatus === "suspended" ? "Suspended" : "Invited"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (u) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void toggleStatus(u)}>
            {u.accountStatus === "suspended" ? (
              <UserCheck className="h-3.5 w-3.5" />
            ) : (
              <UserX className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Invite, manage and assign roles to people in your workspace."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New User
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, code…" />
        <FilterBar>
          <Select value={role} onValueChange={(v) => setRole(v as AppUserRole | "all")}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              <SelectItem value="__none">No department</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus | "all")}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
            </SelectContent>
          </Select>
          <div className="inline-flex h-8 items-center rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors",
                view === "grid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </FilterBar>
      </div>

      {view === "grid" ? (
        filteredItems.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={loading ? "Loading…" : "No users found"}
            description="Adjust filters or create a new user to get started."
            action={
              !loading ? (
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" /> New User
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredItems.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                departmentName={u.department ? deptName.get(u.department) : undefined}
                onOpen={() => setProfile(u)}
                onEdit={() => openEdit(u)}
                onToggle={() => void toggleStatus(u)}
              />
            ))}
          </div>
        )
      ) : (
        <DataTable
          columns={columns}
          data={filteredItems}
          rowKey={(r) => r.id}
          emptyState={
            <EmptyState
              icon={UsersIcon}
              title={loading ? "Loading…" : "No users yet"}
              description="Create your first user — credentials are generated automatically."
              action={
                !loading ? (
                  <Button onClick={openCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> New User
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}

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
            <div className="flex items-center gap-3">
              {form.firstName || form.lastName ? (
                <UserAvatar
                  user={{
                    name: `${form.firstName ?? ""} ${form.lastName ?? ""}`.trim() || "?",
                    role: (form.role as AppUserRole) ?? "employee",
                  }}
                  size="lg"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                  <UsersIcon className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <DialogTitle>{form.id ? "Edit User" : "New User"}</DialogTitle>
                <DialogDescription>
                  {form.id
                    ? "Update profile information and role."
                    : "Email, employee code and temporary password are generated automatically."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="work">Work</TabsTrigger>
              <TabsTrigger value="more">More</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="grid gap-4 py-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>First name</Label>
                <Input
                  value={form.firstName ?? ""}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Last name</Label>
                <Input
                  value={form.lastName ?? ""}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Date of birth</Label>
                <Input
                  type="date"
                  value={(form.dob ?? "").slice(0, 10)}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  disabled={!!form.id}
                />
              </div>
            </TabsContent>

            <TabsContent value="work" className="grid gap-4 py-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={form.role ?? "employee"}
                  onValueChange={(v) => setForm({ ...form, role: v as AppUserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Department</Label>
                <Select
                  value={form.department ?? "__none"}
                  onValueChange={(v) => setForm({ ...form, department: v === "__none" ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
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
                <Label>Designation</Label>
                <Input
                  value={form.designation ?? ""}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  placeholder="e.g. Senior Engineer"
                />
              </div>
              <div className="grid gap-2">
                <Label>Joining date</Label>
                <Input
                  type="date"
                  value={(form.joiningDate ?? "").slice(0, 10)}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Salary</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.salary ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, salary: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="more" className="grid gap-4 py-3">
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input
                  value={form.address ?? ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Bio</Label>
                <Textarea
                  rows={4}
                  value={form.bio ?? ""}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Short professional summary…"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Saving…" : form.id ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tempPassword} onOpenChange={(v) => !v && setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>
              Share this password with the user. They will be required to change it on first login.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
            <code className="text-sm">{tempPassword}</code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (tempPassword) {
                  void navigator.clipboard.writeText(tempPassword);
                  toast.success("Copied");
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!profile} onOpenChange={(v) => !v && setProfile(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>{profile?.name}</SheetTitle>
          </SheetHeader>
          {profile && (
            <div className="-mx-6 -mt-6">
              <div className="relative h-28 bg-gradient-to-br from-primary/80 via-primary to-[color:var(--brand-accent,theme(colors.primary.DEFAULT))]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_60%)]" />
              </div>
              <div className="-mt-12 px-6">
                <UserAvatar user={profile} size="xl" ring />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
                  <StatusBadge tone={statusTone(profile.accountStatus)}>
                    {profile.accountStatus}
                  </StatusBadge>
                </div>
                {profile.designation ? (
                  <p className="text-sm text-muted-foreground">{profile.designation}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <RoleBadge role={profile.role} />
                  <DepartmentBadge
                    id={profile.department}
                    name={profile.department ? deptName.get(profile.department) : undefined}
                  />
                </div>

                <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <InfoRow icon={IdCard} label="Employee Code" value={profile.employeeCode ?? "—"} />
                  <InfoRow icon={Mail} label="Email" value={profile.email} />
                  <InfoRow icon={Phone} label="Phone" value={profile.phone ?? "—"} />
                  <InfoRow
                    icon={Calendar}
                    label="Joined"
                    value={profile.joiningDate ? profile.joiningDate.slice(0, 10) : "—"}
                  />
                  {profile.address ? (
                    <InfoRow icon={MapPin} label="Address" value={profile.address} />
                  ) : null}
                  {profile.salary ? (
                    <InfoRow icon={Wallet} label="Salary" value={String(profile.salary)} />
                  ) : null}
                </div>

                {profile.bio ? (
                  <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground shadow-sm">
                    {profile.bio}
                  </div>
                ) : null}

                <div className="my-6 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => openEdit(profile)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant={profile.accountStatus === "suspended" ? "default" : "destructive"}
                    className="flex-1"
                    onClick={() => void toggleStatus(profile)}
                  >
                    {profile.accountStatus === "suspended" ? "Activate" : "Suspend"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function UserCard({
  user,
  departmentName,
  onOpen,
  onEdit,
  onToggle,
}: {
  user: AppUser;
  departmentName?: string;
  onOpen: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const suspended = user.accountStatus === "suspended";
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-16 bg-gradient-to-br from-primary/80 via-primary to-[color:var(--brand-accent,theme(colors.primary.DEFAULT))]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.3),transparent_60%)]" />
        <div className="absolute right-3 top-3">
          <StatusBadge tone={statusTone(user.accountStatus)}>
            {user.accountStatus === "active"
              ? "Active"
              : user.accountStatus === "suspended"
                ? "Suspended"
                : "Invited"}
          </StatusBadge>
        </div>
      </div>
      <div className="-mt-8 px-5">
        <button onClick={onOpen} className="block">
          <UserAvatar user={user} size="lg" ring />
        </button>
      </div>
      <div className="px-5 pb-5 pt-3">
        <button onClick={onOpen} className="block w-full text-left">
          <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary">
            {user.name}
          </h3>
          {user.designation ? (
            <p className="truncate text-xs text-muted-foreground">{user.designation}</p>
          ) : null}
        </button>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <RoleBadge role={user.role} />
          <DepartmentBadge id={user.department} name={departmentName} />
        </div>

        <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          {user.phone ? (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{user.phone}</span>
            </div>
          ) : null}
          {user.employeeCode ? (
            <div className="flex items-center gap-2">
              <Briefcase className="h-3 w-3 shrink-0" />
              <span className="truncate">{user.employeeCode}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil className="mr-1 h-3 w-3" /> Edit
          </Button>
          <Button
            variant={suspended ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={onToggle}
          >
            {suspended ? (
              <>
                <UserCheck className="mr-1 h-3 w-3" /> Activate
              </>
            ) : (
              <>
                <UserX className="mr-1 h-3 w-3" /> Suspend
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
