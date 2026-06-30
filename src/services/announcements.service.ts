import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";

export type AnnouncementPriority = "low" | "medium" | "high" | "critical";
export type AnnouncementStatus = "draft" | "published" | "archived";
export type AnnouncementAudience = "all" | "admins" | "employees" | "interns" | "department";

export interface AnnouncementPerson {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  department: { id: string; name: string; code: string } | null;
  createdBy: AnnouncementPerson | null;
  status: AnnouncementStatus;
  publishedAt?: string;
  expiryDate?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AnnouncementStatus | "all";
  priority?: AnnouncementPriority | "all";
  audience?: AnnouncementAudience | "all";
}

export interface CreateAnnouncementInput {
  title: string;
  description: string;
  priority?: AnnouncementPriority;
  audience?: AnnouncementAudience;
  department?: string;
  expiryDate?: string;
  attachments?: string[];
}

export const announcementsApi = {
  async list(params: AnnouncementListParams = {}) {
    const res = await api.get<PaginatedResponse<Announcement>>("/announcements", { params });
    return res.data;
  },
  async create(input: CreateAnnouncementInput) {
    const res = await api.post<ApiEnvelope<Announcement>>("/announcements", input);
    return unwrap(res.data);
  },
  async update(id: string, input: Partial<CreateAnnouncementInput>) {
    const res = await api.patch<ApiEnvelope<Announcement>>(`/announcements/${id}`, input);
    return unwrap(res.data);
  },
  async publish(id: string) {
    const res = await api.post<ApiEnvelope<Announcement>>(`/announcements/${id}/publish`, {});
    return unwrap(res.data);
  },
  async archive(id: string) {
    const res = await api.post<ApiEnvelope<Announcement>>(`/announcements/${id}/archive`, {});
    return unwrap(res.data);
  },
};
