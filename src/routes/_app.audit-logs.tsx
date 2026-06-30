import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { auditApi, type AuditLog } from "@/services/audit.service";
import { store } from "@/store";

export const Route = createFileRoute("/_app/audit-logs")({
  beforeLoad: () => {
    const { auth } = store.getState();
    if (auth.user?.role !== "super_admin") throw redirect({ to: "/dashboard" });
  },
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await auditApi.list({ search, action, limit: 100 });
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, action]);

  const columns: Column<AuditLog>[] = [
    {
      key: "time",
      header: "Time",
      render: (a) => <span className="whitespace-nowrap text-xs">{new Date(a.createdAt).toLocaleString()}</span>,
    },
    { key: "action", header: "Action", render: (a) => <Badge variant="outline" className="text-[10px]">{a.action}</Badge> },
    { key: "actor", header: "Actor", render: (a) => a.actor?.name ?? a.actorName ?? "System" },
    { key: "entity", header: "Entity", render: (a) => a.entity ?? "—" },
    { key: "summary", header: "Summary" },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" description="Searchable log of every important action across the workspace." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search summary, entity…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />
        <Input placeholder="Action (e.g. login)" value={action} onChange={(e) => setAction(e.target.value)} className="w-48" />
      </div>
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          rowKey={(a) => a.id}
          emptyState={<EmptyState icon={ScrollText} title="No audit events" />}
        />
      )}
    </div>
  );
}
