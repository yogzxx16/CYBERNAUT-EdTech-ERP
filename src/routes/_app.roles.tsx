import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { rolesApi, type AppRole, type PermissionCatalog } from "@/services/roles.service";

export const Route = createFileRoute("/_app/roles")({
  component: RolesPage,
});

function RolesPage() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const active = useMemo(() => roles.find((r) => r.id === activeId) ?? null, [roles, activeId]);

  async function load() {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([rolesApi.list(), rolesApi.permissions()]);
      setRoles(r);
      setCatalog(c);
      if (r.length && !activeId) {
        setActiveId(r[0].id);
        setDraft(new Set(r[0].permissions));
      }
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectRole(id: string) {
    setActiveId(id);
    const r = roles.find((x) => x.id === id);
    setDraft(new Set(r?.permissions ?? []));
  }

  function toggle(p: string) {
    if (!active || active.slug === "super_admin") return;
    const next = new Set(draft);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setDraft(next);
  }

  function toggleGroup(perms: string[], on: boolean) {
    if (!active || active.slug === "super_admin") return;
    const next = new Set(draft);
    perms.forEach((p) => (on ? next.add(p) : next.delete(p)));
    setDraft(next);
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    try {
      const updated = await rolesApi.update(active.id, { permissions: Array.from(draft) });
      toast.success("Role updated");
      setRoles((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const dirty = useMemo(() => {
    if (!active) return false;
    const a = new Set(active.permissions);
    if (a.size !== draft.size) return true;
    for (const p of draft) if (!a.has(p)) return true;
    return false;
  }, [active, draft]);

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Define permissions and access scopes for your organisation."
        actions={
          <Button onClick={() => void save()} disabled={!dirty || saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
          </Button>
        }
      />

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
          Loading roles…
        </div>
      ) : (
        <Tabs value={activeId ?? undefined} onValueChange={selectRole}>
          <TabsList className="mb-6">
            {roles.map((r) => (
              <TabsTrigger key={r.id} value={r.id}>
                {r.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {roles.map((r) => (
            <TabsContent key={r.id} value={r.id} className="mt-0">
              <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <h3 className="text-base font-semibold">{r.name}</h3>
                      <StatusBadge tone={r.status === "active" ? "success" : "muted"}>
                        {r.status}
                      </StatusBadge>
                      {r.system && <StatusBadge tone="info">System</StatusBadge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.description ?? "No description"}
                    </p>
                  </div>
                  <code className="rounded bg-muted px-2 py-1 text-xs">{r.slug}</code>
                </div>
              </div>

              {r.slug === "super_admin" && (
                <div className="mb-4 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Super Admin has unrestricted access. Permissions cannot be modified.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(catalog).map(([group, perms]) => {
                  const allOn = perms.every((p) => draft.has(p));
                  const someOn = !allOn && perms.some((p) => draft.has(p));
                  return (
                    <div
                      key={group}
                      className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold">{group}</h4>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Checkbox
                            checked={allOn ? true : someOn ? "indeterminate" : false}
                            onCheckedChange={(c) => toggleGroup(perms, c === true)}
                            disabled={r.slug === "super_admin"}
                          />
                          Select all
                        </label>
                      </div>
                      <ul className="space-y-2">
                        {perms.map((p) => (
                          <li key={p} className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={draft.has(p)}
                                onCheckedChange={() => toggle(p)}
                                disabled={r.slug === "super_admin"}
                              />
                              <span className="font-mono text-xs text-muted-foreground">{p}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
