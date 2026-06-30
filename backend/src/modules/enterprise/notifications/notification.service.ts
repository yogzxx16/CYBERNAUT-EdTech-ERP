import {
  notificationRepository,
  type NotificationType,
} from "./notification.repository";
import { toNotificationDTO } from "./notification.dto";

export interface NotifyPayload {
  recipients: string[];
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export const notificationService = {
  async notify(p: NotifyPayload) {
    if (!p.recipients || p.recipients.length === 0) return;
    const unique = Array.from(new Set(p.recipients.filter(Boolean)));
    try {
      await notificationRepository.insertMany(
        unique.map((r) => ({
          recipient: r as never,
          type: p.type,
          title: p.title,
          body: p.body,
          link: p.link,
          metadata: p.metadata,
        })),
      );
    } catch {
      /* never fail the source action */
    }
  },
  async list(userId: string, page = 1, limit = 20) {
    const { items, total, unread } = await notificationRepository.listForUser(
      userId,
      page,
      limit,
    );
    return {
      items: items.map(toNotificationDTO),
      total,
      unread,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },
  async markRead(userId: string, id: string) {
    const doc = await notificationRepository.markRead(userId, id);
    return doc ? toNotificationDTO(doc) : null;
  },
  async markAllRead(userId: string) {
    await notificationRepository.markAllRead(userId);
    return { ok: true };
  },
  async unreadCount(userId: string) {
    return notificationRepository.unreadCount(userId);
  },
};
