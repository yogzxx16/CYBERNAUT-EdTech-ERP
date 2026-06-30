import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  Settings,
  ChevronRight,
  Check,
  FolderKanban,
  ListChecks,
  CalendarDays,
  Users as UsersIcon,
  Building2,
  Loader2,
  ShieldCheck,
  PlaneTakeoff,
  Receipt,
  Megaphone,
  MessagesSquare,
  Moon,
  Sun,
  Command,
  LifeBuoy,
  SearchX,
  KeyRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { toggleTheme } from "@/store/slices/uiSlice";
import { ROLES } from "@/types/roles";
import { authApi } from "@/services/auth.service";
import { notificationsApi, type Notification } from "@/services/notifications.service";
import { NotificationsMenu } from "@/components/notifications/NotificationsMenu";

import { projectsApi } from "@/services/projects.service";
import { tasksApi } from "@/services/tasks.service";
import { eventsApi } from "@/services/events.service";
import { usersApi } from "@/services/users.service";
import { departmentsApi } from "@/services/departments.service";
import { rolesApi } from "@/services/roles.service";
import { leavesApi } from "@/services/leaves.service";
import { salaryApi } from "@/services/salary.service";
import { announcementsApi } from "@/services/announcements.service";
import { discussionsApi } from "@/services/discussions.service";
import { ticketsApi } from "@/services/tickets.service";
import { cn } from "@/lib/utils";

function useBreadcrumbs() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((seg, i) => ({
    label: seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    to: "/" + parts.slice(0, i + 1).join("/"),
  }));
}

type SearchGroup =
  | "Projects"
  | "Tasks"
  | "Users"
  | "Departments"
  | "Roles"
  | "Events"
  | "Leave Requests"
  | "Salary Slips"
  | "Announcements"
  | "Discussions"
  | "Tickets";

type SearchHit = {
  id: string;
  label: string;
  hint?: string;
  to: string;
  group: SearchGroup;
  icon: typeof FolderKanban;
};

const MODULE_GROUPS: { group: SearchGroup; icon: typeof FolderKanban }[] = [
  { group: "Projects", icon: FolderKanban },
  { group: "Tasks", icon: ListChecks },
  { group: "Users", icon: UsersIcon },
  { group: "Departments", icon: Building2 },
  { group: "Roles", icon: KeyRound },
  { group: "Events", icon: CalendarDays },
  { group: "Leave Requests", icon: PlaneTakeoff },
  { group: "Salary Slips", icon: Receipt },
  { group: "Announcements", icon: Megaphone },
  { group: "Discussions", icon: MessagesSquare },
  { group: "Tickets", icon: LifeBuoy },
];

function roleBadgeClasses(role: string | undefined) {
  switch (role) {
    case "super_admin":
      return "bg-gradient-to-r from-primary to-[color:var(--brand-accent)] text-primary-foreground border-transparent";
    case "admin":
      return "bg-primary/10 text-primary border-primary/20";
    case "manager":
      return "bg-warning/15 text-warning border-warning/25";
    case "hr":
      return "bg-info/15 text-info border-info/25";
    case "intern":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-secondary text-secondary-foreground border-border";
  }
}

export function Navbar() {
  const user = useAppSelector((s) => s.auth.user);
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const crumbs = useBreadcrumbs();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  // Global search
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const displayName =
    user?.name?.trim() || user?.email?.split("@")[0] || "User";
  const initials =
    displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U";

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      window.localStorage.setItem("cyb-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Cmd/Ctrl+K to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMobileSearchOpen(true);
        setShowResults(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function loadNotifications() {
    try {
      const res = await notificationsApi.list({ limit: 10 });
      setNotifications(res.data);
      setUnread(res.unread);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    setNotifications([]);
    setUnread(0);
    setQuery("");
    setHits([]);
    if (!user) return;
    loadNotifications();
    const t = setInterval(loadNotifications, 30_000);
    return () => clearInterval(t);
  }, [user?.id]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const [
          projects, tasks, events, usersR, departments, roles, leaves, slips, announcements, discussions, tickets,
        ] = await Promise.allSettled([
          projectsApi.list({ search: q, limit: 5 }),
          tasksApi.list({ search: q, limit: 5 }),
          eventsApi.list({ search: q, limit: 5 }),
          usersApi.list({ search: q, limit: 5 }),
          departmentsApi.list({ search: q, limit: 5 }),
          rolesApi.list(),
          leavesApi.list({ search: q, limit: 5 }),
          salaryApi.list({ limit: 50 }),
          announcementsApi.list({ search: q, limit: 5 }),
          discussionsApi.list({ search: q, limit: 5 }),
          ticketsApi.list({ search: q, limit: 5 }),
        ]);
        const next: SearchHit[] = [];
        const needle = q.toLowerCase();
        const matches = (...vals: Array<string | undefined | null>) =>
          vals.some((v) => (v ?? "").toLowerCase().includes(needle));

        if (projects.status === "fulfilled") for (const p of projects.value.data)
          next.push({ id: `p-${p.id}`, label: p.title, hint: p.status, to: "/projects", group: "Projects", icon: FolderKanban });
        if (tasks.status === "fulfilled") for (const t of tasks.value.data)
          next.push({ id: `t-${t.id}`, label: t.title, hint: t.status, to: "/tasks", group: "Tasks", icon: ListChecks });
        if (usersR.status === "fulfilled") for (const u of usersR.value.data)
          next.push({ id: `u-${u.id}`, label: u.name, hint: u.employeeCode ? `${u.employeeCode} · ${u.email}` : u.email, to: "/users", group: "Users", icon: UsersIcon });
        if (departments.status === "fulfilled") for (const d of departments.value.data)
          next.push({ id: `d-${d.id}`, label: d.name, hint: d.code, to: "/departments", group: "Departments", icon: Building2 });
        if (roles.status === "fulfilled") for (const r of roles.value)
          if (matches(r.name, r.slug, r.description))
            next.push({ id: `r-${r.id}`, label: r.name, hint: r.slug, to: "/roles", group: "Roles", icon: ShieldCheck });
        if (events.status === "fulfilled") for (const e of events.value.data)
          next.push({ id: `e-${e.id}`, label: e.title, hint: "Event", to: "/events", group: "Events", icon: CalendarDays });
        if (leaves.status === "fulfilled") for (const l of leaves.value.data)
          next.push({ id: `l-${l.id}`, label: `${l.employee?.name ?? "Leave"} · ${l.leaveType}`, hint: l.status, to: "/leave-requests", group: "Leave Requests", icon: PlaneTakeoff });
        if (slips.status === "fulfilled") for (const s of slips.value.data)
          if (matches(s.slipNumber, s.employee?.name, s.employee?.email, s.employee?.employeeCode))
            next.push({ id: `s-${s.id}`, label: s.slipNumber, hint: s.employee?.name ?? `${s.month}/${s.year}`, to: "/salary-slips", group: "Salary Slips", icon: Receipt });
        if (announcements.status === "fulfilled") for (const a of announcements.value.data)
          next.push({ id: `a-${a.id}`, label: a.title, hint: a.status, to: "/announcements", group: "Announcements", icon: Megaphone });
        if (discussions.status === "fulfilled") for (const dz of discussions.value.data)
          next.push({ id: `dz-${dz.id}`, label: dz.title, hint: "Thread", to: "/discussions", group: "Discussions", icon: MessagesSquare });
        if (tickets.status === "fulfilled") for (const tk of tickets.value.data)
          next.push({ id: `tk-${tk.id}`, label: tk.subject, hint: `${tk.ticketNumber} · ${tk.status}`, to: "/tickets", group: "Tickets", icon: LifeBuoy });
        setHits(next);
      } catch (e) {
        console.warn("[search] failed", e);
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const groupedHits = useMemo(() => {
    const groups = new Map<SearchGroup, SearchHit[]>();
    for (const h of hits) {
      const arr = groups.get(h.group) ?? [];
      arr.push(h);
      groups.set(h.group, arr);
    }
    return Array.from(groups.entries());
  }, [hits]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function markAll() {
    try {
      await notificationsApi.markAllRead();
      await loadNotifications();
    } catch { /* ignore */ }
  }
  async function open(n: Notification) {
    try {
      if (!n.read) await notificationsApi.markRead(n.id);
      if (n.link) navigate({ to: n.link as never });
      await loadNotifications();
    } catch { /* ignore */ }
  }

  function pickHit(hit: SearchHit) {
    setShowResults(false);
    setMobileSearchOpen(false);
    setQuery("");
    navigate({ to: hit.to as never });
  }

  return (
    <div className="sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4">
      <header className="flex h-14 items-center gap-2 rounded-3xl border border-border/70 bg-card/85 px-3 shadow-soft backdrop-blur-xl sm:h-16 sm:gap-3 sm:px-4">
        {/* Breadcrumbs */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground md:flex">
          <Link to="/dashboard" className="rounded-lg px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground">
            Home
          </Link>
          {crumbs.map((c, i) => (
            <span key={c.to} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
              {i === crumbs.length - 1 ? (
                <span className="truncate font-semibold text-foreground">{c.label}</span>
              ) : (
                <Link to={c.to} className="truncate rounded-lg px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground">
                  {c.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <div className="md:hidden flex-1" />

        {/* Search */}
        <div ref={searchRef} className={cn("relative", mobileSearchOpen ? "flex-1" : "hidden md:block md:w-80")}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search workspace…"
              className="h-10 w-full rounded-2xl border border-border/80 bg-background/60 pl-10 pr-14 text-sm placeholder:text-muted-foreground/70 outline-none transition-all focus:border-primary/40 focus:bg-background focus:shadow-soft focus:ring-2 focus:ring-primary/15"
              value={query}
              onFocus={() => setShowResults(true)}
              onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </div>
          {showResults && (
            <div className="absolute left-0 right-0 top-12 z-40 max-h-[28rem] overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-elevated">
              {query.trim().length < 2 ? (
                <div className="px-3 py-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Search across your workspace
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Type at least 2 characters to search projects, tasks, people, leave, salary, announcements, discussions, tickets, events, departments and roles.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {MODULE_GROUPS.map(({ group, icon: Icon }) => (
                      <span
                        key={group}
                        className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        <Icon className="h-3 w-3" />
                        {group}
                      </span>
                    ))}
                  </div>
                </div>
              ) : searching ? (
                <div role="status" aria-label="Searching workspace" className="space-y-2 p-1">
                  {MODULE_GROUPS.slice(0, 4).map(({ group, icon: Icon }) => (
                    <div key={group} className="mb-1">
                      <div className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                        <Icon className="h-3 w-3 opacity-70" />
                        {group}
                      </div>
                      {[0, 1].map((i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2">
                          <div className="h-4 w-4 shrink-0 animate-pulse rounded-md bg-muted" />
                          <div className="h-3 flex-1 animate-pulse rounded bg-muted" style={{ maxWidth: `${70 - i * 15}%` }} />
                          <div className="h-3 w-10 animate-pulse rounded bg-muted/70" />
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="flex items-center justify-center gap-2 px-3 py-2 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching workspace…
                  </div>
                </div>
              ) : hits.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <SearchX className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No results found</p>
                  <p className="max-w-[16rem] text-xs text-muted-foreground">
                    We couldn't find anything matching <span className="font-medium text-foreground">"{query.trim()}"</span>. Try a different keyword or check spelling.
                  </p>
                </div>
              ) : (
                groupedHits.map(([group, items]) => {
                  const meta = MODULE_GROUPS.find((m) => m.group === group);
                  const GroupIcon = meta?.icon;
                  return (
                    <div key={group} className="mb-1 last:mb-0">
                      <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {GroupIcon && <GroupIcon className="h-3 w-3 opacity-70" />}
                          {group}
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground/70">
                          {items.length}
                        </span>
                      </div>
                      {items.map((h) => {
                        const Icon = h.icon;
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => pickHit(h)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate font-medium">{h.label}</span>
                            {h.hint && (
                              <span className="ml-2 shrink-0 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                                {h.hint}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Mobile search trigger */}
        {!mobileSearchOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-2xl md:hidden"
            onClick={() => { setMobileSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-2xl transition-transform hover:scale-105 active:scale-95"
          onClick={() => dispatch(toggleTheme())}
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <NotificationsMenu unread={unread} onChanged={loadNotifications} />


        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-2xl p-1 pr-2 transition-all hover:bg-muted sm:pr-3">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                {user?.profileImage && <AvatarImage src={user.profileImage} alt={user.name} />}
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-left lg:block">
                <p className="truncate text-xs font-semibold leading-tight">{displayName}</p>
                {user && (
                  <span className={cn(
                    "mt-0.5 inline-flex items-center rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
                    roleBadgeClasses(user.role),
                  )}>
                    {ROLES[user.role].label}
                  </span>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5 shadow-elevated">
            {user && (
              <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  {user.profileImage && <AvatarImage src={user.profileImage} alt={user.name} />}
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                </div>
              </div>
            )}
            {user && (
              <div className="px-2 pb-2">
                <Badge className={cn("rounded-full border text-[10px]", roleBadgeClasses(user.role))}>
                  {ROLES[user.role].label}
                </Badge>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-xl" onClick={() => navigate({ to: "/profile" })}>
              <UserIcon className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl" onClick={() => navigate({ to: "/support" })}>
              <Settings className="mr-2 h-4 w-4" /> Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={async () => {
                try { await authApi.logout(); } catch { /* ignore */ }
                dispatch(logout());
                setNotifications([]);
                setUnread(0);
                setQuery("");
                setHits([]);
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </div>
  );
}
