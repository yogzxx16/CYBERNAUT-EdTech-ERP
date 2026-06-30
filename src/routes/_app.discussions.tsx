import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessagesSquare, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { discussionsApi, type Discussion } from "@/services/discussions.service";
import { usersApi, type AppUser } from "@/services/users.service";
import { useAppSelector } from "@/store/hooks";

export const Route = createFileRoute("/_app/discussions")({
  component: DiscussionsPage,
});

function DiscussionsPage() {
  const me = useAppSelector((s) => s.auth.user);
  const [items, setItems] = useState<Discussion[]>([]);
  const [active, setActive] = useState<Discussion | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", participants: [] as string[] });
  const [reply, setReply] = useState("");

  async function load() {
    try {
      const res = await discussionsApi.list({ limit: 100 });
      setItems(res.data);
      if (res.data.length && !active) await openOne(res.data[0]);
    } catch {
      toast.error("Failed to load discussions");
    }
  }
  async function openOne(d: Discussion) {
    try {
      const full = await discussionsApi.get(d.id);
      setActive(full);
    } catch {
      toast.error("Failed to open discussion");
    }
  }

  useEffect(() => {
    load();
    usersApi.list({ limit: 100 }).then((r) => setUsers(r.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    try {
      const d = await discussionsApi.create(form);
      toast.success("Discussion created");
      setOpen(false);
      setForm({ title: "", description: "", participants: [] });
      await load();
      setActive(d);
    } catch {
      toast.error("Create failed");
    }
  }

  async function postMessage() {
    if (!active || !reply.trim()) return;
    try {
      const d = await discussionsApi.postMessage(active.id, reply.trim());
      setActive(d);
      setReply("");
    } catch {
      toast.error("Failed to send");
    }
  }

  return (
    <div>
      <PageHeader
        title="Discussions"
        description="Threaded conversations across teams and projects."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New thread</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Start a discussion</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label>Participants</Label>
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                    {users.filter((u) => u.id !== me?.id).map((u) => (
                      <label key={u.id} className="flex items-center gap-2 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={form.participants.includes(u.id)}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              participants: e.target.checked
                                ? [...f.participants, u.id]
                                : f.participants.filter((x) => x !== u.id),
                            }))
                          }
                        />
                        {u.name} <span className="text-xs text-muted-foreground">{u.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={create}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-2 shadow-soft">
          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={MessagesSquare} title="No discussions" description="Start a thread to collaborate." />
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => openOne(d)}
                    className={`w-full rounded-md p-3 text-left text-sm transition-colors hover:bg-muted ${
                      active?.id === d.id ? "bg-muted" : ""
                    }`}
                  >
                    <p className="truncate font-medium">{d.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.messagesCount} messages · {d.participants.length} participants
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-soft">
          {!active ? (
            <div className="p-10">
              <EmptyState icon={MessagesSquare} title="Select a discussion" />
            </div>
          ) : (
            <div className="flex h-[600px] flex-col">
              <div className="border-b border-border p-4">
                <h3 className="text-base font-semibold">{active.title}</h3>
                <p className="text-xs text-muted-foreground">{active.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {active.participants.map((p) => (
                    <Badge key={p.id} variant="secondary" className="text-[10px]">{p.name}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {active.messages?.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">No messages yet.</p>
                )}
                {active.messages?.map((m) => {
                  const own = m.author?.id === me?.id;
                  return (
                    <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${own ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="text-[11px] opacity-80">{m.author?.name ?? "Unknown"}</p>
                        <p className="whitespace-pre-line">{m.body}</p>
                        <p className="mt-1 text-[10px] opacity-70">
                          {new Date(m.createdAt).toLocaleString()}
                          {m.editedAt ? " · edited" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border p-3">
                <div className="flex gap-2">
                  <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
                  <Button onClick={postMessage} className="gap-2"><Send className="h-4 w-4" /> Send</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
