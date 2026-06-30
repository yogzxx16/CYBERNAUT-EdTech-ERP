import {
  activityRepository,
  type ActivityAction,
  type ActivityEntity,
  type ActivityListQuery,
} from "./activity.repository";
import { toActivityDTO } from "./activity.dto";

export interface ActivityEvent {
  actor?: { id: string; name?: string; role?: string } | null;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export const activityService = {
  async record(event: ActivityEvent) {
    try {
      await activityRepository.create({
        actor: (event.actor?.id ?? null) as never,
        actorName: event.actor?.name,
        actorRole: event.actor?.role,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        summary: event.summary,
        metadata: event.metadata,
      });
    } catch {
      /* never fail originating action */
    }
  },
  async list(q: ActivityListQuery) {
    const { items, total } = await activityRepository.list(q);
    return {
      items: items.map(toActivityDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },
};
