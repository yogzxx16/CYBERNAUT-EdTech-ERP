import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy, Plus, Send } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAppSelector } from "@/store/hooks";
import {
  ticketsApi,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/services/tickets.service";
import { usersApi, type AppUser } from "@/services/users.service";

export const Route = createFileRoute("/_app/support")({
  component: SupportPage,
});

function priorityTone(p: TicketPriority) {
  return p === "urgent" ? "destructive" : p === "high" ? "warning" : p === "low" ? "muted" : "info";
}
function statusTone(s: TicketStatus) {
  return s === "open" ? "warning" : s === "in_progress" ? "info" : s === "closed" ? "muted" : "success";
}

function SupportPage() {
  const me = useAppSelector((s) => s.auth.user);
  const canManage = me?.role === "super_admin" || me?.role === "admin";

  const [scope, setScope] = useState<"mine" | "assigned" | "all">("mine");
  const [items, setItems] = useState<Ticket[]>([]);
  const [active, setActive] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<AppUser[]>([]);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "other" as TicketCategory,
    priority: "medium" as TicketPriority,
  });

  async function load() {
    try {
      const res = await ticketsApi.list({ scope, limit: 100 });
      setItems(res.data);
      if (active) {
        const fresh = res.data.find((t) => t.id === active.id);
        if (fresh) setActive(await ticketsApi.get(fresh.id));
      }
    } catch {
      toast.error("Failed to load tickets");
    }
  }
  useEffect(() => {
    load();
    if (canManage) {
      usersApi.list({ role: "admin", limit: 50 }).then((r) => setAgents(r.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  async function openTicket(t: Ticket) {
    try {
      const full = await ticketsApi.get(t.id);
      setActive(full);
      setReply("");
    } catch {
      toast.error("Failed to open");
    }
  }
  async function create() {
    try {
      const t = await ticketsApi.create(form);
      toast.success(`Created ${t.ticketNumber}`);
      setOpen(false);
      setForm({ subject: "", description: "", category: "other", priority: "medium" });
      await load();
      setActive(t);
    } catch {
      toast.error("Create failed");
    }
  }
  async function send() {
    if (!active || !reply.trim()) return;
    try {
      const t = await ticketsApi.reply(active.id, reply.trim());
      setActive(t);
      setReply("");
      await load();
    } catch {
      toast.error("Send failed");
    }
  }
  async function close() {
    if (!active) return;
    try {
      const t = await ticketsApi.close(active.id);
      setActive(t);
      await load();
    } catch {
      toast.error("Close failed");
    }
  }
  async function reopen() {
    if (!active) return;
    try {
      const t = await ticketsApi.reopen(active.id);
      setActive(t);
      await load();
    } catch {
      toast.error("Reopen failed");
    }
  }
  async function assign(id: string) {
    if (!active) return;
    try {
      const t = await ticketsApi.assign(active.id, id);
      setActive(t);
      await load();
    } catch {
      toast.error("Assign failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Support"
        description="Raise tickets, track resolutions and collaborate with the support team."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New ticket</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Raise a ticket</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TicketCategory })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["technical", "hr", "payroll", "facilities", "access", "other"] as TicketCategory[]).map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["low", "medium", "high", "urgent"] as TicketPriority[]).map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={create}>Submit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {canManage && (
        <Tabs value={scope} onValueChange={(v) => setScope(v as "mine" | "assigned" | "all")} className="mb-4">
          <TabsList>
            <TabsTrigger value="mine">My tickets</TabsTrigger>
            <TabsTrigger value="assigned">Assigned to me</TabsTrigger>
            <TabsTrigger value="all">All tickets</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-2 shadow-soft">
          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={LifeBuoy} title="No tickets" />
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => openTicket(t)}
                    className={`w-full rounded-md p-3 text-left text-sm transition-colors hover:bg-muted ${
                      active?.id === t.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{t.subject}</p>
                      <StatusBadge tone={statusTone(t.status)}>{t.status.replace("_", " ")}</StatusBadge>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {t.ticketNumber} · {t.raisedBy?.name ?? "—"}
                    </p>
                    <div className="mt-1 flex gap-1">
                      <Badge variant="outline" className="text-[10px] capitalize">{t.category}</Badge>
                      <StatusBadge tone={priorityTone(t.priority)}>{t.priority}</StatusBadge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-soft">
          {!active ? (
            <div className="p-10">
              <EmptyState icon={LifeBuoy} title="Select a ticket" />
            </div>
          ) : (
            <div className="flex h-[640px] flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">{active.subject}</h3>
                  <p className="text-xs text-muted-foreground">
                    {active.ticketNumber} · {active.raisedBy?.name ?? "—"}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <StatusBadge tone={statusTone(active.status)}>{active.status.replace("_", " ")}</StatusBadge>
                    <StatusBadge tone={priorityTone(active.priority)}>{active.priority}</StatusBadge>
                    <Badge variant="outline" className="text-[10px] capitalize">{active.category}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManage && (
                    <Select onValueChange={(v) => assign(v)} value={active.assignedTo?.id ?? ""}>
                      <SelectTrigger className="w-44"><SelectValue placeholder="Assign…" /></SelectTrigger>
                      <SelectContent>
                        {agents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {active.status !== "closed" ? (
                    <Button variant="outline" size="sm" onClick={close}>Close</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={reopen}>Reopen</Button>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {active.conversation?.map((m) => {
                  const own = m.author?.id === me?.id;
                  return (
                    <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${own ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="text-[11px] opacity-80">{m.author?.name ?? "—"}</p>
                        <p className="whitespace-pre-line">{m.body}</p>
                        <p className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {active.status !== "closed" && (
                <div className="border-t border-border p-3">
                  <div className="flex gap-2">
                    <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
                    <Button onClick={send} className="gap-2"><Send className="h-4 w-4" /> Send</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
