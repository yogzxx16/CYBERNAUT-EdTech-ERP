import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  UserCircle2,
  Upload,
  KeyRound,
  Save,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  BadgeCheck,
  Shield,
  Activity,
  Monitor,
  Smartphone,
  Globe,
  Clock,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Camera,
  Pencil,
  Eye,
  EyeOff,
  Hash,
  Cake,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usersApi, type AppUser } from "@/services/users.service";
import { departmentsApi, type Department } from "@/services/departments.service";
import { authApi } from "@/services/auth.service";
import { auditApi, type AuditLog } from "@/services/audit.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/roles";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function initials(name?: string) {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function authUserDisplayName(user: AuthUser | null | undefined) {
  const fullName = user?.fullName?.trim();
  if (fullName) return fullName;

  const name = user?.name?.trim();
  if (name) return name;

  const joinedName = [user?.firstName, user?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  if (joinedName) return joinedName;

  const emailLocalPart = user?.email?.split("@")[0]?.trim();
  return emailLocalPart || "User";
}

const ROLE_META: Record<string, { label: string; cls: string }> = {
  super_admin: { label: "Super Admin", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
  admin: { label: "Admin", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  project_manager: { label: "Project Manager", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  hr: { label: "HR", cls: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30" },
  manager: { label: "Manager", cls: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
  employee: { label: "Employee", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  intern: { label: "Intern", cls: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30" },
};

function parseUA(ua: string) {
  const isMobile = /Mobi|Android|iPhone|iPad/.test(ua);
  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let os = "Unknown OS";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return { isMobile, browser, os };
}

function ProfilePage() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.auth);
  const [me, setMe] = useState<AppUser | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    bio: "",
    profileImage: "",
  });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pwOpen, setPwOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [u, deps] = await Promise.all([
        usersApi.me(),
        departmentsApi.list({ status: "active", limit: 200 }).catch(() => ({ data: [] as Department[] })),
      ]);
      setMe(u);
      setDepartments((deps as { data: Department[] }).data);
      setForm({
        firstName: u.firstName ?? u.name.split(" ")[0] ?? "",
        lastName: u.lastName ?? u.name.split(" ").slice(1).join(" "),
        phone: u.phone ?? "",
        address: u.address ?? "",
        bio: u.bio ?? "",
        profileImage: u.profileImage ?? "",
      });
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!me) return;
    setLogsLoading(true);
    auditApi
      .list({ actor: me.id, limit: 25 })
      .then((r) => setLogs(r.data))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  }, [me?.id]);

  useEffect(() => {
    if (me?.forcePasswordChange) setPwOpen(true);
  }, [me]);

  async function handleAvatar(file: File) {
    if (file.size > 400_000) {
      toast.error("Image must be under 400KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, profileImage: String(reader.result ?? "") }));
      toast.success("Avatar ready — click Save to apply");
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await usersApi.updateSelf(form);
      toast.success("Profile updated");
      setMe(updated);
      if (session.user && session.token) {
        dispatch(
          setCredentials({
            user: { ...session.user, name: updated.name, profileImage: updated.profileImage },
            token: session.token,
          }),
        );
      }
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const depName = me?.department ? departments.find((d) => d.id === me.department)?.name : null;
  const roleMeta = me ? ROLE_META[me.role] ?? { label: me.role.replace(/_/g, " "), cls: "bg-muted text-foreground" } : null;
  const loginLogs = useMemo(
    () => logs.filter((l) => /login|signin|sign in|authenticate/i.test(l.action + " " + l.summary)).slice(0, 6),
    [logs],
  );
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const device = parseUA(ua);
  const tenure = me?.joiningDate
    ? formatDistanceToNow(parseISO(me.joiningDate), { addSuffix: false })
    : null;
  const authenticatedDisplayName = authUserDisplayName(session.user);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!me || !roleMeta) {
    return <p className="text-muted-foreground">Profile unavailable.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your personal details, security and activity."
        actions={
          <Button variant="outline" className="gap-2" onClick={() => setPwOpen(true)}>
            <KeyRound className="h-4 w-4" /> Change password
          </Button>
        }
      />

      {/* ───── Hero / cover ───── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
      >
        {/* Cover */}
        <div className="relative h-40 sm:h-48 bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400">
          <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)", backgroundSize: "32px 32px, 48px 48px" }} />
          <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute bottom-3 right-4 hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur sm:flex">
            <Sparkles className="h-3 w-3" />
            {tenure ? `${tenure} at Cybernaut` : "Welcome"}
          </div>
        </div>

        {/* Identity */}
        <div className="px-5 pb-6 pt-0 sm:px-8">
          <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end">
            <div className="relative shrink-0">
              <Avatar className="h-28 w-28 border-4 border-card shadow-xl sm:h-32 sm:w-32">
                <AvatarImage src={form.profileImage || me.profileImage} alt={authenticatedDisplayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-primary-foreground">
                  {initials(authenticatedDisplayName)}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && void handleAvatar(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card transition-transform hover:scale-110"
                aria-label="Upload avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="min-w-0 flex-1 pt-1 sm:pb-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="min-w-0 break-words text-2xl font-bold leading-tight sm:text-3xl">
                  {authenticatedDisplayName}
                </h2>
                {me.accountStatus === "active" && (
                  <BadgeCheck className="h-5 w-5 shrink-0 text-blue-500" />
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {me.designation ?? "Team member"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("border", roleMeta.cls)}>
                  <Shield className="mr-1 h-3 w-3" />
                  {roleMeta.label}
                </Badge>
                {depName && (
                  <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                    <Building2 className="mr-1 h-3 w-3" />
                    {depName}
                  </Badge>
                )}
                {me.employeeCode && (
                  <Badge variant="outline" className="font-mono">
                    <Hash className="mr-1 h-3 w-3" />
                    {me.employeeCode}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    me.accountStatus === "active"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : me.accountStatus === "suspended"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                  )}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {me.accountStatus}
                </Badge>
              </div>
            </div>

            <div className="col-span-2 mt-2 flex flex-wrap gap-2 sm:col-span-1 sm:mt-0 sm:justify-end">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Change photo
              </Button>
            </div>
          </div>

          {/* Quick contact */}
          <div className="mt-6 grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <QuickField icon={Mail} label="Email" value={me.email} />
            <QuickField icon={Phone} label="Phone" value={me.phone || "—"} />
            <QuickField
              icon={Calendar}
              label="Joined"
              value={me.joiningDate ? format(parseISO(me.joiningDate), "MMM d, yyyy") : "—"}
            />
            <QuickField
              icon={Cake}
              label="Birthday"
              value={me.dob ? format(parseISO(me.dob), "MMM d") : "—"}
            />
          </div>
        </div>
      </motion.section>

      {/* ───── Tabs ───── */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview" className="gap-1.5"><UserCircle2 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Activity</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Security</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Left column — About + Quick info */}
            <div className="space-y-5">
              <Panel title="About" icon={UserCircle2}>
                {me.bio ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">{me.bio}</p>
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No bio yet. Tell your teammates a bit about yourself.
                  </p>
                )}
              </Panel>

              <Panel title="Employment" icon={Briefcase}>
                <dl className="space-y-3 text-sm">
                  <InfoRow icon={Hash} label="Employee Code" value={me.employeeCode ?? "—"} mono />
                  <InfoRow icon={Building2} label="Department" value={depName ?? "Unassigned"} />
                  <InfoRow icon={Briefcase} label="Designation" value={me.designation ?? "—"} />
                  <InfoRow
                    icon={Calendar}
                    label="Join Date"
                    value={me.joiningDate ? format(parseISO(me.joiningDate), "MMM d, yyyy") : "—"}
                  />
                </dl>
              </Panel>

              <Panel title="Contact" icon={Mail}>
                <dl className="space-y-3 text-sm">
                  <InfoRow icon={Mail} label="Email" value={me.email} />
                  <InfoRow icon={Phone} label="Phone" value={me.phone || "—"} />
                  <InfoRow icon={MapPin} label="Address" value={me.address || "—"} />
                </dl>
              </Panel>
            </div>

            {/* Right column — Edit form */}
            <div className="lg:col-span-2">
              <Panel title="Edit profile" icon={Pencil} description="Identity fields are managed by your admin.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </Field>
                  <Field label="Last name">
                    <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <Input value={me.email} readOnly disabled />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </Field>
                  <Field label="Address" className="sm:col-span-2">
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Street, city, country"
                    />
                  </Field>
                  <Field label="Bio" className="sm:col-span-2">
                    <Textarea
                      rows={4}
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="A short bio about yourself"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{form.bio.length}/280 characters</p>
                  </Field>
                </div>
                <Separator className="my-5" />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Your changes will sync across the workspace.</p>
                  <Button onClick={save} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save changes
                  </Button>
                </div>
              </Panel>
            </div>
          </div>
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity" className="mt-5">
          <Panel title="Activity timeline" icon={Activity} description="Recent actions performed by you across the workspace.">
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : logs.length === 0 ? (
              <EmptyBlock icon={Activity} title="No activity yet" description="Your actions will appear here." />
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-6">
                {logs.map((l, i) => (
                  <motion.li
                    key={l.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative"
                  >
                    <span className="absolute -left-[27px] top-1.5 grid h-4 w-4 place-items-center rounded-full bg-primary/15 ring-4 ring-background">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    <div className="rounded-xl border border-border bg-background p-3 transition-shadow hover:shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{l.summary || l.action}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(l.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase">{l.action}</span>
                        {l.entity && <span>{l.entity}</span>}
                        {l.ip && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{l.ip}</span>}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ol>
            )}
          </Panel>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Password */}
            <Panel title="Password" icon={KeyRound} description="Use a strong unique password.">
              <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Password</p>
                    <p className="text-xs text-muted-foreground">
                      Last updated {format(parseISO(me.updatedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setPwOpen(true)}>Change</Button>
                </div>
              </div>
              {me.forcePasswordChange && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Admin requires you to set a personal password before continuing.</span>
                </div>
              )}
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Requirements</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> At least 8 characters</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Mix of letters and digits</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Never reuse old passwords</li>
                </ul>
              </div>
            </Panel>

            {/* Current Session + Device */}
            <Panel title="Current session" icon={Monitor} description="You're signed in on this device.">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    {device.isMobile ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{device.browser} on {device.os}</p>
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300">
                        Active now
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Signed in as {me.email}
                    </p>
                  </div>
                </div>
                <Separator className="my-3" />
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Device</dt>
                    <dd className="font-medium">{device.isMobile ? "Mobile" : "Desktop"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Browser</dt>
                    <dd className="font-medium">{device.browser}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Operating system</dt>
                    <dd className="font-medium">{device.os}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Language</dt>
                    <dd className="font-medium">{typeof navigator !== "undefined" ? navigator.language : "—"}</dd>
                  </div>
                </dl>
              </div>
            </Panel>

            {/* Recent logins — full width */}
            <div className="lg:col-span-2">
              <Panel title="Recent logins" icon={LogIn} description="Sign-in events from your audit history.">
                {logsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                  </div>
                ) : loginLogs.length === 0 ? (
                  <EmptyBlock icon={LogIn} title="No recent sign-ins" description="Sign-in events will appear here once recorded." />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">When</th>
                          <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">IP</th>
                          <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Device</th>
                          <th className="px-4 py-2 text-right font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginLogs.map((l) => {
                          const d = l.userAgent ? parseUA(l.userAgent) : null;
                          return (
                            <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{format(parseISO(l.createdAt), "MMM d, HH:mm")}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {formatDistanceToNow(parseISO(l.createdAt), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="hidden px-4 py-3 font-mono text-xs sm:table-cell">{l.ip || "—"}</td>
                              <td className="hidden px-4 py-3 text-xs md:table-cell">
                                {d ? `${d.browser} · ${d.os}` : "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Success
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ChangePasswordDialog
        open={pwOpen}
        onOpenChange={setPwOpen}
        forced={!!me?.forcePasswordChange}
        onChanged={load}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// UI primitives
// ────────────────────────────────────────────────────────────

function Panel({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
    >
      <header className="mb-4 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </motion.section>
  );
}

function QuickField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className={cn("truncate text-sm font-medium", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border p-8 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
  forced,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  forced: boolean;
  onChanged: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const strength = useMemo(() => {
    let s = 0;
    if (next.length >= 8) s++;
    if (/[A-Z]/.test(next)) s++;
    if (/\d/.test(next)) s++;
    if (/[^A-Za-z0-9]/.test(next)) s++;
    return s; // 0–4
  }, [next]);
  const strengthLabel = ["Too weak", "Weak", "Fair", "Strong", "Excellent"][strength];
  const strengthColor = ["bg-rose-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"][strength];

  async function submit() {
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      toast.error("Password must be 8+ chars with a letter and a digit");
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      toast.success("Password changed");
      setCurrent("");
      setNext("");
      setConfirm("");
      onOpenChange(false);
      onChanged();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Change failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !forced && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {forced ? "Set a new password" : "Change password"}
          </DialogTitle>
        </DialogHeader>
        {forced && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>For security, please set a personal password before continuing.</span>
          </div>
        )}
        <div className="space-y-3">
          <Field label="Current password">
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password">
            <div className="relative">
              <Input
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {next && (
              <div className="mt-2 space-y-1">
                <div className="flex h-1.5 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-full flex-1 rounded-full transition-colors",
                        i < strength ? strengthColor : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">Strength: <span className="font-medium text-foreground">{strengthLabel}</span></p>
              </div>
            )}
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {confirm && confirm !== next && (
              <p className="mt-1 text-[11px] text-rose-600">Passwords don't match</p>
            )}
          </Field>
          <p className="text-xs text-muted-foreground">
            Minimum 8 characters with at least one letter and one digit.
          </p>
        </div>
        <DialogFooter>
          {!forced && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          )}
          <Button onClick={submit} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Update password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
