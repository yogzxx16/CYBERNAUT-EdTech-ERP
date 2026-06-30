import type { AuditDoc } from "./audit.repository";

export interface AuditDTO {
  id: string;
  actor: { id: string; name: string; email: string; role?: string } | null;
  actorName?: string;
  actorRole?: string;
  action: string;
  entity?: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export function toAuditDTO(a: AuditDoc): AuditDTO {
  const actor = a.actor as unknown as
    | { _id?: { toString(): string }; name?: string; email?: string; role?: string }
    | null;
  return {
    id: a._id.toString(),
    actor:
      actor && actor._id
        ? {
            id: actor._id.toString(),
            name: actor.name ?? "",
            email: actor.email ?? "",
            role: actor.role,
          }
        : null,
    actorName: a.actorName,
    actorRole: a.actorRole,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId,
    summary: a.summary,
    metadata: a.metadata,
    ip: a.ip,
    userAgent: a.userAgent,
    createdAt: a.createdAt.toISOString(),
  };
}
