import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  FolderKanban,
  ListChecks,
  Megaphone,
  MessagesSquare,
  Calendar,
  CalendarClock,
  ClipboardCheck,
  Receipt,
  LifeBuoy,
  ChevronLeft,
  ScrollText,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSidebar } from "@/store/slices/uiSlice";
import { logout } from "@/store/slices/authSlice";
import { canAccess } from "@/lib/rbac";
import { ROLES } from "@/types/roles";
import type { Role } from "@/types/roles";
import { authApi } from "@/services/auth.service";
import { useNavigate } from "@tanstack/react-router";
import logo from "@/assets/cybernaut-logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Workspace" | "People" | "Operations" | "Account";
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Workspace" },
  { to: "/projects", label: "Projects", icon: FolderKanban, group: "Workspace" },
  { to: "/tasks", label: "Tasks", icon: ListChecks, group: "Workspace" },
  { to: "/announcements", label: "Announcements", icon: Megaphone, group: "Workspace" },
  { to: "/discussions", label: "Discussions", icon: MessagesSquare, group: "Workspace" },
  { to: "/events", label: "Events", icon: Calendar, group: "Workspace" },

  { to: "/departments", label: "Departments", icon: Building2, group: "People" },
  { to: "/users", label: "Users", icon: Users, group: "People" },
  { to: "/roles", label: "Roles", icon: ShieldCheck, group: "People" },

  { to: "/attendance", label: "Attendance", icon: CalendarClock, group: "Operations" },
  { to: "/leave-requests", label: "Leave Requests", icon: ClipboardCheck, group: "Operations" },
  { to: "/salary-slips", label: "Salary Slips", icon: Receipt, group: "Operations" },

  { to: "/support", label: "Support", icon: LifeBuoy, group: "Account" },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText, group: "Account" },
];

export function Sidebar() {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role as Role | undefined;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const groups: NavItem["group"][] = ["Workspace", "People", "Operations", "Account"];
  const initials =
    user?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "U";

  async function handleSignOut() {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    dispatch(logout());
    navigate({ to: "/login" });
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 268 }}
      transition={{ type: "spring", stiffness: 240, damping: 30 }}
      className="sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block"
    >
      <div className="flex h-full flex-col">
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5 overflow-hidden">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white shadow-soft ring-1 ring-sidebar-border">
              <img src={logo} alt="Cybernaut" className="h-7 w-7 object-contain" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-0"
                >
                  <p className="truncate text-sm font-semibold tracking-tight">Cybernaut</p>
                  <p className="truncate text-[11px] text-muted-foreground">Minutos ERP</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-95"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {groups.map((group) => {
            const items = NAV.filter((i) => i.group === group && canAccess(i.to, role));
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-6 last:mb-0">
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80"
                    >
                      {group}
                    </motion.p>
                  )}
                </AnimatePresence>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const active = pathname === item.to;
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                            active
                              ? "bg-primary/10 text-primary shadow-soft"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground hover:translate-x-0.5",
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="sidebar-active-indicator"
                              className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                              transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            />
                          )}
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                              active ? "text-primary" : "text-muted-foreground group-hover:text-foreground group-hover:scale-110",
                            )}
                          />
                          <AnimatePresence initial={false}>
                            {!collapsed && (
                              <motion.span
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -4 }}
                                transition={{ duration: 0.15 }}
                                className="truncate"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Sticky bottom: user card */}
        <div className="sticky bottom-0 border-t border-sidebar-border bg-sidebar p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-sidebar-accent/60",
              collapsed && "justify-center",
            )}
          >
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/20">
              {user?.profileImage && <AvatarImage src={user.profileImage} alt={user.name} />}
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-xs font-semibold">{user?.name ?? "Guest"}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {user ? ROLES[user.role].label : "Not signed in"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && user && (
              <button
                onClick={handleSignOut}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
