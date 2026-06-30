import type { NotificationDoc } from "./notification.repository";

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export function toNotificationDTO(n: NotificationDoc): NotificationDTO {
  return {
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    readAt: n.readAt ? n.readAt.toISOString() : undefined,
    createdAt: n.createdAt.toISOString(),
  };
}
