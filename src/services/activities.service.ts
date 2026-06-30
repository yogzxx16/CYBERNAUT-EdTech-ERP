import { api, type ApiEnvelope } from "./api";

export interface ActivityActor {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}

export interface Activity {
  id: string;
  actor: ActivityActor | null;
  actorName?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityListResponse extends ApiEnvelope<Activity[]> {
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ActivityListParams {
  page?: number;
  limit?: number;
  entity?: string;
  entityId?: string;
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
}

export const activitiesApi = {
  async list(params: ActivityListParams = {}) {
    const res = await api.get<ActivityListResponse>("/activities", { params });
    return {
      items: res.data.data,
      page: res.data.meta?.page ?? 1,
      limit: res.data.meta?.limit ?? params.limit ?? 20,
      total: res.data.meta?.total ?? res.data.data.length,
      totalPages: res.data.meta?.totalPages ?? 1,
    };
  },
  async forEntity(entity: string, entityId: string, params: { page?: number; limit?: number } = {}) {
    const res = await api.get<ActivityListResponse>(
      `/activities/${encodeURIComponent(entity)}/${encodeURIComponent(entityId)}`,
      { params },
    );
    return {
      items: res.data.data,
      page: res.data.meta?.page ?? 1,
      limit: res.data.meta?.limit ?? params.limit ?? 20,
      total: res.data.meta?.total ?? res.data.data.length,
      totalPages: res.data.meta?.totalPages ?? 1,
    };
  },
};
