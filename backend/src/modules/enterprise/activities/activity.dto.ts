import type { ActivityDoc } from "./activity.repository";

export interface ActivityActorDTO {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}

export interface ActivityDTO {
  id: string;
  actor: ActivityActorDTO | null;
  actorName?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function toActivityDTO(a: ActivityDoc): ActivityDTO {
  const actor = a.actor as unknown as
    | { _id?: { toString(): string }; name?: string; email?: string; role?: string; avatarUrl?: string }
    | null;
  return {
    id: a._id.toString(),
    actor:
      actor && actor._id
        ? {
            id: actor._id.toString(),
            name: actor.name ?? a.actorName ?? "",
            email: actor.email,
            role: actor.role ?? a.actorRole,
            avatarUrl: actor.avatarUrl,
          }
        : a.actorName
          ? { id: "", name: a.actorName, role: a.actorRole }
          : null,
    actorName: a.actorName,
    actorRole: a.actorRole,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId,
    summary: a.summary,
    metadata: a.metadata,
    createdAt: a.createdAt.toISOString(),
  };
}
