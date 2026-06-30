import { api, unwrap, type ApiEnvelope } from "./api";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationListResponse {
  success: boolean;
  message: string;
  data: Notification[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unread: number;
}

export const notificationsApi = {
  async list(params: { page?: number; limit?: number } = {}) {
    const res = await api.get<NotificationListResponse>("/notifications", { params });
    return res.data;
  },
  async unreadCount() {
    const res = await api.get<ApiEnvelope<{ unread: number }>>("/notifications/unread-count");
    return unwrap(res.data).unread;
  },
  async markRead(id: string) {
    const res = await api.post<ApiEnvelope<Notification>>(`/notifications/${id}/read`, {});
    return unwrap(res.data);
  },
  async markAllRead() {
    const res = await api.post<ApiEnvelope<{ ok: boolean }>>("/notifications/read-all", {});
    return unwrap(res.data);
  },
};
