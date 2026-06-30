import { auditRepository, type AuditAction, type AuditListQuery } from "./audit.repository";
import { toAuditDTO } from "./audit.dto";

export interface AuditEvent {
  actor?: { id: string; name?: string; role?: string } | null;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export const auditService = {
  async record(event: AuditEvent) {
    try {
      await auditRepository.create({
        actor: (event.actor?.id ?? null) as never,
        actorName: event.actor?.name,
        actorRole: event.actor?.role,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        summary: event.summary,
        metadata: event.metadata,
        ip: event.ip,
        userAgent: event.userAgent,
      });
    } catch {
      // never block the originating request because of audit failure
    }
  },
  async list(q: AuditListQuery) {
    const { items, total } = await auditRepository.list(q);
    return {
      items: items.map(toAuditDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },
};
